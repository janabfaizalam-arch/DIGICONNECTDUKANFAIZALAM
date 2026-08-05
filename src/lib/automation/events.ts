import "server-only";

import { randomUUID } from "crypto";

import {
  buildAutomationEventIdempotencyKey,
  isAllowedAutomationEventType,
  type AutomationEventType,
} from "@/lib/automation/events-core";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type EmitAutomationEventInput = {
  eventType: AutomationEventType;
  entityType: string;
  entityId: string;
  actorId?: string | null;
  actorOrigin?: "system" | "admin" | "agency_partner" | "customer" | "webhook" | "cron";
  sourceHistoryId?: string | null;
  sourceHistoryTable?: string | null;
  correlationId?: string | null;
  /** Safe metadata only — no PIN/OTP/secrets/documents/full records */
  safeMetadata?: Record<string, unknown>;
  /** Deterministic key parts after eventType */
  idempotencyParts: string[];
  /**
   * Optional initial status. Use `completed` for direct_handled and `suppressed`
   * for configuration-required so claim RPCs never pick the row for enqueue.
   */
  initialStatus?: "pending" | "completed" | "suppressed";
  failureCode?: string | null;
  failureSummary?: string | null;
  completedAt?: boolean;
};

export type EmitAutomationEventResult =
  | { ok: true; id: string; deduped: boolean; status: string }
  | { ok: false; error: string; status: number; code?: string };

/**
 * Idempotent automation event insert. Never stores secrets/PIN/OTP/document content.
 * Does not call AiSensy. Ordinary roles cannot invent event types via this API.
 */
export async function emitAutomationEvent(
  input: EmitAutomationEventInput,
): Promise<EmitAutomationEventResult> {
  if (!isAllowedAutomationEventType(input.eventType)) {
    return { ok: false, error: "Unsupported event type.", status: 400, code: "invalid_event_type" };
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: "Service unavailable.", status: 503 };

  const idempotencyKey = buildAutomationEventIdempotencyKey([
    input.eventType,
    ...input.idempotencyParts,
  ]);

  const { data: existing } = await supabase
    .from("crm_automation_events")
    .select("id, status")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (existing) {
    return {
      ok: true,
      id: String(existing.id),
      deduped: true,
      status: String(existing.status),
    };
  }

  const now = new Date().toISOString();
  const initialStatus = input.initialStatus ?? "pending";
  const claimable = initialStatus === "pending";
  const { data: row, error } = await supabase
    .from("crm_automation_events")
    .insert({
      event_type: input.eventType,
      entity_type: input.entityType,
      entity_id: input.entityId,
      actor_id: input.actorId ?? null,
      actor_origin: input.actorOrigin ?? "system",
      source_history_id: input.sourceHistoryId ?? null,
      source_history_table: input.sourceHistoryTable ?? null,
      correlation_id: input.correlationId ?? randomUUID(),
      safe_metadata: sanitizeSafeMetadata(input.safeMetadata),
      idempotency_key: idempotencyKey,
      status: initialStatus,
      next_attempt_at: claimable ? now : null,
      failure_code: input.failureCode ?? null,
      failure_summary: input.failureSummary ?? null,
      completed_at: input.completedAt || initialStatus === "completed" ? now : null,
      created_at: now,
      updated_at: now,
    })
    .select("id, status")
    .maybeSingle();

  if (error) {
    if (/duplicate|unique/i.test(error.message)) {
      const { data: again } = await supabase
        .from("crm_automation_events")
        .select("id, status")
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();
      if (again) {
        return { ok: true, id: String(again.id), deduped: true, status: String(again.status) };
      }
    }
    if (/PGRST205|42P01|does not exist|schema cache/i.test(error.message)) {
      return {
        ok: false,
        error: "Database upgrade required for automation events.",
        status: 503,
        code: "upgrade_required",
      };
    }
    console.error("[automation-emit] failed", { code: "emit_failed" });
    return { ok: false, error: "Could not emit automation event.", status: 500 };
  }

  return { ok: true, id: String(row?.id), deduped: false, status: String(row?.status ?? "pending") };
}

/**
 * Mark an already-inserted event as terminal so claim/reconcile cannot enqueue later.
 * Does not change event type / entity / recipient — execution semantics only.
 */
export async function markAutomationEventTerminal(
  eventId: string,
  input: {
    status: "completed" | "suppressed" | "cancelled" | "failed";
    failureCode?: string | null;
    failureSummary?: string | null;
    resultCode?: string | null;
  },
): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;
  const now = new Date().toISOString();
  const { data: existing } = await supabase
    .from("crm_automation_events")
    .select("id, safe_metadata, status")
    .eq("id", eventId)
    .maybeSingle();
  if (!existing) return;
  // Do not reopen completed/suppressed/cancelled via this helper
  if (["completed", "suppressed", "cancelled"].includes(String(existing.status))) return;

  const meta = {
    ...((existing.safe_metadata as Record<string, unknown> | null) ?? {}),
    ...(input.resultCode ? { delivery_handling: input.resultCode } : {}),
  };

  await supabase
    .from("crm_automation_events")
    .update({
      status: input.status,
      failure_code: input.failureCode ?? null,
      failure_summary: input.failureSummary ?? null,
      safe_metadata: meta,
      next_attempt_at: null,
      processing_owner: null,
      processing_lease_until: null,
      completed_at: input.status === "completed" || input.status === "suppressed" ? now : null,
      updated_at: now,
    })
    .eq("id", eventId)
    .in("status", ["pending", "processing", "retryable"]);
}

function sanitizeSafeMetadata(meta: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!meta) return {};
  const blocked = /pin|otp|password|secret|token|authorization|api[_-]?key|document_content|signed_url|provider_response/i;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (blocked.test(k)) continue;
    if (typeof v === "string" && v.length > 200) {
      out[k] = v.slice(0, 200);
      continue;
    }
    if (v != null && typeof v === "object") continue; // no nested records
    out[k] = v;
  }
  return out;
}
