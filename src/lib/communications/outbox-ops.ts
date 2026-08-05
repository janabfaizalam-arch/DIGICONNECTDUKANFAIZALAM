import "server-only";

import { randomUUID } from "crypto";

import { maskMobile, isCancelEligibleStatus, isRetryEligibleStatus, purposeClassification } from "@/lib/communications/comms-core";
import { processCommunicationOutbox } from "@/lib/communications/processor";
import { enqueueCommunication } from "@/lib/communications/enqueue";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type OutboxListFilters = {
  status?: string | null;
  purpose?: string | null;
  channel?: string | null;
  q?: string | null;
  from?: string | null;
  to?: string | null;
  page?: number;
  pageSize?: number;
};

export type OutboxListItem = {
  id: string;
  status: string;
  purpose: string | null;
  eventType: string;
  channel: string;
  classification: string;
  recipientMasked: string;
  applicationId: string | null;
  customerId: string | null;
  leadId: string | null;
  attemptCount: number;
  maxAttempts: number;
  failureCode: string | null;
  failureSummary: string | null;
  providerStatus: string | null;
  nextAttemptAt: string | null;
  createdAt: string;
  sentAt: string | null;
  correlationId: string | null;
};

/**
 * Admin outbox list — masks recipients; never returns full provider payloads or secrets.
 */
export async function listCommunicationOutbox(filters: OutboxListFilters): Promise<{
  ok: true;
  items: OutboxListItem[];
  total: number;
  page: number;
  pageSize: number;
  counts: Record<string, number>;
} | { ok: false; error: string; status: number }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: "Service unavailable.", status: 503 };

  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, filters.pageSize ?? 25));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("whatsapp_messages")
    .select(
      "id, status, purpose, event_type, channel, classification, recipient, application_id, customer_id, lead_id, attempt_count, max_attempts, failure_code, failure_summary, provider_status, next_attempt_at, created_at, sent_at, correlation_id",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }
  if (filters.purpose) query = query.eq("purpose", filters.purpose);
  if (filters.channel) query = query.eq("channel", filters.channel);
  if (filters.from) query = query.gte("created_at", filters.from);
  if (filters.to) query = query.lte("created_at", filters.to);
  if (filters.q?.trim()) {
    const q = filters.q.trim();
    // Search by business reference only (uuid-ish / event), not full phone dump.
    query = query.or(
      `application_id.eq.${q},customer_id.eq.${q},lead_id.eq.${q},idempotency_key.ilike.%${q}%,correlation_id.eq.${q}`,
    );
  }

  const { data, error, count } = await query;
  if (error) {
    if (/PGRST205|42P01|does not exist|schema cache/i.test(error.message)) {
      return { ok: false, error: "Database upgrade required for communication outbox.", status: 503 };
    }
    console.error("[comms-ops] list_failed", { code: "list_failed" });
    return { ok: false, error: "Could not load communications.", status: 500 };
  }

  const counts: Record<string, number> = {};
  const { data: statusRows } = await supabase.from("whatsapp_messages").select("status");
  for (const row of statusRows ?? []) {
    const s = String((row as { status?: string }).status ?? "unknown");
    counts[s] = (counts[s] ?? 0) + 1;
  }

  const items: OutboxListItem[] = (data ?? []).map((row) => ({
    id: String(row.id),
    status: String(row.status),
    purpose: row.purpose ? String(row.purpose) : null,
    eventType: String(row.event_type),
    channel: String(row.channel ?? "whatsapp"),
    classification: String(row.classification ?? "transactional"),
    recipientMasked: maskMobile(String(row.recipient ?? "")),
    applicationId: row.application_id ? String(row.application_id) : null,
    customerId: row.customer_id ? String(row.customer_id) : null,
    leadId: row.lead_id ? String(row.lead_id) : null,
    attemptCount: Number(row.attempt_count ?? 0),
    maxAttempts: Number(row.max_attempts ?? 5),
    failureCode: row.failure_code ? String(row.failure_code) : null,
    failureSummary: row.failure_summary
      ? String(row.failure_summary)
      : null,
    providerStatus: row.provider_status ? String(row.provider_status) : null,
    nextAttemptAt: row.next_attempt_at ? String(row.next_attempt_at) : null,
    createdAt: String(row.created_at),
    sentAt: row.sent_at ? String(row.sent_at) : null,
    correlationId: row.correlation_id ? String(row.correlation_id) : null,
  }));

  return {
    ok: true,
    items,
    total: count ?? items.length,
    page,
    pageSize,
    counts,
  };
}

