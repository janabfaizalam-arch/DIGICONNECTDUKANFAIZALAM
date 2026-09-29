import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Automatic deletion of operational records — only where a retention period
 * has been set.
 *
 * No period is assumed. Each category runs only when its RETENTION_*_DAYS
 * environment variable holds a whole number of days; unset means "keep", which
 * is what happens today. The business / legal owner decides the numbers (see
 * docs/compliance/COMPLIANCE_AUDIT.md, "Retention").
 *
 * Deliberately NOT here: applications, uploaded documents, payments, invoices,
 * wallet ledgers, credit reports, leads and privacy requests. Those are
 * business, financial or legal records; deleting them on a timer would be a
 * decision about the law, not about housekeeping. Smart Print files are
 * cleaned by their own cron (/api/cron/cleanup-prints).
 */

export type RetentionCategory = {
  id: "otp_requests" | "customer_sessions" | "auth_security_events" | "site_visits";
  envVar: string;
  /** Floor so a misconfiguration cannot break a running feature. */
  minimumDays: number;
  description: string;
  run: (supabase: SupabaseClient, cutoffIso: string) => Promise<{ error: { message: string } | null; count: number | null }>;
};

export const RETENTION_CATEGORIES: RetentionCategory[] = [
  {
    id: "otp_requests",
    envVar: "RETENTION_OTP_DAYS",
    // The per-phone OTP rate limit counts the last hour of rows.
    minimumDays: 1,
    description: "WhatsApp OTP requests (hashed codes, expired within minutes)",
    run: (supabase, cutoff) =>
      supabase.from("auth_otp_requests").delete({ count: "exact" }).lt("created_at", cutoff) as never,
  },
  {
    id: "customer_sessions",
    envVar: "RETENTION_SESSIONS_DAYS",
    minimumDays: 1,
    description: "Revoked or expired customer sign-in sessions",
    run: (supabase, cutoff) =>
      supabase
        .from("customer_sessions")
        .delete({ count: "exact" })
        .lt("created_at", cutoff)
        .or(`is_revoked.eq.true,expires_at.lt.${new Date().toISOString()}`) as never,
  },
  {
    id: "auth_security_events",
    envVar: "RETENTION_AUTH_EVENTS_DAYS",
    // Sign-in lockouts read the last 15 minutes; investigations need longer.
    minimumDays: 30,
    description: "Sign-in success/failure log (user id, phone, IP, user agent)",
    run: (supabase, cutoff) =>
      supabase.from("auth_security_events").delete({ count: "exact" }).lt("created_at", cutoff) as never,
  },
  {
    id: "site_visits",
    envVar: "RETENTION_SITE_VISITS_DAYS",
    minimumDays: 30,
    description: "First-party page-view counter (no IP stored)",
    run: (supabase, cutoff) =>
      supabase.from("site_visits").delete({ count: "exact" }).lt("occurred_at", cutoff) as never,
  },
];

export type RetentionPlanItem =
  | { id: RetentionCategory["id"]; status: "disabled"; reason: string }
  | { id: RetentionCategory["id"]; status: "enabled"; days: number; cutoff: string };

/** What would run, from the environment alone. Pure, so it can be tested. */
export function planRetention(env: Record<string, string | undefined>, now = new Date()): RetentionPlanItem[] {
  return RETENTION_CATEGORIES.map((category) => {
    const raw = env[category.envVar]?.trim();
    if (!raw) return { id: category.id, status: "disabled", reason: `${category.envVar} not set` };
    if (!/^\d+$/.test(raw)) return { id: category.id, status: "disabled", reason: `${category.envVar} is not a whole number of days` };
    const days = Number(raw);
    if (days < category.minimumDays) {
      return { id: category.id, status: "disabled", reason: `${category.envVar} is below the ${category.minimumDays}-day minimum` };
    }
    return { id: category.id, status: "enabled", days, cutoff: new Date(now.getTime() - days * 86_400_000).toISOString() };
  });
}

export async function runRetention(supabase: SupabaseClient, env: Record<string, string | undefined> = process.env) {
  const results: Array<RetentionPlanItem & { deleted?: number; error?: string }> = [];
  for (const item of planRetention(env)) {
    if (item.status !== "enabled") {
      results.push(item);
      continue;
    }
    const category = RETENTION_CATEGORIES.find((c) => c.id === item.id)!;
    const { error, count } = await category.run(supabase, item.cutoff);
    results.push({ ...item, deleted: count ?? 0, ...(error ? { error: "delete failed" } : {}) });
    if (error) console.error("[retention] delete_failed", { category: item.id, message: error.message });
  }
  return results;
}
