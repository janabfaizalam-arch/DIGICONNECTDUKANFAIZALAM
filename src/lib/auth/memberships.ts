/**
 * Portal membership resolution (OPTION 2 — multi-role identity with portal context).
 *
 * Policy:
 * - One Auth user may hold admin membership AND Digi Partner membership.
 * - Admin membership never grants /ap access by itself.
 * - Digi Partner access requires agency_partners.user_id match + active + KYC approved.
 * - Login portal / dcd_portal cookie selects the active context for redirects.
 * - profiles.role is a hint, not the sole gate for Digi Partner access.
 */

import type { User } from "@supabase/supabase-js";

import { isAllowlistedAdminEmail, isDemotedAdminEmail, isPrimaryAdminEmail } from "@/lib/auth/primary-admin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const PORTAL_CONTEXT_COOKIE = "dcd_portal";
export type PortalContext = "admin" | "ap" | "customer";

export type PartnerMembershipResult =
  | {
      ok: true;
      reason: "active_approved_ap";
      partnerId: string;
      status: string;
      kycStatus: string;
    }
  | {
      ok: false;
      reason:
        | "not_linked"
        | "ap_not_active"
        | "kyc_not_approved"
        | "missing_server_config"
        | "missing_user";
      partnerId?: string;
      status?: string;
      kycStatus?: string;
    };

export type AdminMembershipResult = {
  ok: boolean;
  reason: "allowlisted_email" | "primary_admin" | "profile_admin" | "metadata_admin" | "none" | "demoted";
};

export function normalizePortalContext(value: unknown): PortalContext | null {
  const v = String(value ?? "").trim().toLowerCase();
  if (v === "admin" || v === "ap" || v === "customer") return v;
  return null;
}

/** Safe public messages — never leak internal IDs. */
export function partnerAccessPublicMessage(reason: PartnerMembershipResult["reason"] | "wrong_role" | "admin_portal_only" | "inactive_profile" | "missing_profile"): string {
  switch (reason) {
    case "ap_not_active":
      return "Your Digi Partner account is inactive.";
    case "kyc_not_approved":
      return "Your KYC approval is pending.";
    case "not_linked":
      return "Your login identity is not linked to this Digi Partner account.";
    case "admin_portal_only":
    case "wrong_role":
      return "This account is currently configured for the Admin portal.";
    case "missing_user":
      return "Invalid credentials.";
    case "missing_server_config":
      return "Login is not available right now.";
    case "inactive_profile":
      return "Your Digi Partner account is inactive.";
    case "missing_profile":
      return "Your login identity is not linked to this Digi Partner account.";
    default:
      return "Contact support to repair the account linkage.";
  }
}

export async function getPartnerMembership(userId: string | null | undefined): Promise<PartnerMembershipResult> {
  if (!userId) {
    return { ok: false, reason: "missing_user" };
  }

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return { ok: false, reason: "missing_server_config" };
  }

  const { data: apRecord, error } = await supabaseAdmin
    .from("agency_partners")
    .select("id, status, kyc_status")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[memberships] agency_partners lookup failed", { userId, error: error.message });
    return { ok: false, reason: "missing_server_config" };
  }

  if (!apRecord) {
    return { ok: false, reason: "not_linked" };
  }

  const status = String(apRecord.status ?? "");
  const kycStatus = String(apRecord.kyc_status ?? "");

  if (status !== "active") {
    console.warn("[memberships] partner inactive", { userId, partnerId: apRecord.id, status });
    return { ok: false, reason: "ap_not_active", partnerId: apRecord.id, status, kycStatus };
  }

  if (kycStatus !== "approved") {
    console.warn("[memberships] partner KYC not approved", { userId, partnerId: apRecord.id, kycStatus });
    return { ok: false, reason: "kyc_not_approved", partnerId: apRecord.id, status, kycStatus };
  }

  return {
    ok: true,
    reason: "active_approved_ap",
    partnerId: apRecord.id,
    status,
    kycStatus,
  };
}

