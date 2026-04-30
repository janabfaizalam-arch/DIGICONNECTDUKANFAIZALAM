import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseUrl } from "@/lib/supabase/config";

const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function getSupabaseBrowserClient() {
  if (typeof window === "undefined") {
    return null;
  }

  const supabaseUrl = getSupabaseUrl();

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
