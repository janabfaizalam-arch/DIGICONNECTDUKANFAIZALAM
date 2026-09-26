import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function logAuthSecurityEvent(input: {
  userId?: string | null;
  phone?: string | null;
  eventType: string;
  details?: Record<string, unknown>;
  ip?: string | null;
  userAgent?: string | null;
}) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  await supabase.from("auth_security_events").insert({
    user_id: input.userId ?? null,
    phone: input.phone ?? null,
    event_type: input.eventType,
    details: input.details ?? {},
    ip_address: input.ip ?? null,
    user_agent: input.userAgent ?? null,
  });
}

/**
 * Per-account lockout from the failures already recorded above.
 *
 * The in-memory rate limiter is per server instance and keyed by IP, so a
 * distributed guess at a 6-digit PIN walks straight past it. This counts the
 * account's recent failures in the database instead: `maxFailures` within
 * `windowMs` locks the account for the rest of the window, from any IP.
 *
 * Fails open (returns false) only when the database cannot be reached, so an
 * outage does not also lock the owner out; the per-IP limiter still applies.
 */
export async function isAuthLockedOut(input: {
  userId?: string | null;
  phone?: string | null;
  eventTypes: string[];
  maxFailures?: number;
  windowMs?: number;
}): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase || (!input.userId && !input.phone)) return false;

  const since = new Date(Date.now() - (input.windowMs ?? 15 * 60_000)).toISOString();
  let query = supabase
    .from("auth_security_events")
    .select("id", { count: "exact", head: true })
    .in("event_type", input.eventTypes)
    .gte("created_at", since);
  query = input.userId ? query.eq("user_id", input.userId) : query.eq("phone", input.phone as string);

  const { count, error } = await query;
  if (error) {
    console.error("[auth-lockout] count_failed", { code: error.code });
    return false;
  }
  return (count ?? 0) >= (input.maxFailures ?? 5);
}
