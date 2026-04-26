import { createClient } from "@supabase/supabase-js";

import { getSupabaseUrl } from "@/lib/supabase/config";

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function getSupabaseAdmin() {
  if (!serviceRoleKey) {
    return null;
  }

  const supabaseUrl = getSupabaseUrl();

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