export function resolveAdminMembershipFromHints(input: {
  email?: string | null;
  profileRole?: string | null;
  metadataRole?: string | null;
  appMetadataRole?: string | null;
}): AdminMembershipResult {
  const email = String(input.email ?? "").toLowerCase();
  if (email && isDemotedAdminEmail(email)) {
    return { ok: false, reason: "demoted" };
  }

  if (email && isPrimaryAdminEmail(email)) {
    return { ok: true, reason: "primary_admin" };
  }

  if (email && isAllowlistedAdminEmail(email)) {
    return { ok: true, reason: "allowlisted_email" };
  }

  const roles = [input.profileRole, input.metadataRole, input.appMetadataRole]
    .map((r) => String(r ?? "").toLowerCase())
    .filter(Boolean);

  if (roles.some((r) => r === "admin" || r === "super_admin")) {
    return { ok: true, reason: roles.includes(String(input.profileRole ?? "").toLowerCase()) ? "profile_admin" : "metadata_admin" };
  }

  return { ok: false, reason: "none" };
}

export async function getAdminMembership(user: User | null, profileRole?: string | null): Promise<AdminMembershipResult> {
  if (!user) return { ok: false, reason: "none" };

  return resolveAdminMembershipFromHints({
    email: user.email,
    profileRole,
    metadataRole: user.user_metadata?.role as string | undefined,
    appMetadataRole: (user.app_metadata as Record<string, unknown> | undefined)?.role as string | undefined,
  });
}

export type IdentityLinkageHealth = {
  partnerId: string;
  authUserId: string | null;
  profileId: string | null;
  profileRole: string | null;
  authEmail: string | null;
  profileEmail: string | null;
  authMobile: string | null;
  profileMobile: string | null;
  partnerStatus: string;
  partnerKycStatus: string;
  lastApLogin: string | null;
  warnings: string[];
  healthy: boolean;
};

/**
 * Admin-safe linkage diagnostics for a partner row.
 * Does not expose tokens or secrets.
 */
export function buildIdentityLinkageHealth(input: {
  partnerId: string;
  authUserId: string | null;
  partnerStatus: string;
  partnerKycStatus: string;
  profile?: { id: string; role?: string | null; email?: string | null; mobile?: string | null } | null;
  authUser?: { email?: string | null; phone?: string | null; last_sign_in_at?: string | null } | null;
}): IdentityLinkageHealth {
  const warnings: string[] = [];
  const authUserId = input.authUserId;
  const profile = input.profile ?? null;
  const authUser = input.authUser ?? null;

  if (!authUserId) warnings.push("partner_has_no_auth_user");
  if (authUserId && !authUser) warnings.push("auth_user_missing");
  if (authUserId && !profile) warnings.push("profile_missing_for_auth_user");

  const profileRole = profile?.role ? String(profile.role) : null;
  if (profileRole === "admin" && input.partnerStatus === "active" && input.partnerKycStatus === "approved") {
    warnings.push("profile_role_admin_with_active_partner_membership");
  }
  if (profileRole && profileRole !== "agency_partner" && profileRole !== "agent" && profileRole !== "admin") {
    warnings.push("profile_role_unexpected");
  }
  if (authUser?.email && profile?.email && String(authUser.email).toLowerCase() !== String(profile.email).toLowerCase()) {
    warnings.push("auth_email_and_profile_email_mismatch");
  }
  if (profileRole === "admin" && !authUserId) {
    warnings.push("admin_only_without_partner_link");
  }

  return {
    partnerId: input.partnerId,
    authUserId,
    profileId: profile?.id ?? null,
    profileRole,
    authEmail: authUser?.email ?? null,
    profileEmail: profile?.email ?? null,
    authMobile: authUser?.phone ?? null,
    profileMobile: profile?.mobile ?? null,
    partnerStatus: input.partnerStatus,
    partnerKycStatus: input.partnerKycStatus,
    lastApLogin: authUser?.last_sign_in_at ?? null,
    warnings,
    healthy: warnings.length === 0 && Boolean(authUserId) && Boolean(profile),
  };
}
