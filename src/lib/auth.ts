import { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { attachReferralOnSignup, ensureReferralCodeForUser } from "@/lib/referrals";
import { createWalletIfMissing } from "@/lib/rewards-wallet";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { creditSignupBonus } from "@/lib/wallet-ledger";
import { syncCustomerIdentity } from "@/lib/customer-identity";
import type { PendingCustomerOAuthData } from "@/lib/customer-oauth";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth-v2/session";
import { verifyAccessToken } from "@/lib/auth-v2/jwt";
import { ADMIN_ACCESS_TOKEN_COOKIE, verifyAdminAccessToken } from "@/lib/auth/admin-session";
import {
  isAllowlistedAdminEmail,
  isDemotedAdminEmail,
  PRIMARY_ADMIN,
} from "@/lib/auth/primary-admin";

async function getAdminJwtUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(ADMIN_ACCESS_TOKEN_COOKIE)?.value;
    if (!token) return null;
    const payload = await verifyAdminAccessToken(token);
    if (!payload?.sub || payload.role !== "admin") return null;

    return {
      id: payload.sub,
      email: payload.email,
      phone: payload.mobile,
      app_metadata: { role: "admin", provider: "admin_pin" },
      user_metadata: {
        role: "admin",
        mobile: payload.mobile,
        phone: payload.mobile,
        full_name: payload.full_name ?? PRIMARY_ADMIN.fullName,
      },
      aud: "admin",
      created_at: new Date().toISOString(),
    } as unknown as User;
  } catch {
    return null;
  }
}

async function getCustomerJwtUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
    if (!token) return null;
    const payload = await verifyAccessToken(token);
    if (!payload?.sub || payload.role !== "customer") return null;

    return {
      id: payload.sub,
      email: undefined,
      phone: payload.mobile,
      app_metadata: { role: "customer", provider: "customer_pin" },
      user_metadata: {
        role: "customer",
        mobile: payload.mobile,
        phone: payload.mobile,
        full_name: "Customer",
      },
      aud: "customer",
      created_at: new Date().toISOString(),
    } as unknown as User;
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const supabase = await getSupabaseServerClient();

  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) return user;
  }

  const adminJwtUser = await getAdminJwtUser();
  if (adminJwtUser) return adminJwtUser;

  // Legacy / production customer PIN sessions (customers.hashed_pin + JWT)
  const jwtUser = await getCustomerJwtUser();
  if (jwtUser) return jwtUser;

  if (!supabase && process.env.NODE_ENV === "development") {
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

export function isAdminUser(user: User | null) {
  if (!user) {
    return false;
  }

  const email = (user.email ?? "").toLowerCase();
  if (isDemotedAdminEmail(email)) {
    return false;
  }

  const role =
    normalizeAppRole(user.user_metadata?.role) ??
    normalizeAppRole((user.app_metadata as Record<string, unknown> | undefined)?.role);

  if (role === "admin") {
    return true;
  }

  return isAllowlistedAdminEmail(email);
}

export type AppRole = "admin" | "agency_partner" | "customer";

const appRoles: AppRole[] = ["admin", "agency_partner", "customer"];
const adminRoleAliases = new Set(["super_admin", "staff", "team", "employee", "processor"]);
const apRoleAliases = new Set(["agent", "agency_partner", "ap"]);

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

type SupabaseAdminClient = NonNullable<ReturnType<typeof getSupabaseAdmin>>;

function isMissingActiveColumn(errorMessage: string) {
  const normalized = errorMessage.toLowerCase();

  return normalized.includes("active") && (normalized.includes("does not exist") || normalized.includes("could not find"));
}

async function readOptionalProfileBoolean(
  supabaseAdmin: SupabaseAdminClient,
  userId: string,
  column: "active" | "is_active",
) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select(column)
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    if (isMissingActiveColumn(error.message)) {
      return { exists: false, value: null };
    }

    console.error("[agent-auth] Agent active status lookup failed.", {
      userId,
      column,
      error: error.message,
    });
    return { exists: true, value: false };
  }

  return {
    exists: true,
    value: Boolean((data as Record<string, unknown> | null)?.[column]),
  };
}

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

  // First check agency_partners table (new system)
  const { data: apRecord } = await supabaseAdmin
    .from("agency_partners")
    .select("id, status, kyc_status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (apRecord) {
    const ap = apRecord as { id: string; status: string; kyc_status: string };
    if (ap.status !== "active") {
      console.error("[ap-auth] AP is not active.", { userId: user.id, status: ap.status });
      return { ok: false, reason: "ap_not_active", role };
    }
    if (ap.kyc_status !== "approved") {
      console.error("[ap-auth] AP KYC is not approved.", { userId: user.id, kycStatus: ap.kyc_status });
      return { ok: false, reason: "kyc_not_approved", role };
    }
    return { ok: true, reason: "active_approved_ap" };
  }

  // Fallback: check legacy profiles table
  const { data: profile, error } = await supabaseAdmin
    .from("profiles")
    .select("id, role, kyc_status")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[agent-auth] Agent profile lookup failed.", { userId: user.id, error: error.message });
    return { ok: false, reason: "missing_profile", role };
  }

  if (!profile) {
    console.error("[agent-auth] Agent profile is missing.", { userId: user.id });
    return { ok: false, reason: "missing_profile", role };
  }

  const profileRole = String(profile.role ?? "").toLowerCase();

  if (profileRole !== "agent" && profileRole !== "agency_partner") {
    console.error("[agent-auth] Profile has wrong role.", { userId: user.id, profileRole });
    return { ok: false, reason: "wrong_role", role: profileRole };
  }

  if (String(profile.kyc_status ?? "").toLowerCase() !== "approved") {
    console.error("[agent-auth] Agent KYC is not approved.", { userId: user.id, kycStatus: profile.kyc_status });
    return { ok: false, reason: "kyc_not_approved", role };
  }

  const [activeStatus, isActiveStatus] = await Promise.all([
    readOptionalProfileBoolean(supabaseAdmin, user.id, "active"),
    readOptionalProfileBoolean(supabaseAdmin, user.id, "is_active"),
  ]);
  const activeChecks = [activeStatus, isActiveStatus].filter((status) => status.exists);

  if (activeChecks.some((status) => status.value !== true)) {
    console.error("[agent-auth] Agent profile is inactive.", {
      userId: user.id,
      active: activeStatus.exists ? activeStatus.value : "missing",
      is_active: isActiveStatus.exists ? isActiveStatus.value : "missing",
    });
    return { ok: false, reason: "inactive_profile", role };
  }

  return { ok: true, reason: "active_approved_agent" };
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
  const metadataRole = normalizeAppRole(user.user_metadata.role);

  if (metadataRole) {
    return metadataRole;
  }

  if (isAdminUser(user)) {
    return "admin";
  }

  const email = String(user.email ?? "").toLowerCase();
  if (email === "dgcntdkn@gmail.com") {
    return "customer";
  }
  if (email === "janabfaizalam@gmail.com") {
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

  const { data: portalUser } = await supabaseAdmin.from("users").select("role").eq("id", user.id).maybeSingle();

  const portalRole = normalizeAppRole(portalUser?.role);

  if (portalRole) {
    return portalRole;
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
