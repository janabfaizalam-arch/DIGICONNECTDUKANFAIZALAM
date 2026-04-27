import { createClient } from "@supabase/supabase-js";

import { getSupabaseUrl } from "@/lib/supabase/config";

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function getSupabaseAdmin() {
  const supabaseUrl = getSupabaseUrl();

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