/** Manual retry — reuses the same outbox record (does not invent a new event). */
export async function retryCommunicationOutbox(input: {
  outboxId: string;
  actorId: string;
  reason?: string;
}): Promise<{ ok: true; id: string; summary: Awaited<ReturnType<typeof processCommunicationOutbox>> } | { ok: false; error: string; status: number }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: "Service unavailable.", status: 503 };

  const { data: row } = await supabase
    .from("whatsapp_messages")
    .select("id, status, attempt_count, max_attempts, recipient, template_name")
    .eq("id", input.outboxId)
    .maybeSingle();

  if (!row) return { ok: false, error: "Message not found.", status: 404 };

  const status = String(row.status);
  if (!isRetryEligibleStatus(status) || ["sent", "delivered", "read", "cancelled", "suppressed"].includes(status)) {
    return { ok: false, error: `Cannot retry message in status ${status}.`, status: 409 };
  }
  if (Number(row.attempt_count ?? 0) >= Number(row.max_attempts ?? 5)) {
    return { ok: false, error: "Maximum attempts reached.", status: 409 };
  }

  const correlationId = randomUUID();
  // Authorized recovery: configuration_required|failed|retryable|processing → queued
  const { data: updated, error: updateError } = await supabase
    .from("whatsapp_messages")
    .update({
      status: "queued",
      next_attempt_at: new Date().toISOString(),
      processing_lease_until: null,
      processing_owner: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.outboxId)
    .in("status", ["queued", "retryable", "failed", "configuration_required", "processing"])
    .select("id")
    .maybeSingle();

  if (updateError || !updated) {
    return { ok: false, error: "Retry conflict — state changed.", status: 409 };
  }

  await writeOpsAudit(supabase, {
    outboxId: input.outboxId,
    action: "retry",
    actorId: input.actorId,
    reason: input.reason ?? "manual_retry",
    correlationId,
  });

  // Process a small batch; preferred record is now queued and eligible.
  const summary = await processCommunicationOutbox({ batchSize: 5, timeBudgetMs: 12_000 });
  return { ok: true, id: input.outboxId, summary };
}

export async function cancelCommunicationOutbox(input: {
  outboxId: string;
  actorId: string;
  reason: string;
}): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: "Service unavailable.", status: 503 };

  const reason = input.reason.trim();
  if (reason.length < 3) return { ok: false, error: "Cancel reason required.", status: 400 };

  const { data: row } = await supabase
    .from("whatsapp_messages")
    .select("id, status")
    .eq("id", input.outboxId)
    .maybeSingle();

  if (!row) return { ok: false, error: "Message not found.", status: 404 };
  if (!isCancelEligibleStatus(String(row.status))) {
    return { ok: false, error: `Cannot cancel message in status ${row.status}.`, status: 409 };
  }

  const correlationId = randomUUID();
  const { data: updated, error } = await supabase
    .from("whatsapp_messages")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancelled_by: input.actorId,
      cancel_reason: reason.slice(0, 500),
      processing_lease_until: null,
      processing_owner: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.outboxId)
    .in("status", ["queued", "retryable", "processing", "configuration_required", "failed", "suppressed"])
    .select("id")
    .maybeSingle();

  if (error || !updated) return { ok: false, error: "Could not cancel message.", status: 409 };

  await writeOpsAudit(supabase, {
    outboxId: input.outboxId,
    action: "cancel",
    actorId: input.actorId,
    reason,
    correlationId,
  });

  return { ok: true };
}

