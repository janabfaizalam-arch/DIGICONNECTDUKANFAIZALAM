import "server-only";

import {
  buildAlertIdempotencyKey,
  type OpsAlertType,
} from "@/lib/automation/events-core";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type CreateOpsAlertInput = {
  alertType: OpsAlertType | string;
  severity?: "info" | "warning" | "critical";
  title: string;
  safeSummary: string;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  sourceEventId?: string | null;
  idempotencyParts: string[];
};

/**
 * Idempotent admin ops alert. Never stores secrets/message bodies/PIN/OTP.
 * Does not emit communication.failed about itself (callers must not recurse).
 */
export async function createOpsAlert(
  input: CreateOpsAlertInput,
): Promise<{ ok: true; id: string; deduped: boolean } | { ok: false; error: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: "Service unavailable." };

  // Recursion guard: never create communication_failed from an alert about alerts
  if (
    input.alertType === "communication_failed" &&
    input.relatedEntityType === "crm_ops_alert"
  ) {
    return { ok: false, error: "Recursive alert blocked." };
  }

  const idempotencyKey = buildAlertIdempotencyKey([
    input.alertType,
    ...input.idempotencyParts,
  ]);

  const { data: existing } = await supabase
    .from("crm_ops_alerts")
    .select("id")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (existing) return { ok: true, id: String(existing.id), deduped: true };

  const { data, error } = await supabase
    .from("crm_ops_alerts")
    .insert({
      alert_type: input.alertType,
      severity: input.severity ?? "warning",
      title: input.title.slice(0, 200),
      safe_summary: input.safeSummary.slice(0, 500),
      related_entity_type: input.relatedEntityType ?? null,
      related_entity_id: input.relatedEntityId ?? null,
      source_event_id: input.sourceEventId ?? null,
      status: "open",
      idempotency_key: idempotencyKey,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    if (/duplicate|unique/i.test(error.message)) {
      return { ok: true, id: "", deduped: true };
    }
    if (/PGRST205|42P01|does not exist/i.test(error.message)) {
      return { ok: false, error: "upgrade_required" };
    }
    console.error("[ops-alert] insert_failed", { code: "alert_insert_failed" });
    return { ok: false, error: "insert_failed" };
  }

  return { ok: true, id: String(data?.id ?? ""), deduped: false };
}

export async function acknowledgeOpsAlert(input: {
  alertId: string;
  actorId: string;
}): Promise<{ ok: true; deduped?: boolean } | { ok: false; error: string; status: number }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: "Service unavailable.", status: 503 };

  const { data: existing } = await supabase
    .from("crm_ops_alerts")
    .select("id, status")
    .eq("id", input.alertId)
    .maybeSingle();

  if (!existing) return { ok: false, error: "Alert not found.", status: 404 };
  if (["acknowledged", "resolved"].includes(String(existing.status))) {
    return { ok: true, deduped: true };
  }
  if (String(existing.status) !== "open") {
    return { ok: false, error: "Alert not open.", status: 409 };
  }

  const { data, error } = await supabase
    .from("crm_ops_alerts")
    .update({
      status: "acknowledged",
      acknowledged_at: new Date().toISOString(),
      acknowledged_by: input.actorId,
    })
    .eq("id", input.alertId)
    .eq("status", "open")
    .select("id")
    .maybeSingle();

  if (error || !data) {
    // Concurrent acknowledge
    const { data: again } = await supabase
      .from("crm_ops_alerts")
      .select("status")
      .eq("id", input.alertId)
      .maybeSingle();
    if (again && ["acknowledged", "resolved"].includes(String(again.status))) {
      return { ok: true, deduped: true };
    }
    return { ok: false, error: "Could not acknowledge alert.", status: 409 };
  }
  return { ok: true };
}

export async function resolveOpsAlert(input: {
  alertId: string;
  actorId: string;
}): Promise<{ ok: true; deduped?: boolean } | { ok: false; error: string; status: number }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: "Service unavailable.", status: 503 };

  const { data: existing } = await supabase
    .from("crm_ops_alerts")
    .select("id, status")
    .eq("id", input.alertId)
    .maybeSingle();

  if (!existing) return { ok: false, error: "Alert not found.", status: 404 };
  if (String(existing.status) === "resolved") {
    return { ok: true, deduped: true };
  }
  if (!["open", "acknowledged"].includes(String(existing.status))) {
    return { ok: false, error: "Alert not resolvable.", status: 409 };
  }

  const { data, error } = await supabase
    .from("crm_ops_alerts")
    .update({
      status: "resolved",
      resolved_at: new Date().toISOString(),
      resolved_by: input.actorId,
      acknowledged_at: new Date().toISOString(),
      acknowledged_by: input.actorId,
    })
    .eq("id", input.alertId)
    .in("status", ["open", "acknowledged"])
    .select("id")
    .maybeSingle();

  if (error || !data) {
    const { data: again } = await supabase
      .from("crm_ops_alerts")
      .select("status")
      .eq("id", input.alertId)
      .maybeSingle();
    if (again && String(again.status) === "resolved") {
      return { ok: true, deduped: true };
    }
    return { ok: false, error: "Could not resolve alert.", status: 409 };
  }
  return { ok: true };
}
