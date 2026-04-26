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

export async function syncUserProfile(user: User) {
  const supabaseAdmin = getSupabaseAdmin();

  if (!supabaseAdmin) {
    return;
  }

  await supabaseAdmin.from("profiles").upsert(
    {
      id: user.id,
      full_name: user.user_metadata.full_name ?? user.user_metadata.name ?? "",
      email: user.email ?? "",
      avatar_url: user.user_metadata.avatar_url ?? user.user_metadata.picture ?? "",
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "id",
    },
  );
}
