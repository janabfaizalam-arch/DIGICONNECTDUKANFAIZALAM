import { User } from "@supabase/supabase-js";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { attachReferralOnSignup, ensureReferralCodeForUser } from "@/lib/referrals";
import { createWalletIfMissing } from "@/lib/rewards-wallet";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { creditSignupBonus } from "@/lib/wallet-ledger";
import { syncCustomerIdentity } from "@/lib/customer-identity";
import type { PendingCustomerOAuthData } from "@/lib/customer-oauth";

export async function getCurrentUser() {
  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    if (process.env.NODE_ENV === "development") {
      return {
        id: "mock-user-123",
        email: "test.verify@example.com",
        phone: "9999999999",
        user_metadata: {
          full_name: "Verification Test Customer",
          role: "customer",
        },
        email_confirmed_at: new Date().toISOString(),
      } as unknown as User;
    }
    return null;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

// Server-only admin email allowlist. Authorization must never read the
// NEXT_PUBLIC_ variant: public env vars ship in the client bundle and are
// not a trustworthy authorization input.
export function getAdminEmailAllowlist(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

// Role claim that only the server can set (service-role admin API / SQL).
// user_metadata is intentionally NOT consulted for privilege decisions:
// any logged-in user can rewrite their own user_metadata via
// supabase.auth.updateUser({ data: { role: "admin" } }).
export function getServerMetadataRole(user: User | null) {
  return normalizeAppRole((user?.app_metadata as Record<string, unknown> | undefined)?.role);
}

export function isAdminUser(user: User | null) {
  if (!user) {
    return false;
  }

  const email = (user.email ?? "").toLowerCase();

  return getServerMetadataRole(user) === "admin" || getAdminEmailAllowlist().includes(email);
}

export type AppRole = "admin" | "agency_partner" | "customer";

const appRoles: AppRole[] = ["admin", "agency_partner", "customer"];
const adminRoleAliases = new Set(["super_admin", "staff", "team", "employee", "processor"]);
const apRoleAliases = new Set(["agent", "agency_partner"]);

export function normalizeAppRole(role: unknown): AppRole | null {
  const value = String(role ?? "").toLowerCase();

  if (adminRoleAliases.has(value)) {
    return "admin";
  }

  if (apRoleAliases.has(value)) {
    return "agency_partner";
  }

  return appRoles.includes(value as AppRole) ? (value as AppRole) : null;
}

export function isAdminRole(role: AppRole | string | null | undefined) {
  return normalizeAppRole(role) === "admin";
}

export function isAgentRole(role: AppRole | string | null | undefined) {
  const normalizedRole = normalizeAppRole(role);
  return normalizedRole === "admin" || normalizedRole === "agency_partner";
}

export function isOnlyAgentRole(role: AppRole | string | null | undefined) {
  return normalizeAppRole(role) === "agency_partner";
}

export function isAgencyPartnerRole(role: AppRole | string | null | undefined) {
  return normalizeAppRole(role) === "agency_partner";
}

export function isCeoPartnerType(partnerType: string | null | undefined): boolean {
  return partnerType === "ceo";
}

export type AgentAccessResult =
  | { ok: true; reason: "active_approved_agent" | "active_approved_ap" }
  | { ok: false; reason: "missing_user" | "wrong_role" | "missing_profile" | "inactive_profile" | "kyc_not_approved" | "missing_server_config" | "ap_not_active"; role?: AppRole | string | null };

export async function getAgentAccessStatus(user: User | null): Promise<AgentAccessResult> {
  if (!user) {
    console.error("[agent-auth] Missing authenticated user.");
    return { ok: false, reason: "missing_user" };
  }

  const role = await getCurrentUserRole(user);

  if (!isOnlyAgentRole(role) && !isAgencyPartnerRole(role)) {
    console.error("[agent-auth] User is not an agent/AP.", { userId: user.id, role });
    return { ok: false, reason: "wrong_role", role };
  }

  const supabaseAdmin = getSupabaseAdmin();

  if (!supabaseAdmin) {
    console.error("[agent-auth] Missing Supabase service role configuration.");
    return { ok: false, reason: "missing_server_config", role };
  }

  const { data: apRecord } = await supabaseAdmin
    .from("agency_partners")
    .select("id, status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (apRecord) {
    if (apRecord.status !== "active") {
      return { ok: false, reason: "ap_not_active", role };
    }
    return { ok: true, reason: "active_approved_ap" };
  }

  const { data: profile, error } = await supabaseAdmin
    .from("profiles")
    .select("id, role, active")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !profile) {
    return { ok: false, reason: "missing_profile", role };
  }

  const profileRole = String(profile.role ?? "").toLowerCase();
  if (profileRole !== "agency_partner" && profileRole !== "agent") {
    return { ok: false, reason: "wrong_role", role: profileRole };
  }

  if (profile.active === false) {
    return { ok: false, reason: "inactive_profile", role };
  }

  return { ok: true, reason: "active_approved_ap" };
}

export async function isActiveAgent(user: User | null) {
  const access = await getAgentAccessStatus(user);

  return access.ok;
}

export function isCustomerRole(role: AppRole | string | null | undefined) {
  return normalizeAppRole(role) === "customer";
}

export async function getCurrentUserRole(user: User | null): Promise<AppRole> {
  if (!user) {
    return "customer";
  }

  const supabaseAdmin = getSupabaseAdmin();
  // Only the server-controlled app_metadata claim is trusted here.
  // user_metadata.role is rewritable by the logged-in user themselves and
  // must never decide authorization; database rows are the source of truth.
  const metadataRole = getServerMetadataRole(user);

  if (metadataRole) {
    return metadataRole;
  }

  // Fast path: a self-claim of the LOWEST privilege is safe to trust
  // (worst case is a self-downgrade), and it saves DB round-trips for the
  // vast majority of requests, which come from customers.
  if (normalizeAppRole(user.user_metadata?.role) === "customer") {
    return "customer";
  }

  if (isAdminUser(user)) {
    return "admin";
  }

  if (!supabaseAdmin) {
    return "customer";
  }

  const { data: profile } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).maybeSingle();

  const profileRole = normalizeAppRole(profile?.role);

  if (profileRole) {
    return profileRole;
  }

  return "customer";
}

