import "server-only";

import {
  resolveCrmNotificationDeliveryMode,
} from "@/lib/automation/delivery-mode";
import { emitAutomationEvent, markAutomationEventTerminal } from "@/lib/automation/events";
import { processAutomationEvents } from "@/lib/automation/processor";
import { whatsappEventForStatusChange } from "@/lib/applications/status-machine";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { sendApplicationWhatsApp } from "@/lib/whatsapp/application-notify";
import type { ApplicationWhatsAppEvent } from "@/lib/whatsapp/types";

/**
 * Statuses that must never enqueue customer WhatsApp from automation.
 * Internal ops / assignment markers — customer-visible transitions use whatsappEventForStatusChange.
 */
export const INTERNAL_ONLY_APPLICATION_STATUSES = new Set([
  "assigned_to_agent",
  "internal_hold",
  "draft",
]);

/**
 * Canonical application status-changed producer.
 * Idempotency is based on the status-history row id (not merely applicationId+status text).
 * Re-entering the same status later produces a distinct event only when a distinct history row exists.
 * Partner scope must be enforced by the caller before invoking.
 *
 * Delivery guarantee: at-least-once event discovery + idempotent action.
 * Direct mode marks delivery_handling=direct_handled and sends once — never reconciles into queue.
 * Disabled mode suppresses without sendable queue.
 */
export async function emitApplicationStatusChangedFromHistory(input: {
  applicationId: string;
  statusHistoryId: string;
  oldStatus: string | null;
  newStatus: string;
  actorId?: string | null;
  actorOrigin?: "system" | "admin" | "agency_partner" | "customer" | "webhook" | "cron";
  note?: string | null;
  /** When true, also notify customer per delivery mode if event maps. */
  dispatchCustomerWhatsApp?: boolean;
  recipientMobile?: string | null;
  customerName?: string | null;
  serviceName?: string | null;
  customerId?: string | null;
}): Promise<
  | { ok: true; eventId: string; deduped: boolean; customerNotified: boolean; suppressedInternal: boolean }
  | { ok: false; error: string; status: number }
> {
  if (!input.statusHistoryId) {
    return { ok: false, error: "Missing status history id.", status: 400 };
  }

  const suppressedInternal = INTERNAL_ONLY_APPLICATION_STATUSES.has(
    String(input.newStatus).toLowerCase(),
  );
  const mode = resolveCrmNotificationDeliveryMode();
  const waEvent = suppressedInternal
    ? null
    : whatsappEventForStatusChange(input.oldStatus, input.newStatus);

  let initialStatus: "pending" | "completed" | "suppressed" = "pending";
  let deliveryHandling: string | null = null;
  if (suppressedInternal || !waEvent) {
    initialStatus = "suppressed";
    deliveryHandling = suppressedInternal ? "internal_only_status" : "no_customer_wa_mapping";
  } else if (mode === "disabled") {
    initialStatus = "suppressed";
    deliveryHandling = "configuration_required";
  } else if (mode === "direct") {
    initialStatus = "completed";
    deliveryHandling = "direct_handled";
  } else {
    deliveryHandling = "queue";
  }

  const emit = await emitAutomationEvent({
    eventType: "application.status_changed",
    entityType: "application",
    entityId: input.applicationId,
    actorId: input.actorId,
    actorOrigin: input.actorOrigin ?? "admin",
    sourceHistoryId: input.statusHistoryId,
    sourceHistoryTable: "application_status_logs",
    idempotencyParts: ["status_history", input.statusHistoryId],
    safeMetadata: {
      application_id: input.applicationId,
      old_status: input.oldStatus,
      new_status: input.newStatus,
      internal_only: suppressedInternal,
      whatsapp_event: waEvent,
      version: 1,
      delivery_handling: deliveryHandling,
    },
    initialStatus,
    failureCode:
      initialStatus === "suppressed"
        ? deliveryHandling === "configuration_required"
          ? "configuration_required"
          : "internal_only_status"
        : null,
    failureSummary:
      initialStatus === "suppressed" ? "No customer send for this status transition." : null,
    completedAt: initialStatus === "completed",
  });

  if (!emit.ok) return { ok: false, error: emit.error, status: emit.status };

  let customerNotified = false;
  if (
    !suppressedInternal &&
    input.dispatchCustomerWhatsApp &&
    waEvent &&
    input.recipientMobile &&
    mode !== "disabled"
  ) {
    if (mode === "direct") {
      await sendApplicationWhatsApp({
        applicationId: input.applicationId,
        eventType: waEvent as ApplicationWhatsAppEvent,
        recipientMobile: input.recipientMobile,
        customerName: input.customerName || "Customer",
        serviceName: input.serviceName || "Service",
        status: input.newStatus,
        notes: input.note || undefined,
        customerId: input.customerId,
        correlationId: emit.id,
      });
      customerNotified = true;
      if (!emit.deduped) {
        await markAutomationEventTerminal(emit.id, {
          status: "completed",
          resultCode: "direct_handled",
        });
      }
    } else if (mode === "queue") {
      // Rules enqueue from the pending event — process inline; never AiSensy here.
      await processAutomationEvents({ batchSize: 5, timeBudgetMs: 8_000 });
      customerNotified = true;
    }
  }

  return {
    ok: true,
    eventId: emit.id,
    deduped: emit.deduped,
    customerNotified,
    suppressedInternal,
  };
}

/**
 * Reconciliation by status-history ids — does not invent status changes.
 * Skips creating sendable work when existing event is direct_handled / suppressed.
 */
export async function reconcileApplicationStatusEvents(input?: {
  lookbackHours?: number;
  batchSize?: number;
  dryRun?: boolean;
}): Promise<{ scanned: number; inserted: number; skipped: number; errors: string[] }> {
  const summary = { scanned: 0, inserted: 0, skipped: 0, errors: [] as string[] };
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    summary.errors.push("supabase_missing");
    return summary;
  }

  const lookbackHours = Math.min(168, Math.max(1, input?.lookbackHours ?? 48));
  const batchSize = Math.min(100, Math.max(1, input?.batchSize ?? 50));
  const since = new Date(Date.now() - lookbackHours * 3600_000).toISOString();

  const { data: rows, error } = await supabase
    .from("application_status_logs")
    .select("id, application_id, old_status, new_status, actor_id, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: true })
    .limit(batchSize);

  if (error) {
    summary.errors.push("scan_failed");
    return summary;
  }

  for (const row of rows ?? []) {
    summary.scanned += 1;
    if (input?.dryRun) continue;

    const result = await emitApplicationStatusChangedFromHistory({
      applicationId: String(row.application_id),
      statusHistoryId: String(row.id),
      oldStatus: row.old_status != null ? String(row.old_status) : null,
      newStatus: String(row.new_status),
      actorId: row.actor_id ? String(row.actor_id) : null,
      actorOrigin: "cron",
      dispatchCustomerWhatsApp: false,
    });

    if (!result.ok) {
      summary.errors.push("emit_failed");
      continue;
    }
    if (result.deduped) summary.skipped += 1;
    else summary.inserted += 1;
  }

  return summary;
}

/** Call-site coverage contract — status mutation paths that must use history-based producer. */
export const APPLICATION_STATUS_PRODUCER_CALL_SITES = [
  "src/app/api/admin/applications/[id]/route.ts",
  "src/lib/crm/walk-in-application.ts",
  "src/lib/crm/lead-convert.ts",
  "src/lib/whatsapp-automation.ts",
] as const;
