import "server-only";

import { emitAutomationEvent } from "@/lib/automation/events";
import { processAutomationEvents } from "@/lib/automation/processor";
import { resolveCrmNotificationDeliveryMode } from "@/lib/automation/delivery-mode";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * Reconciliation: scan recent applications missing automation.created events.
 *
 * Delivery guarantee (honest): at-least-once event discovery + idempotent action.
 * - Does not resend completed outbox.
 * - Does not create OTP/PIN events.
 * - Does not invent sendable work when an existing event is direct_handled / suppressed.
 * - In direct mode, missing queued rows are NOT treated as incomplete delivery.
 * - Disabled mode remains non-sending (rules require delivery_mode=queue).
 *
 * Inactive until called by protected admin/cron (unregistered).
 */
export async function reconcileMissingApplicationCreatedEvents(input?: {
  lookbackHours?: number;
  batchSize?: number;
  dryRun?: boolean;
}): Promise<{
  scanned: number;
  missing: number;
  inserted: number;
  skipped: number;
  errors: string[];
}> {
  const summary = { scanned: 0, missing: 0, inserted: 0, skipped: 0, errors: [] as string[] };
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    summary.errors.push("supabase_missing");
    return summary;
  }

  const mode = resolveCrmNotificationDeliveryMode();
  const lookbackHours = Math.min(168, Math.max(1, input?.lookbackHours ?? 24));
  const batchSize = Math.min(100, Math.max(1, input?.batchSize ?? 50));
  const since = new Date(Date.now() - lookbackHours * 3600_000).toISOString();

  const { data: apps, error } = await supabase
    .from("applications")
    .select("id, created_at, customer_id, application_source, source")
    .gte("created_at", since)
    .order("created_at", { ascending: true })
    .limit(batchSize);

  if (error) {
    summary.errors.push("scan_failed");
    return summary;
  }

  for (const app of apps ?? []) {
    summary.scanned += 1;
    const { data: existing } = await supabase
      .from("crm_automation_events")
      .select("id, status, safe_metadata")
      .eq("event_type", "application.created")
      .eq("entity_id", app.id)
      .limit(1)
      .maybeSingle();

    if (existing) {
      // Direct-handled / suppressed: never reconcile into a queued duplicate
      const handling = String(
        (existing.safe_metadata as Record<string, unknown> | null)?.delivery_handling ?? "",
      );
      if (
        handling === "direct_handled" ||
        handling === "configuration_required" ||
        ["completed", "suppressed", "cancelled"].includes(String(existing.status))
      ) {
        summary.skipped += 1;
        continue;
      }
      summary.skipped += 1;
      continue;
    }

    summary.missing += 1;
    if (input?.dryRun) continue;

    // Emit pending only; queue processor/rules own enqueue when mode===queue.
    // Never fall back to direct send from reconciliation.
    const emit = await emitAutomationEvent({
      eventType: "application.created",
      entityType: "application",
      entityId: String(app.id),
      actorOrigin: "cron",
      idempotencyParts: [String(app.id), "application_submitted", "1", "reconcile"],
      safeMetadata: {
        whatsapp_event: "application_submitted",
        version: 1,
        application_id: app.id,
        reconciled: true,
        delivery_handling: mode === "disabled" ? "configuration_required" : "queue",
        source: app.application_source || app.source || null,
      },
      initialStatus: mode === "disabled" ? "suppressed" : "pending",
      failureCode: mode === "disabled" ? "configuration_required" : null,
      failureSummary: mode === "disabled" ? "Reconcile under disabled mode — no send." : null,
    });

    if (emit.ok && !emit.deduped) summary.inserted += 1;
    else if (emit.ok) summary.skipped += 1;
    else summary.errors.push("emit_failed");
  }

  if (!input?.dryRun && summary.inserted > 0 && mode === "queue") {
    await processAutomationEvents({ batchSize: 10, timeBudgetMs: 10_000 });
  }

  return summary;
}