export function getRoleHome(role: AppRole | string | null | undefined) {
  if (isAdminRole(role)) {
    return "/admin";
  }

  if (normalizeAppRole(role) === "agency_partner") {
    return "/ap/dashboard";
  }

  return getCustomerHome();
}

export function getCustomerHome() {
  return "/customer/dashboard";
}

export async function syncUserProfile(user: User, pendingCustomerOAuth?: PendingCustomerOAuthData | null) {
  const supabaseAdmin = getSupabaseAdmin();

  if (!supabaseAdmin) {
    return;
  }

  const adminRole = isAdminUser(user) ? "admin" : null;
  const { data: existingProfile } = await supabaseAdmin.from("profiles").select("role, mobile, pincode, city, district, state").eq("id", user.id).maybeSingle();
  const { data: existingUser } = await supabaseAdmin.from("users").select("role").eq("id", user.id).maybeSingle();
  const { data: existingCustomerProfile } = await supabaseAdmin
    .from("customer_profiles")
    .select("mobile, pincode, city, district, state")
    .eq("id", user.id)
    .maybeSingle();
  const storedRole = String(existingProfile?.role ?? existingUser?.role ?? "customer").toLowerCase();
  const normalizedStoredRole = normalizeAppRole(storedRole) ?? "customer";
  const role = adminRole ?? normalizedStoredRole;
  const fullName = String(user.user_metadata.full_name || user.user_metadata.name || "").trim();
  let mobile = String(pendingCustomerOAuth?.mobile || user.phone || user.user_metadata.mobile || user.user_metadata.phone || "").replace(/\D/g, "").trim();
  if (!mobile) {
    mobile = String(existingProfile?.mobile || existingCustomerProfile?.mobile || "").replace(/\D/g, "").trim();
  }
  let pincode = String(pendingCustomerOAuth?.pincode || user.user_metadata.pincode || "").trim();
  if (!pincode) {
    pincode = String(existingProfile?.pincode || existingCustomerProfile?.pincode || "").trim();
  }
  let city = String(pendingCustomerOAuth?.city || user.user_metadata.city || "").trim();
  if (!city) {
    city = String(existingProfile?.city || existingCustomerProfile?.city || "").trim();
  }
  let district = String(pendingCustomerOAuth?.district || user.user_metadata.district || "").trim();
  if (!district) {
    district = String(existingProfile?.district || existingCustomerProfile?.district || "").trim();
  }
  let state = String(pendingCustomerOAuth?.state || user.user_metadata.state || "").trim();
  if (!state) {
    state = String(existingProfile?.state || existingCustomerProfile?.state || "").trim();
  }
  const referralCode = String(user.user_metadata.referred_by || user.user_metadata.referral_code || user.user_metadata.ref || "").trim().toUpperCase();

  if (pendingCustomerOAuth) {
    await supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        mobile,
        phone: mobile,
        pincode,
        city,
        district,
        state,
      },
    }).catch((error) => {
      console.warn("[auth] Pending OAuth metadata sync failed", { userId: user.id, error });
    });
  }

  await supabaseAdmin.from("profiles").upsert(
    {
      id: user.id,
      full_name: fullName,
      email: user.email ?? "",
      mobile,
      avatar_url: user.user_metadata.avatar_url ?? user.user_metadata.picture ?? "",
      role,
      pincode,
      city,
      district,
      state,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "id",
    },
  );

  await supabaseAdmin.from("users").upsert(
    {
      id: user.id,
      full_name: fullName,
      email: user.email ?? "",
      avatar_url: user.user_metadata.avatar_url ?? user.user_metadata.picture ?? "",
      role,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "id",
    },
  );

  if (role === "customer") {
    const customerName = fullName || "Customer";
    const emailValue = user.email ?? "";
    const isEmailVerified = Boolean(user.email_confirmed_at);

    if (isEmailVerified) {
      await ensureReferralCodeForUser(user.id).catch((error) => {
        console.error("[auth] Referral code generation failed", error);
        return null;
      });

      await createWalletIfMissing(user.id).catch((error) => {
        console.error("[auth] Reward wallet creation failed", error);
        return null;
      });

      await creditSignupBonus(user.id).catch((error) => {
        console.error("[auth] Signup bonus credit failed", error);
        return null;
      });

      if (referralCode) {
        await attachReferralOnSignup(user.id, referralCode, null, null).catch((error) => {
          console.error("[auth] Referral signup attachment failed", error);
          return null;
        });
      }

    }

    await syncCustomerIdentity(supabaseAdmin, {
      userId: user.id,
      fullName: customerName,
      email: emailValue,
      mobile,
      pincode,
      city,
      district,
      state,
      source: "online",
    }).catch((error) => {
      console.warn("CUSTOMER_SYNC_WARNING", {
        step: "auth_sync_customer_identity",
        userId: user.id,
        email: emailValue,
        mobile,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    });
  }
}
