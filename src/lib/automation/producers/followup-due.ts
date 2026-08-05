import "server-only";

import { emitAutomationEvent } from "@/lib/automation/events";
import { processAutomationEvents } from "@/lib/automation/processor";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type ScanLeadFollowupsDueResult = {
  scanned: number;
  due: number;
  emitted: number;
  skipped: number;
  errors: string[];
};

/**
 * Bounded scheduler/reconciliation scan for lead.followup_due.
 * Does NOT emit at follow-up creation time.
 * Selects scheduled + active follow-ups whose scheduled_at has arrived.
 * Excludes completed, cancelled, rescheduled.
 * Idempotency: follow-up id + scheduled_at (version time).
 * Scanner ownership: emits only automation event.
 * Internal staff/admin alert is produced by automation rule execution (single producer).
 * No customer WhatsApp unless an approved rule exists (none by default).
 * Cron must stay unregistered until explicitly activated.
 */
export async function scanLeadFollowupsDue(input?: {
  batchSize?: number;
  lookbackHours?: number;
  now?: Date;
  dryRun?: boolean;
  processInline?: boolean;
}): Promise<ScanLeadFollowupsDueResult> {
  const summary: ScanLeadFollowupsDueResult = {
    scanned: 0,
    due: 0,
    emitted: 0,
    skipped: 0,
    errors: [],
  };

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    summary.errors.push("supabase_missing");
    return summary;
  }

  const now = input?.now ?? new Date();
  const batchSize = Math.min(100, Math.max(1, input?.batchSize ?? 50));
  const lookbackHours = Math.min(168, Math.max(1, input?.lookbackHours ?? 72));
  const nowIso = now.toISOString();
  const lookbackIso = new Date(now.getTime() - lookbackHours * 3600_000).toISOString();

  // Timezone-safe comparison on stored timestamptz; Asia/Kolkata is presentation only.
  const { data: rows, error } = await supabase
    .from("lead_follow_ups")
    .select("id, lead_id, scheduled_at, status, updated_at")
    .eq("status", "scheduled")
    .lte("scheduled_at", nowIso)
    .gte("scheduled_at", lookbackIso)
    .order("scheduled_at", { ascending: true })
    .limit(batchSize);

  if (error) {
    if (/PGRST205|42P01|does not exist/i.test(error.message)) {
      summary.errors.push("followups_table_missing");
      return summary;
    }
    summary.errors.push("scan_failed");
    return summary;
  }

  for (const row of rows ?? []) {
    summary.scanned += 1;
    summary.due += 1;

    const followUpId = String(row.id);
    const leadId = String(row.lead_id);
    const scheduledAt = String(row.scheduled_at);

    // Re-check status — exclude completed/cancelled/rescheduled under concurrent updates
    const { data: fresh } = await supabase
      .from("lead_follow_ups")
      .select("id, status, scheduled_at, lead_id")
      .eq("id", followUpId)
      .maybeSingle();

    if (!fresh || String(fresh.status) !== "scheduled") {
      summary.skipped += 1;
      continue;
    }

    const { data: lead } = await supabase
      .from("leads")
      .select("id, assigned_to, agent_id, partner_id, pipeline_stage, status")
      .eq("id", leadId)
      .maybeSingle();

    if (!lead) {
      summary.skipped += 1;
      continue;
    }

    // Do not notify for terminal pipeline stages
    const stage = String(lead.pipeline_stage ?? "").toLowerCase();
    if (["won", "lost", "converted"].includes(stage)) {
      summary.skipped += 1;
      continue;
    }

    // Current ownership resolved server-side — never former assignee after reassignment
    const currentAssignee = lead.assigned_to || lead.agent_id || null;

    if (input?.dryRun) continue;

    const emit = await emitAutomationEvent({
      eventType: "lead.followup_due",
      entityType: "lead",
      entityId: leadId,
      actorOrigin: "cron",
      sourceHistoryId: followUpId,
      sourceHistoryTable: "lead_follow_ups",
      idempotencyParts: ["followup_due", followUpId, scheduledAt],
      safeMetadata: {
        follow_up_id: followUpId,
        scheduled_at: scheduledAt,
        assignee_user_id: currentAssignee,
        partner_id: lead.partner_id ? String(lead.partner_id) : null,
        // No customer message body / mobile
      },
    });

    if (!emit.ok) {
      summary.errors.push("emit_failed");
      continue;
    }

    if (emit.deduped) {
      summary.skipped += 1;
      continue;
    }

    summary.emitted += 1;
  }

  if (input?.processInline !== false && summary.emitted > 0) {
    await processAutomationEvents({ batchSize: 10, timeBudgetMs: 8_000 });
  }

  return summary;
}
