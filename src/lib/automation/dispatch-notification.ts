import "server-only";

import { randomUUID } from "crypto";

import {
  resolveCrmNotificationDeliveryModeDetailed,
} from "@/lib/automation/delivery-mode";
import { emitAutomationEvent, markAutomationEventTerminal } from "@/lib/automation/events";
import type { AutomationEventType } from "@/lib/automation/events-core";
import { processAutomationEvents } from "@/lib/automation/processor";
import {
  sendApplicationWhatsApp,
  type SendApplicationWhatsAppInput,
  type SendApplicationWhatsAppResult,
} from "@/lib/whatsapp/application-notify";
import type { ApplicationWhatsAppEvent } from "@/lib/whatsapp/types";

export type DispatchApplicationNotificationInput = SendApplicationWhatsAppInput & {
  automationEventType?: AutomationEventType;
  sourceHistoryId?: string | null;
  sourceHistoryTable?: string | null;
  actorId?: string | null;
  actorOrigin?: "system" | "admin" | "agency_partner" | "customer" | "webhook" | "cron";
  /** Process matching rules inline after emit (queue mode only; no AiSensy). */
  processRulesInline?: boolean;
};

const EVENT_TYPE_TO_AUTOMATION: Partial<Record<ApplicationWhatsAppEvent, AutomationEventType>> = {
  application_submitted: "application.created",
  payment_pending: "application.payment_due",
  payment_success: "application.payment_received",
  payment_reminder: "application.payment_due",
  documents_required: "application.document_required",
  documents_received: "application.document_uploaded",
  processing_started: "application.status_changed",
  under_review: "application.status_changed",
  progress_update: "application.status_changed",
  objection: "application.status_changed",
  objection_resolved: "application.status_changed",
  completed: "application.completed",
  final_document: "application.completed",
};

/**
 * Central non-OTP CRM notification dispatch.
 * Browser cannot choose delivery mode.
 *
 * Fail-closed:
 * - queue  → emit automation event (+ optional inline rule processing → enqueue only). Never AiSensy.
 * - direct → send in-process once; mark event completed/direct_handled (never enqueue claimable duplicate).
 * - disabled / unset / invalid → suppressed/configuration-required audit only; never AiSensy; never sendable queue.
 *
 * OTP must not use this function — OTP does not use CRM_NOTIFICATION_DELIVERY_MODE.
 */
export async function dispatchApplicationNotification(
  input: DispatchApplicationNotificationInput,
): Promise<SendApplicationWhatsAppResult & { deliveryMode?: string; deliveryReason?: string }> {
  const detailed = resolveCrmNotificationDeliveryModeDetailed();
  const mode = detailed.mode;
  const requestId = input.correlationId || randomUUID();

  const automationType =
    input.automationEventType ||
    EVENT_TYPE_TO_AUTOMATION[input.eventType] ||
    "application.status_changed";
  const version = input.version ?? 1;
  const idempotencyParts = [
    input.applicationId,
    input.eventType,
    String(version),
    input.sourceHistoryId || "no-history",
  ];
  const safeMetadata = {
    whatsapp_event: input.eventType,
    version,
    application_id: input.applicationId,
    status: input.status ?? null,
    notes: input.notes ? String(input.notes).slice(0, 120) : null,
  };

  if (mode === "disabled") {
    if (detailed.failClosed && detailed.reason === "unknown") {
      console.warn("[crm-delivery] unknown_mode_fail_closed", {
        reason: detailed.reason,
        rawLength: detailed.rawLength,
      });
    }
    const emit = await emitAutomationEvent({
      eventType: automationType,
      entityType: "application",
      entityId: input.applicationId,
      actorId: input.actorId,
      actorOrigin: input.actorOrigin ?? "system",
      sourceHistoryId: input.sourceHistoryId,
      sourceHistoryTable: input.sourceHistoryTable,
      correlationId: requestId,
      idempotencyParts,
      safeMetadata: {
        ...safeMetadata,
        delivery_handling: "configuration_required",
        delivery_mode_reason: detailed.reason,
      },
      initialStatus: "suppressed",
      failureCode: "configuration_required",
      failureSummary: "CRM notifications disabled or misconfigured — no send.",
    });
    // Auditable non-claimable outbox row (suppressed / configuration_required)
    const skip = await sendApplicationWhatsApp(input);
    return {
      ...skip,
      deliveryMode: mode,
      deliveryReason: detailed.reason,
      messageId: emit.ok ? emit.id : (skip.messageId ?? null),
    };
  }

  if (mode === "direct") {
    // Record intentional direct handling BEFORE send so reconciliation never treats
    // a missing queued row as incomplete delivery.
    const emit = await emitAutomationEvent({
      eventType: automationType,
      entityType: "application",
      entityId: input.applicationId,
      actorId: input.actorId,
      actorOrigin: input.actorOrigin ?? "system",
      sourceHistoryId: input.sourceHistoryId,
      sourceHistoryTable: input.sourceHistoryTable,
      correlationId: requestId,
      idempotencyParts,
      safeMetadata: {
        ...safeMetadata,
        delivery_handling: "direct_handled",
      },
      initialStatus: "completed",
      failureCode: null,
      failureSummary: null,
      completedAt: true,
    });
    if (emit.ok && !emit.deduped) {
      await markAutomationEventTerminal(emit.id, {
        status: "completed",
        failureCode: null,
        failureSummary: null,
        resultCode: "direct_handled",
      });
    } else if (emit.ok && emit.deduped && emit.status === "completed") {
      // Already handled — do not send again on idempotent retry of emit;
      // still allow sendApplicationWhatsApp to dedupe on outbox key.
    }
    const result = await sendApplicationWhatsApp(input);
    return { ...result, deliveryMode: mode, deliveryReason: detailed.reason };
  }

  // queue mode — emit pending; optionally process rules inline (enqueue only; never AiSensy here)
  const emit = await emitAutomationEvent({
    eventType: automationType,
    entityType: "application",
    entityId: input.applicationId,
    actorId: input.actorId,
    actorOrigin: input.actorOrigin ?? "system",
    sourceHistoryId: input.sourceHistoryId,
    sourceHistoryTable: input.sourceHistoryTable,
    correlationId: requestId,
    idempotencyParts,
    safeMetadata: {
      ...safeMetadata,
      delivery_handling: "queue",
    },
  });

  if (!emit.ok && emit.code !== "upgrade_required") {
    return {
      ok: false,
      code: "queued",
      error: emit.error,
      requestId,
      queued: true,
      deliveryMode: mode,
      deliveryReason: detailed.reason,
    };
  }

  if (input.processRulesInline !== false) {
    await processAutomationEvents({ batchSize: 5, timeBudgetMs: 8_000 });
  }

  return {
    ok: false,
    code: "queued",
    error: "WhatsApp queued for outbox processor.",
    requestId,
    messageId: null,
    queued: true,
    deliveryMode: mode,
    deliveryReason: detailed.reason,
  };
}
