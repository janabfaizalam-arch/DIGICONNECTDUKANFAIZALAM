import "server-only";

import { createOpsAlert } from "@/lib/automation/alerts";
import { emitAutomationEvent } from "@/lib/automation/events";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type RecordApplicationAssignmentInput = {
  applicationId: string;
  /** Append-only assignment-history row id — source of truth for idempotency. */
  assignmentHistoryId: string;
  assigneeUserId: string | null;
  actorId: string | null;
  actorOrigin?: "system" | "admin" | "agency_partner" | "customer" | "webhook" | "cron";
  reason?: string | null;
  /** Partner scope: when set, verify application belongs to partner before emit. */
  partnerScopeId?: string | null;
};

/**
 * Emit application.assigned from the canonical assignment-history boundary.
 * Idempotency key is based on the history row id — retries do not duplicate.
 * Unassigned → optional admin alert only (no staff assignee notification, no customer WA).
 * Does not accept event type or recipient from the browser.
 */
export async function recordApplicationAssignmentEvent(
  input: RecordApplicationAssignmentInput,
): Promise<
  | { ok: true; kind: "assigned" | "unassigned_alert"; id: string; deduped: boolean }
  | { ok: false; error: string; status: number }
> {
  if (!input.assignmentHistoryId || !input.applicationId) {
    return { ok: false, error: "Missing assignment history.", status: 400 };
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: "Service unavailable.", status: 503 };

  const { data: app } = await supabase
    .from("applications")
    .select("id, agency_partner_id, assigned_agent_id, agent_id, service_name, status")
    .eq("id", input.applicationId)
    .maybeSingle();

  if (!app) return { ok: false, error: "Application not found.", status: 404 };

  if (input.partnerScopeId) {
    const scoped =
      String(app.agency_partner_id ?? "") === input.partnerScopeId ||
      String(app.assigned_agent_id ?? "") === input.partnerScopeId ||
      String(app.agent_id ?? "") === input.partnerScopeId;
    if (!scoped) return { ok: false, error: "Forbidden", status: 403 };
  }

  // Unassigned: one idempotent admin alert — no application.assigned staff event, no customer WA.
  if (!input.assigneeUserId) {
    const alert = await createOpsAlert({
      alertType: "unassigned_application",
      severity: "warning",
      title: "Application unassigned",
      safeSummary: `Application moved to unassigned queue (${String(app.status ?? "")}).`,
      relatedEntityType: "application",
      relatedEntityId: input.applicationId,
      idempotencyParts: ["unassigned", input.assignmentHistoryId],
    });
    if (!alert.ok) return { ok: false, error: alert.error, status: 500 };
    return { ok: true, kind: "unassigned_alert", id: alert.id, deduped: alert.deduped };
  }

  // Resolve recipient server-side from authoritative assignee id — never from browser.
  const emit = await emitAutomationEvent({
    eventType: "application.assigned",
    entityType: "application",
    entityId: input.applicationId,
    actorId: input.actorId,
    actorOrigin: input.actorOrigin ?? "admin",
    sourceHistoryId: input.assignmentHistoryId,
    sourceHistoryTable: "application_assignment_history",
    idempotencyParts: ["assignment_history", input.assignmentHistoryId],
    safeMetadata: {
      assignee_user_id: input.assigneeUserId,
      application_id: input.applicationId,
      // No customer PII beyond ids
      reason: input.reason ? String(input.reason).slice(0, 80) : null,
    },
  });

  if (!emit.ok) {
    return { ok: false, error: emit.error, status: emit.status };
  }

  return { ok: true, kind: "assigned", id: emit.id, deduped: emit.deduped };
}

/**
 * Bounded reconciliation: find assignment-history rows missing automation events.
 * Does not invent assignments. Idempotent on history id.
 */
export async function reconcileApplicationAssignmentEvents(input?: {
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
    .from("application_assignment_history")
    .select("id, application_id, assigned_user_id, assigned_by, assignment_reason, created_at")
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

    const result = await recordApplicationAssignmentEvent({
      applicationId: String(row.application_id),
      assignmentHistoryId: String(row.id),
      assigneeUserId: row.assigned_user_id ? String(row.assigned_user_id) : null,
      actorId: row.assigned_by ? String(row.assigned_by) : null,
      actorOrigin: "cron",
      reason: row.assignment_reason ? String(row.assignment_reason) : "reconcile",
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
