import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";

/** Asia/Kolkata calendar date YYYY-MM-DD for a given instant. */
export function istBusinessDate(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** UTC bounds for an IST business date [start, end). */
export function istDayUtcBounds(businessDate: string): { fromIso: string; toIso: string } {
  const fromIso = new Date(`${businessDate}T00:00:00+05:30`).toISOString();
  const next = new Date(`${businessDate}T00:00:00+05:30`);
  next.setUTCDate(next.getUTCDate()); // keep local construct
  const end = new Date(new Date(`${businessDate}T00:00:00+05:30`).getTime() + 24 * 60 * 60 * 1000);
  return { fromIso, toIso: end.toISOString() };
}

export type DailySummaryMetrics = {
  new_leads: number;
  leads_converted: number;
  walk_in_customers: number;
  applications_created: number;
  applications_completed: number;
  pending_applications: number;
  overdue_follow_ups: number;
  unassigned_leads: number;
  unassigned_applications: number;
  payments_due: number;
  failed_communications: number;
  configuration_required_communications: number;
  failed_automation_executions: number;
};

async function headCount(
  promise: PromiseLike<{ count: number | null }>,
): Promise<number> {
  try {
    const { count } = await promise;
    return count ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Deterministic daily summary — aggregates only, no PII lists.
 * Delivery remains disabled. Idempotent on business_date + Asia/Kolkata.
 */
export async function generateDailyOperationalSummary(input?: {
  businessDate?: string;
  generatedBy?: string;
}): Promise<
  | { ok: true; businessDate: string; metrics: DailySummaryMetrics; deduped: boolean; id: string }
  | { ok: false; error: string; status: number }
> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: "Service unavailable.", status: 503 };

  const businessDate = input?.businessDate || istBusinessDate();
  const idempotencyKey = `daily_summary:${businessDate}:Asia/Kolkata`;
  const { fromIso, toIso } = istDayUtcBounds(businessDate);

  const { data: existing } = await supabase
    .from("crm_daily_summaries")
    .select("id, metrics")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (existing) {
    return {
      ok: true,
      businessDate,
      metrics: existing.metrics as DailySummaryMetrics,
      deduped: true,
      id: String(existing.id),
    };
  }

  const metrics = await collectMetrics(supabase, fromIso, toIso);

  const { data, error } = await supabase
    .from("crm_daily_summaries")
    .insert({
      business_date: businessDate,
      timezone: "Asia/Kolkata",
      idempotency_key: idempotencyKey,
      metrics,
      delivery_status: "disabled",
      generated_by: input?.generatedBy ?? "system",
    })
    .select("id")
    .maybeSingle();

  if (error) {
    if (/duplicate|unique/i.test(error.message)) {
      const { data: again } = await supabase
        .from("crm_daily_summaries")
        .select("id, metrics")
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();
      if (again) {
        return {
          ok: true,
          businessDate,
          metrics: again.metrics as DailySummaryMetrics,
          deduped: true,
          id: String(again.id),
        };
      }
    }
    if (/PGRST205|42P01|does not exist/i.test(error.message)) {
      return { ok: false, error: "Database upgrade required for daily summaries.", status: 503 };
    }
    return { ok: false, error: "Could not store daily summary.", status: 500 };
  }

  return {
    ok: true,
    businessDate,
    metrics,
    deduped: false,
    id: String(data?.id ?? ""),
  };
}

async function collectMetrics(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  fromIso: string,
  toIso: string,
): Promise<DailySummaryMetrics> {
  const [
    new_leads,
    leads_converted,
    walk_in_customers,
    applications_created,
    applications_completed,
    pending_applications,
    overdue_follow_ups,
    unassigned_leads,
    unassigned_applications,
    payments_due,
    failed_communications,
    configuration_required_communications,
    failed_automation_executions,
  ] = await Promise.all([
    headCount(
      supabase.from("leads").select("id", { count: "exact", head: true }).gte("created_at", fromIso).lt("created_at", toIso),
    ),
    headCount(
      supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .gte("updated_at", fromIso)
        .lt("updated_at", toIso)
        .in("pipeline_stage", ["won", "converted"]),
    ),
    headCount(
      supabase
        .from("customers")
        .select("id", { count: "exact", head: true })
        .gte("created_at", fromIso)
        .lt("created_at", toIso)
        .eq("source_channel", "walk_in"),
    ),
    headCount(
      supabase
        .from("applications")
        .select("id", { count: "exact", head: true })
        .gte("created_at", fromIso)
        .lt("created_at", toIso),
    ),
    headCount(
      supabase
        .from("applications")
        .select("id", { count: "exact", head: true })
        .gte("updated_at", fromIso)
        .lt("updated_at", toIso)
        .eq("status", "completed"),
    ),
    headCount(
      supabase
        .from("applications")
        .select("id", { count: "exact", head: true })
        .not("status", "in", '("completed","cancelled","rejected")'),
    ),
    headCount(
      supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .lt("next_follow_up_at", new Date().toISOString())
        .not("pipeline_stage", "in", '("won","lost","converted")'),
    ),
    headCount(
      supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .is("assigned_to", null)
        .not("pipeline_stage", "in", '("won","lost","converted")'),
    ),
    headCount(
      supabase
        .from("applications")
        .select("id", { count: "exact", head: true })
        .is("assigned_agent_id", null)
        .not("status", "in", '("completed","cancelled","rejected")'),
    ),
    headCount(
      supabase
        .from("applications")
        .select("id", { count: "exact", head: true })
        .in("payment_status", ["pending", "unpaid"]),
    ),
    headCount(
      supabase
        .from("whatsapp_messages")
        .select("id", { count: "exact", head: true })
        .eq("status", "failed")
        .gte("failed_at", fromIso)
        .lt("failed_at", toIso),
    ),
    headCount(
      supabase
        .from("whatsapp_messages")
        .select("id", { count: "exact", head: true })
        .eq("status", "configuration_required"),
    ),
    headCount(
      supabase
        .from("crm_automation_events")
        .select("id", { count: "exact", head: true })
        .eq("status", "failed")
        .gte("failed_at", fromIso)
        .lt("failed_at", toIso),
    ),
  ]);

  return {
    new_leads,
    leads_converted,
    walk_in_customers,
    applications_created,
    applications_completed,
    pending_applications,
    overdue_follow_ups,
    unassigned_leads,
    unassigned_applications,
    payments_due,
    failed_communications,
    configuration_required_communications,
    failed_automation_executions,
  };
}
