"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * One browser client for the tab.
 *
 * This used to construct a fresh `createBrowserClient` on every call, and it
 * is called from component bodies and effects all over the app — the header,
 * the tab bar, every panel that reads a table. Each new client sets up its
 * own auth storage listener and its own token-refresh timer, so the cost was
 * not only the construction: a page with a dozen callers ran a dozen parallel
 * refresh schedules against the same session.
 */
let client: SupabaseClient | null = null;

export function createClient() {
  if (typeof window === "undefined") return null;
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error("Missing Supabase ENV");
    return null;
  }

  client = createBrowserClient(url, key);
  return client;
}
