import "server-only";

import { roleHasCapability } from "@/lib/crm/permissions-core";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type FollowUpStatus = "scheduled" | "completed" | "cancelled" | "rescheduled";

function isPartnerRole(role: string | null | undefined) {
  const value = String(role ?? "").toLowerCase();
  return value === "agency_partner" || value === "agent";
}

/**
 * Stages later in the funnel than `follow_up_scheduled`. The transition table has
 * no path from `follow_up_scheduled` back to these, so overwriting the stage when
 * an operator books a call would strand the lead earlier in the pipeline.
 */
const STAGES_AFTER_FOLLOW_UP = new Set([
  "qualified",
  "service_selected",
  "documents_awaited",
  "application_created",
  "won",
  "lost",
]);

/**
 * Repoint `leads.next_follow_up_at` at the earliest still-scheduled follow-up.
 *
 * Completing or cancelling a follow-up used to leave the pointer on the old
 * datetime, so the lead stayed permanently "overdue" and the overdue queue never
 * drained — finished work kept showing up as outstanding.
 */
async function refreshNextFollowUpPointer(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  leadId: string,
) {
  const { data: upcoming, error } = await supabase
    .from("lead_follow_ups")
    .select("scheduled_at")
    .eq("lead_id", leadId)
    .eq("status", "scheduled")
    .order("scheduled_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[crm-followups] next_pointer_lookup_failed", { leadId, error: error.message });
    return;
  }

  const { error: updateError } = await supabase
    .from("leads")
    .update({
      next_follow_up_at: upcoming?.scheduled_at ?? null,
      last_activity_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", leadId);

  if (updateError) {
    console.error("[crm-followups] next_pointer_update_failed", { leadId, error: updateError.message });
  }
}

async function assertLeadScope(input: {
  actorId: string;
  actorRole: string | null | undefined;
  leadId: string;
}) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false as const, error: "Service unavailable.", status: 503 };
  const { data: lead } = await supabase.from("leads").select("*").eq("id", input.leadId).maybeSingle();
  if (!lead) return { ok: false as const, error: "Lead not found.", status: 404 };
  if (isPartnerRole(input.actorRole)) {
    const owned =
      lead.agent_id === input.actorId ||
      lead.assigned_to === input.actorId ||
      lead.partner_id === input.actorId;
    if (!owned) return { ok: false as const, error: "Forbidden", status: 403 };
  }
  return { ok: true as const, lead, supabase };
}

