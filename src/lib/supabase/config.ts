export const SUPABASE_PROJECT_URL = "https://oqcudhmnsmqwlfzlrvfw.supabase.co";

export function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || SUPABASE_PROJECT_URL;
}
