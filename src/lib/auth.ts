import { User } from "@supabase/supabase-js";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { attachReferralOnSignup, ensureReferralCodeForUser } from "@/lib/referrals";
import { createWalletIfMissing } from "@/lib/rewards-wallet";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { creditSignupBonus } from "@/lib/wallet-ledger";
import { syncCustomerIdentity } from "@/lib/customer-identity";

export async function getCurrentUser() {
  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    return null;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export function isAdminUser(user: User | null) {
  if (!user) {
    return false;
  }

  const adminEmails = (process.env.ADMIN_EMAILS ?? process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  const role = normalizeAppRole(user.user_metadata.role);
  const email = (user.email ?? "").toLowerCase();

  return role === "admin" || adminEmails.includes(email);
}

export type AppRole = "admin" | "agent" | "customer";

const appRoles: AppRole[] = ["admin", "agent", "customer"];
const adminRoleAliases = new Set(["super_admin", "staff", "team", "employee", "processor"]);

export function normalizeAppRole(role: unknown): AppRole | null {
  const value = String(role ?? "").toLowerCase();

  if (adminRoleAliases.has(value)) {
    return "admin";
  }

  return appRoles.includes(value as AppRole) ? (value as AppRole) : null;
}

export function isAdminRole(role: AppRole | string | null | undefined) {
  return normalizeAppRole(role) === "admin";
}

export function isAgentRole(role: AppRole | string | null | undefined) {
  const normalizedRole = normalizeAppRole(role);
  return normalizedRole === "admin" || normalizedRole === "agent";
}

export function isOnlyAgentRole(role: AppRole | string | null | undefined) {
  return normalizeAppRole(role) === "agent";
}

export type AgentAccessResult =
  | { ok: true; reason: "active_approved_agent" }
  | { ok: false; reason: "missing_user" | "wrong_role" | "missing_profile" | "inactive_profile" | "kyc_not_approved" | "missing_server_config"; role?: AppRole | string | null };

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

  if (!isOnlyAgentRole(role)) {
    console.error("[agent-auth] User is not an agent.", { userId: user.id, role });
    return { ok: false, reason: "wrong_role", role };
  }

  const supabaseAdmin = getSupabaseAdmin();

  if (!supabaseAdmin) {
    console.error("[agent-auth] Missing Supabase service role configuration.");
    return { ok: false, reason: "missing_server_config", role };
  }

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

  if (profileRole !== "agent") {
    console.error("[agent-auth] Agent profile has wrong role.", { userId: user.id, profileRole });
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

  if (normalizeAppRole(role) === "agent") {
    return "/agent/dashboard";
  }

  return getCustomerHome();
}

export function getCustomerHome() {
  return "/customer/dashboard";
}

export async function syncUserProfile(user: User) {
  const supabaseAdmin = getSupabaseAdmin();

  if (!supabaseAdmin) {
    return;
  }

  const adminRole = isAdminUser(user) ? "admin" : null;
  const { data: existingProfile } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const { data: existingUser } = await supabaseAdmin.from("users").select("role").eq("id", user.id).maybeSingle();
  const storedRole = String(existingProfile?.role ?? existingUser?.role ?? "customer").toLowerCase();
  const normalizedStoredRole = normalizeAppRole(storedRole) ?? "customer";
  const role = adminRole ?? normalizedStoredRole;
  const fullName = String(user.user_metadata.full_name ?? user.user_metadata.name ?? "").trim();
  const mobile = String(user.phone ?? user.user_metadata.mobile ?? user.user_metadata.phone ?? "").replace(/\D/g, "").trim();
  const pincode = String(user.user_metadata.pincode ?? "").trim();
  const city = String(user.user_metadata.city ?? "").trim();
  const state = String(user.user_metadata.state ?? "").trim();
  const referralCode = String(user.user_metadata.referred_by ?? user.user_metadata.referral_code ?? user.user_metadata.ref ?? "").trim().toUpperCase();

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
      state,
      source: "online",
    });
  }
}
