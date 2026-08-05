import "server-only";

import { randomUUID } from "crypto";

import { computeBackoffSeconds, isValidOutboxTransition } from "@/lib/communications/comms-core";
import {
  isPromotionalWhatsAppAllowed,
  isTransactionalWhatsAppAllowed,
} from "@/lib/communications/enqueue";
import { getDefaultCommunicationProvider } from "@/lib/communications/provider-adapter";
import { resolveCrmNotificationDeliveryMode } from "@/lib/automation/delivery-mode";
import { emitAutomationEvent } from "@/lib/automation/events";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type ProcessOutboxSummary = {
  claimed: number;
  sent: number;
  retryable: number;
  failed: number;
  configurationRequired: number;
  cancelled: number;
  errors: string[];
  /** Aggregate effective delivery mode — never secrets. */
  deliveryMode: string;
  /** Why processor skipped claiming when not queue. */
  configurationStatus: "ready_queue" | "skip_direct" | "skip_disabled" | "skip_other";
};

/**
 * Process queued communications.
 * Claim via RPC (transaction closes before HTTP). Finalize requires matching processing_owner.
 * Outbox processor owns durable retries — AiSensy HTTP client does not nested-retry.
 */
export async function processCommunicationOutbox(input?: {
  batchSize?: number;
  workerId?: string;
  leaseSeconds?: number;
  timeBudgetMs?: number;
}): Promise<ProcessOutboxSummary> {
  const summary: ProcessOutboxSummary = {
    claimed: 0,
    sent: 0,
    retryable: 0,
    failed: 0,
    configurationRequired: 0,
    cancelled: 0,
    errors: [],
    deliveryMode: "disabled",
    configurationStatus: "skip_disabled",
  };

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    summary.errors.push("supabase_missing");
    return summary;
  }

  // Only the exact `queue` delivery mode owns processor sends (fail closed).
  const deliveryMode = resolveCrmNotificationDeliveryMode();
  summary.deliveryMode = deliveryMode;
  if (deliveryMode !== "queue") {
    summary.configurationStatus =
      deliveryMode === "direct" ? "skip_direct" : deliveryMode === "disabled" ? "skip_disabled" : "skip_other";
    summary.errors.push(`delivery_mode_${deliveryMode}_skip`);
    return summary;
  }
  summary.configurationStatus = "ready_queue";

  const workerId = input?.workerId || `worker-${randomUUID().slice(0, 8)}`;
  const batchSize = Math.min(50, Math.max(1, input?.batchSize ?? 10));
  const started = Date.now();
  const budget = input?.timeBudgetMs ?? 20_000;

  let rows: Array<Record<string, unknown>> = [];
  const claim = await supabase.rpc("claim_communication_outbox", {
    p_batch_size: batchSize,
    p_worker_id: workerId,
    p_lease_seconds: input?.leaseSeconds ?? 120,
  });

  if (claim.error) {
    if (/PGRST202|42883|does not exist|schema cache/i.test(claim.error.message)) {
      rows = await fallbackClaim(supabase, batchSize, workerId);
    } else {
      summary.errors.push("claim_failed");
      return summary;
    }
  } else {
    rows = Array.isArray(claim.data) ? (claim.data as Array<Record<string, unknown>>) : [];
  }

  summary.claimed = rows.length;
  const provider = getDefaultCommunicationProvider();

  for (const row of rows) {
    if (Date.now() - started > budget) break;

    const id = String(row.id);
    const { data: fresh } = await supabase
      .from("whatsapp_messages")
      .select("*")
      .eq("id", id)
      .eq("processing_owner", workerId)
      .maybeSingle();

    if (!fresh) continue;
    if (String(fresh.status) !== "processing") continue;
    if (["cancelled", "suppressed", "delivered", "read", "sent"].includes(String(fresh.status))) {
      continue;
    }

    const customerId = fresh.customer_id ? String(fresh.customer_id) : null;
    const classification = String(fresh.classification ?? "transactional");
    if (classification === "promotional" && customerId) {
      const allowed = await isPromotionalWhatsAppAllowed(customerId);
      if (!allowed) {
        await finalize(supabase, id, workerId, {
          status: "suppressed",
          failure_code: "consent_suppressed",
          failure_summary: "Promotional consent absent or opted out.",
        });
        summary.cancelled += 1;
        continue;
      }
    }
    if (classification === "transactional" && customerId) {
      const allowed = await isTransactionalWhatsAppAllowed(customerId);
      if (!allowed) {
        await finalize(supabase, id, workerId, {
          status: "suppressed",
          failure_code: "transactional_blocked",
          failure_summary: "Transactional WhatsApp disabled for customer.",
        });
        summary.cancelled += 1;
        continue;
      }
    }

    const payload =
      fresh.payload && typeof fresh.payload === "object"
        ? (fresh.payload as Record<string, unknown>)
        : {};
    const templateParams = Array.isArray(payload.template_params)
      ? (payload.template_params as string[])
      : [];
    const userName = String(payload.user_name ?? "Customer");
    const campaignName = String(fresh.template_name ?? "").trim();

    if (!campaignName) {
      await finalize(supabase, id, workerId, {
        status: "failed",
        failure_code: "missing_template",
        failure_summary: "Template/campaign mapping missing.",
        failed_at: new Date().toISOString(),
      });
      summary.failed += 1;
      continue;
    }

    // HTTP outside claim transaction
    const send = await provider.sendTemplate({
      campaignName,
      destination: String(fresh.recipient),
      userName,
      templateParams,
      source: `digiconnect-outbox:${String(fresh.purpose ?? fresh.event_type)}`,
      correlationId: fresh.correlation_id ? String(fresh.correlation_id) : undefined,
    });

    if (send.ok) {
      // API accept → sent (not delivered). provider_status records submitted-like accept.
      if (!isValidOutboxTransition("processing", "sent")) {
        summary.errors.push("invalid_transition");
        continue;
      }
      await finalize(supabase, id, workerId, {
        status: "sent",
        provider_message_id: send.providerMessageId,
        provider_status: "submitted",
        sent_at: new Date().toISOString(),
        failure_code: null,
        failure_summary: null,
        error_message: null,
      });
      summary.sent += 1;
      continue;
    }

    if (send.retryClass === "configuration_required") {
      await finalize(supabase, id, workerId, {
        status: "configuration_required",
        failure_code: send.failureCode,
        failure_summary: send.failureSummary,
        error_message: send.failureSummary,
      });
      summary.configurationRequired += 1;
      await emitAutomationEvent({
        eventType: "communication.failed",
        entityType: "whatsapp_message",
        entityId: id,
        actorOrigin: "system",
        idempotencyParts: ["outbox", id, "configuration_required"],
        safeMetadata: {
          failure_code: "configuration_required",
          application_id: fresh.application_id ? String(fresh.application_id) : null,
        },
      });
      await processAutomationEventsSafe();
      continue;
    }

    const attempts = Number(fresh.attempt_count ?? 1);
    const maxAttempts = Number(fresh.max_attempts ?? 5);
    const failureCode =
      send.failureCode === "timeout" ? "ambiguous_timeout" : send.failureCode;

    if (send.retryClass === "terminal" || attempts >= maxAttempts) {
      await finalize(supabase, id, workerId, {
        status: "failed",
        failure_code: failureCode,
        failure_summary: send.failureSummary,
        error_message: send.failureSummary,
        failed_at: new Date().toISOString(),
      });
      summary.failed += 1;
      // Emit at most one communication.failed per outbox id (idempotent)
      await emitAutomationEvent({
        eventType: "communication.failed",
        entityType: "whatsapp_message",
        entityId: id,
        actorOrigin: "system",
        idempotencyParts: ["outbox", id, "failed", failureCode || "failed"],
        safeMetadata: {
          failure_code: failureCode,
          application_id: fresh.application_id ? String(fresh.application_id) : null,
        },
      });
      await processAutomationEventsSafe();
      continue;
    }

    const backoff = computeBackoffSeconds(attempts);
    const next = new Date(Date.now() + backoff * 1000).toISOString();
    await finalize(supabase, id, workerId, {
      status: "retryable",
      next_attempt_at: next,
      failure_code: failureCode,
      failure_summary: send.failureSummary,
      error_message: send.failureSummary,
    });
    summary.retryable += 1;
  }

  return summary;
}

