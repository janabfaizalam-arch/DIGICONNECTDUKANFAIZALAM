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

export type AppRole = "super_admin" | "admin" | "agent" | "customer";

export function isAdminRole(role: AppRole | string | null | undefined) {
  return role === "super_admin" || role === "admin";
}

export function isAgentRole(role: AppRole | string | null | undefined) {
  return role === "super_admin" || role === "admin" || role === "agent";
}

export function isOnlyAgentRole(role: AppRole | string | null | undefined) {
  return role === "agent";
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

  if (metadataRole === "super_admin" || metadataRole === "admin" || metadataRole === "agent") {
    return metadataRole as AppRole;
  }

  if (isAdminUser(user)) {
    return "admin";
  }

  if (!supabaseAdmin) {
    return "customer";
  }

  const { data: profile } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).maybeSingle();

  if (profile?.role && ["super_admin", "admin", "agent", "customer"].includes(String(profile.role))) {
    return profile.role as AppRole;
  }

  const { data: portalUser } = await supabaseAdmin.from("users").select("role").eq("id", user.id).maybeSingle();

  if (portalUser?.role && ["super_admin", "admin", "agent", "customer"].includes(String(portalUser.role))) {
    return portalUser.role as AppRole;
  }

  return "customer";
}

export function getRoleHome(role: AppRole | string | null | undefined) {
  if (isAdminRole(role)) {
    return "/admin";
  }

  if (role === "agent") {
    return "/agent";
  }

  return "/dashboard";
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
