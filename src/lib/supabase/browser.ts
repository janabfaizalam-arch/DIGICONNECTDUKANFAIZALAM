import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseUrl } from "@/lib/supabase/config";

const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function getSupabaseBrowserClient() {
  if (!supabaseAnonKey) {
    return null;
  }

  const supabaseUrl = getSupabaseUrl();

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
