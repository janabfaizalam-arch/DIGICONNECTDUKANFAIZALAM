import { checkRateLimit as checkRateLimitInMemory } from "@/lib/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type RateLimitResult = { ok: boolean; retryAfter: number };

/**
 * Durable, cross-instance rate limit backed by Postgres
 * (migration 20260718000000_durable_rate_limiting.sql).
 *
 * Falls back to the in-memory limiter when the database is unavailable so an
 * outage degrades protection instead of blocking legitimate users. Keys must
 * not contain secrets or full PII — use hashes or truncated identifiers where
 * possible.
 */
export async function checkRateLimitDurable(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return checkRateLimitInMemory(key, limit, windowMs);
  }

  try {
    const { data, error } = await supabase.rpc("check_rate_limit", {
      p_key: key,
      p_limit: limit,
      p_window_ms: windowMs,
    });

    if (error || !data) {
      console.error("[rate-limit] Durable check failed; using in-memory fallback", { error: error?.message });
      return checkRateLimitInMemory(key, limit, windowMs);
    }

    const row = (Array.isArray(data) ? data[0] : data) as { allowed: boolean; retry_after_seconds: number } | undefined;

    if (!row) {
      return checkRateLimitInMemory(key, limit, windowMs);
    }

    return { ok: Boolean(row.allowed), retryAfter: Number(row.retry_after_seconds ?? 0) };
  } catch (error) {
    console.error("[rate-limit] Durable check threw; using in-memory fallback", { error });
    return checkRateLimitInMemory(key, limit, windowMs);
  }
}