/** Schedule or reschedule a follow-up (auditable). Updates leads.next_follow_up_at pointer. */
export async function scheduleLeadFollowUp(input: {
  actorId: string;
  actorRole: string | null | undefined;
  leadId: string;
  scheduledAt: string;
  note?: string | null;
  idempotencyKey?: string | null;
  replaceFollowUpId?: string | null;
}) {
  if (!roleHasCapability(input.actorRole, "leads.view")) {
    return { ok: false as const, error: "Forbidden", status: 403 };
  }
  if (Number.isNaN(Date.parse(input.scheduledAt))) {
    return { ok: false as const, error: "Invalid follow-up datetime.", status: 400 };
  }

  const scoped = await assertLeadScope(input);
  if (!scoped.ok) return scoped;
  const { supabase, lead } = scoped;

  if (input.idempotencyKey) {
    const { data: prior } = await supabase
      .from("lead_follow_ups")
      .select("*")
      .eq("idempotency_key", input.idempotencyKey)
      .maybeSingle();
    if (prior) return { ok: true as const, followUp: prior, deduped: true };
  }

  if (input.replaceFollowUpId) {
    await supabase
      .from("lead_follow_ups")
      .update({
        status: "rescheduled",
        updated_at: new Date().toISOString(),
        reason: input.note ?? "rescheduled",
      })
      .eq("id", input.replaceFollowUpId)
      .eq("lead_id", input.leadId)
      .eq("status", "scheduled");
  }

  const { data: row, error } = await supabase
    .from("lead_follow_ups")
    .insert({
      lead_id: input.leadId,
      scheduled_at: new Date(input.scheduledAt).toISOString(),
      status: "scheduled",
      assignee_id: lead.assigned_to ?? input.actorId,
      created_by: input.actorId,
      note: input.note ?? null,
      replaces_follow_up_id: input.replaceFollowUpId ?? null,
      idempotency_key: input.idempotencyKey ?? null,
    })
    .select("*")
    .single();

  if (error || !row) {
    if (input.idempotencyKey && /duplicate|unique/i.test(error?.message ?? "")) {
      const { data: prior } = await supabase
        .from("lead_follow_ups")
        .select("*")
        .eq("idempotency_key", input.idempotencyKey)
        .maybeSingle();
      if (prior) return { ok: true as const, followUp: prior, deduped: true };
    }
    return { ok: false as const, error: "Could not schedule follow-up.", status: 500 };
  }

  // Booking a call must not rewind pipeline progress — keep any stage at or past
  // qualification, and only mark early-stage leads as follow_up_scheduled.
  const currentStage = String(lead.pipeline_stage ?? "");
  const nextStage = STAGES_AFTER_FOLLOW_UP.has(currentStage) ? currentStage : "follow_up_scheduled";

  await supabase
    .from("leads")
    .update({
      next_follow_up_at: row.scheduled_at,
      pipeline_stage: nextStage,
      last_activity_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.leadId);

  await supabase.from("lead_activities").insert({
    lead_id: input.leadId,
    activity_type: input.replaceFollowUpId ? "follow_up_rescheduled" : "follow_up_scheduled",
    body: `Follow-up scheduled for ${row.scheduled_at}`,
    actor_id: input.actorId,
    actor_role: String(input.actorRole ?? "admin"),
    metadata: { followUpId: row.id },
  });

  return { ok: true as const, followUp: row, deduped: false };
}

export async function completeLeadFollowUp(input: {
  actorId: string;
  actorRole: string | null | undefined;
  followUpId: string;
  note?: string | null;
}) {
  if (!roleHasCapability(input.actorRole, "leads.view")) {
    return { ok: false as const, error: "Forbidden", status: 403 };
  }
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false as const, error: "Service unavailable.", status: 503 };

  const { data: existing } = await supabase.from("lead_follow_ups").select("*").eq("id", input.followUpId).maybeSingle();
  if (!existing) return { ok: false as const, error: "Follow-up not found.", status: 404 };

  const scoped = await assertLeadScope({
    actorId: input.actorId,
    actorRole: input.actorRole,
    leadId: String(existing.lead_id),
  });
  if (!scoped.ok) return scoped;

  if (existing.status === "completed") {
    return { ok: true as const, followUp: existing, deduped: true };
  }
  if (existing.status !== "scheduled") {
    return { ok: false as const, error: "Follow-up cannot be completed from this state.", status: 409 };
  }

  const { data: row, error } = await supabase
    .from("lead_follow_ups")
    .update({
      status: "completed",
      completed_by: input.actorId,
      completed_at: new Date().toISOString(),
      note: input.note ?? existing.note,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.followUpId)
    .eq("status", "scheduled")
    .select("*")
    .maybeSingle();

  if (error) return { ok: false as const, error: "Could not complete follow-up.", status: 500 };
  if (!row) {
    const { data: again } = await supabase.from("lead_follow_ups").select("*").eq("id", input.followUpId).maybeSingle();
    if (again?.status === "completed") return { ok: true as const, followUp: again, deduped: true };
    return { ok: false as const, error: "Follow-up could not be completed.", status: 409 };
  }

  await refreshNextFollowUpPointer(supabase, String(existing.lead_id));

  await supabase.from("lead_activities").insert({
    lead_id: existing.lead_id,
    activity_type: "follow_up_completed",
    body: "Follow-up completed",
    actor_id: input.actorId,
    actor_role: String(input.actorRole ?? "admin"),
    metadata: { followUpId: row.id },
  });

  return { ok: true as const, followUp: row, deduped: false };
}

export async function cancelLeadFollowUp(input: {
  actorId: string;
  actorRole: string | null | undefined;
  followUpId: string;
  reason?: string | null;
}) {
  if (!roleHasCapability(input.actorRole, "leads.view")) {
    return { ok: false as const, error: "Forbidden", status: 403 };
  }
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false as const, error: "Service unavailable.", status: 503 };

  const { data: existing } = await supabase.from("lead_follow_ups").select("*").eq("id", input.followUpId).maybeSingle();
  if (!existing) return { ok: false as const, error: "Follow-up not found.", status: 404 };

  const scoped = await assertLeadScope({
    actorId: input.actorId,
    actorRole: input.actorRole,
    leadId: String(existing.lead_id),
  });
  if (!scoped.ok) return scoped;

  if (existing.status === "cancelled") {
    return { ok: true as const, followUp: existing, deduped: true };
  }
  if (existing.status !== "scheduled") {
    return { ok: false as const, error: "Follow-up cannot be cancelled from this state.", status: 409 };
  }

  const { data: row, error } = await supabase
    .from("lead_follow_ups")
    .update({
      status: "cancelled",
      cancelled_by: input.actorId,
      cancelled_at: new Date().toISOString(),
      reason: input.reason ?? "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.followUpId)
    .eq("status", "scheduled")
    .select("*")
    .maybeSingle();

  if (error) return { ok: false as const, error: "Could not cancel follow-up.", status: 500 };
  if (!row) {
    // Lost the race against another actor — report the settled state, not a 500.
    const { data: again } = await supabase.from("lead_follow_ups").select("*").eq("id", input.followUpId).maybeSingle();
    if (again?.status === "cancelled") return { ok: true as const, followUp: again, deduped: true };
    return { ok: false as const, error: "Follow-up could not be cancelled.", status: 409 };
  }

  await refreshNextFollowUpPointer(supabase, String(existing.lead_id));

  await supabase.from("lead_activities").insert({
    lead_id: existing.lead_id,
    activity_type: "follow_up_cancelled",
    body: "Follow-up cancelled",
    actor_id: input.actorId,
    actor_role: String(input.actorRole ?? "admin"),
    metadata: { followUpId: row.id },
  });

  return { ok: true as const, followUp: row, deduped: false };
}