/** Finalize only if this worker still owns the lease (stale workers cannot overwrite). */
async function finalize(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  id: string,
  workerId: string,
  patch: Record<string, unknown>,
) {
  await supabase
    .from("whatsapp_messages")
    .update({
      ...patch,
      processing_lease_until: null,
      processing_owner: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("processing_owner", workerId)
    .eq("status", "processing");
}

async function fallbackClaim(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  batchSize: number,
  workerId: string,
): Promise<Array<Record<string, unknown>>> {
  const { data } = await supabase
    .from("whatsapp_messages")
    .select("*")
    .in("status", ["queued", "retryable"])
    .order("created_at", { ascending: true })
    .limit(batchSize);

  const claimed: Array<Record<string, unknown>> = [];
  for (const row of data ?? []) {
    if (Number(row.attempt_count ?? 0) >= Number(row.max_attempts ?? 5)) continue;
    const { data: updated } = await supabase
      .from("whatsapp_messages")
      .update({
        status: "processing",
        processing_owner: workerId,
        processing_lease_until: new Date(Date.now() + 120_000).toISOString(),
        attempt_count: Number(row.attempt_count ?? 0) + 1,
        last_attempt_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id)
      .in("status", ["queued", "retryable"])
      .select("*")
      .maybeSingle();
    if (updated) claimed.push(updated as Record<string, unknown>);
  }
  return claimed;
}

async function processAutomationEventsSafe() {
  try {
    const { processAutomationEvents } = await import("@/lib/automation/processor");
    await processAutomationEvents({ batchSize: 3, timeBudgetMs: 4_000 });
  } catch {
    // never recurse alerts into processor crash
  }
}
