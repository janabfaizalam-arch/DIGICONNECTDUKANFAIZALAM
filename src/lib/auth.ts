import { User } from "@supabase/supabase-js";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

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
  const role = String(user.user_metadata.role ?? "").toLowerCase();
  const email = (user.email ?? "").toLowerCase();

  return role === "super_admin" || role === "admin" || adminEmails.includes(email);
}

export type AppRole = "super_admin" | "admin" | "agent" | "staff" | "customer";

export function isAdminRole(role: AppRole | string | null | undefined) {
  return role === "super_admin" || role === "admin";
}

export function isAgentRole(role: AppRole | string | null | undefined) {
  return role === "super_admin" || role === "admin" || role === "agent";
}

export function isOnlyAgentRole(role: AppRole | string | null | undefined) {
  return role === "agent";
}

export type AgentAccessResult =
  | { ok: true; reason: "active_agent" }
  | { ok: false; reason: "missing_user" | "wrong_role" | "missing_profile" | "inactive_profile" | "missing_server_config"; role?: AppRole | string | null };

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
    .select("id, role, active, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[agent-auth] Agent profile lookup failed.", { userId: user.id, error: error.message });
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

  if (profile.active === false || profile.is_active === false) {
    console.error("[agent-auth] Agent profile is inactive.", {
      userId: user.id,
      active: profile.active,
      isActive: profile.is_active,
    });
    return { ok: false, reason: "inactive_profile", role };
  }

  return { ok: true, reason: "active_agent" };
}

export async function isActiveAgent(user: User | null) {
  const access = await getAgentAccessStatus(user);

  return access.ok;
}

export function isStaffRole(role: AppRole | string | null | undefined) {
  return role === "staff";
}

export function isCustomerRole(role: AppRole | string | null | undefined) {
  return role === "customer";
}

export async function getCurrentUserRole(user: User | null): Promise<AppRole> {
  if (!user) {
    return "customer";
  }

  const supabaseAdmin = getSupabaseAdmin();
  const metadataRole = String(user.user_metadata.role ?? "").toLowerCase();

  if (metadataRole === "super_admin" || metadataRole === "admin" || metadataRole === "agent" || metadataRole === "staff") {
    return metadataRole as AppRole;
  }

  if (isAdminUser(user)) {
    return "admin";
  }

  if (!supabaseAdmin) {
    return "customer";
  }

  const { data: profile } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).maybeSingle();

  const profileRole = String(profile?.role ?? "");

  if (["super_admin", "admin", "agent", "staff", "customer"].includes(profileRole)) {
    return profileRole as AppRole;
  }

  const { data: portalUser } = await supabaseAdmin.from("users").select("role").eq("id", user.id).maybeSingle();

  const portalRole = String(portalUser?.role ?? "");

  if (["super_admin", "admin", "agent", "staff", "customer"].includes(portalRole)) {
    return portalRole as AppRole;
  }

  return "customer";
}

export function getRoleHome(role: AppRole | string | null | undefined) {
  if (isAdminRole(role)) {
    return "/admin";
  }

  if (role === "agent") {
    return "/agent/dashboard";
  }

  if (role === "staff") {
    return "/staff/dashboard";
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

  const superAdminEmails = ["janabfaizalam@gmail.com"];
  const email = (user.email ?? "").toLowerCase();
  const adminRole = superAdminEmails.includes(email) ? "super_admin" : isAdminUser(user) ? "admin" : null;
  const { data: existingProfile } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const { data: existingUser } = await supabaseAdmin.from("users").select("role").eq("id", user.id).maybeSingle();
  const role = adminRole ?? existingProfile?.role ?? existingUser?.role ?? "customer";

  await supabaseAdmin.from("profiles").upsert(
    {
      id: user.id,
      full_name: user.user_metadata.full_name ?? user.user_metadata.name ?? "",
      email: user.email ?? "",
      avatar_url: user.user_metadata.avatar_url ?? user.user_metadata.picture ?? "",
      role,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "id",
    },
  );

  await supabaseAdmin.from("users").upsert(
    {
      id: user.id,
      full_name: user.user_metadata.full_name ?? user.user_metadata.name ?? "",
      email: user.email ?? "",
      avatar_url: user.user_metadata.avatar_url ?? user.user_metadata.picture ?? "",
      role,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "id",
    },
  );
}