/**
 * Explicit resend as a NEW communication — requires authorized new event identity.
 * Does not reuse the prior idempotency key.
 */
export async function explicitResendCommunication(input: {
  sourceOutboxId: string;
  actorId: string;
  reason: string;
  newEventId: string;
}): Promise<
  | { ok: true; id: string; deduped: boolean }
  | { ok: false; error: string; status: number; code?: string }
> {
  const reason = input.reason.trim();
  const newEventId = input.newEventId.trim();
  if (reason.length < 5) return { ok: false, error: "Resend reason required (min 5 chars).", status: 400 };
  if (newEventId.length < 8) {
    return { ok: false, error: "Authorized new event identity required.", status: 400, code: "event_required" };
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: "Service unavailable.", status: 503 };

  const { data: source } = await supabase
    .from("whatsapp_messages")
    .select("*")
    .eq("id", input.sourceOutboxId)
    .maybeSingle();

  if (!source) return { ok: false, error: "Source message not found.", status: 404 };

  // Eligible originals only — do not invent destinations/templates from the browser.
  const sourceStatus = String(source.status ?? "");
  if (["cancelled", "suppressed"].includes(sourceStatus)) {
    return { ok: false, error: `Cannot explicit-resend from status ${sourceStatus}.`, status: 409 };
  }
  if (!source.recipient || !source.template_name) {
    return { ok: false, error: "Source record missing server recipient or template.", status: 409 };
  }

  const payload =
    source.payload && typeof source.payload === "object"
      ? (source.payload as Record<string, unknown>)
      : {};

  const purpose = String(source.purpose ?? source.event_type ?? "manual_resend");
  const enqueued = await enqueueCommunication({
    purpose,
    channel: (source.channel as "whatsapp" | "internal_alert") || "whatsapp",
    recipientMobile: String(source.recipient),
    customerId: source.customer_id ? String(source.customer_id) : null,
    applicationId: source.application_id ? String(source.application_id) : null,
    leadId: source.lead_id ? String(source.lead_id) : null,
    eventKeyParts: ["explicit_resend", String(source.id), newEventId],
    templateParams: Array.isArray(payload.template_params)
      ? (payload.template_params as string[])
      : [],
    userName: String(payload.user_name ?? "Customer"),
    campaignName: String(source.template_name),
    // Server-mapped classification — ignore any client attempt to relabel
    classification: purposeClassification(purpose),
    consentBasis: "manual_authorized_resend",
    createdBy: input.actorId,
    correlationId: randomUUID(),
    safePayload: { source_outbox_id: source.id, resend_reason: reason.slice(0, 200) },
  });

  if (!enqueued.ok) {
    return { ok: false, error: enqueued.error, status: enqueued.status, code: enqueued.code };
  }

  await writeOpsAudit(supabase, {
    outboxId: enqueued.id,
    action: "explicit_resend",
    actorId: input.actorId,
    reason,
    correlationId: newEventId,
    safeMetadata: { source_outbox_id: source.id },
  });

  return { ok: true, id: enqueued.id, deduped: enqueued.deduped };
}

async function writeOpsAudit(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  input: {
    outboxId: string;
    action: "retry" | "cancel" | "explicit_resend";
    actorId: string;
    reason: string;
    correlationId: string;
    safeMetadata?: Record<string, unknown>;
  },
) {
  const { error } = await supabase.from("communication_ops_audit").insert({
    outbox_id: input.outboxId,
    action: input.action,
    actor_id: input.actorId,
    reason: input.reason.slice(0, 500),
    correlation_id: input.correlationId,
    safe_metadata: input.safeMetadata ?? {},
  });
  if (error && !/PGRST205|42P01|does not exist|schema cache/i.test(error.message)) {
    console.error("[comms-ops] audit_failed", { code: "audit_failed" });
  }
}
