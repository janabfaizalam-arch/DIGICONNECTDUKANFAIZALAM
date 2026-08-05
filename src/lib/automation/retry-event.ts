import "server-only";

import { resolveCrmNotificationDeliveryMode } from "@/lib/automation/delivery-mode";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * Authorized admin retry of a failed/retryable automation event.
 * Requires caller to have checked automation.retry.
 * Does not allow changing event type, entity, recipient, rule, or action from the browser.
 * Does not bypass consent or delivery mode.
 */
export async function retryAutomationEvent(input: {
  eventId: string;
  actorId: string;
  reason: string;
}): Promise<
  | { ok: true; deduped: boolean; status: string }
  | { ok: false; error: string; status: number }
> {
  const reason = String(input.reason ?? "").trim();
  if (reason.length < 3) {
    return { ok: false, error: "A retry reason is required.", status: 400 };
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: "Service unavailable.", status: 503 };

  const { data: event } = await supabase
    .from("crm_automation_events")
    .select("*")
    .eq("id", input.eventId)
    .maybeSingle();

  if (!event) return { ok: false, error: "Event not found.", status: 404 };

  const status = String(event.status);
  if (["completed", "cancelled", "suppressed"].includes(status)) {
    return { ok: false, error: `Cannot retry ${status} events.`, status: 409 };
  }
  if (!["failed", "retryable"].includes(status)) {
    return { ok: false, error: "Only failed or retryable events may be retried.", status: 409 };
  }

  // Delivery mode still applies on next processing — never force queue/direct from retry.
  const mode = resolveCrmNotificationDeliveryMode();
  void mode;

  const now = new Date().toISOString();
  const attempts = Number(event.attempt_count ?? 0);
  const { data: updated, error } = await supabase
    .from("crm_automation_events")
    .update({
      status: "pending",
      next_attempt_at: now,
      processing_owner: null,
      processing_lease_until: null,
      failure_code: null,
      failure_summary: null,
      attempt_count: attempts,
      updated_at: now,
      safe_metadata: {
        ...((event.safe_metadata as Record<string, unknown> | null) ?? {}),
        last_retry_by: input.actorId,
        last_retry_at: now,
        last_retry_reason: reason.slice(0, 200),
        retry_version: Number(
          ((event.safe_metadata as Record<string, unknown> | null)?.retry_version as number) ?? 0,
        ) + 1,
      },
    })
    .eq("id", input.eventId)
    .in("status", ["failed", "retryable"])
    .select("id, status")
    .maybeSingle();

  if (error || !updated) {
    // Concurrent double-click: already pending/processing
    const { data: again } = await supabase
      .from("crm_automation_events")
      .select("id, status")
      .eq("id", input.eventId)
      .maybeSingle();
    if (again && ["pending", "processing"].includes(String(again.status))) {
      return { ok: true, deduped: true, status: String(again.status) };
    }
    return { ok: false, error: "Could not retry event.", status: 409 };
  }

  return { ok: true, deduped: false, status: String(updated.status) };
}
