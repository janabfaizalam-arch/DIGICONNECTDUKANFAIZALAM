import "server-only";

import { roleHasCapability } from "@/lib/crm/permissions-core";
import {
  buildLeadIngestionKey,
  classifyDuplicateMatch,
  isFollowUpOverdue,
  isLeadPipelineStage,
  isLeadSource,
  isValidLeadMobile,
  mapLegacyStatusToStage,
  mapStageToCrmLeadsPipeline,
  mapStageToLegacyStatus,
  normalizeLeadMobile,
  type LeadDuplicateSuggestion,
  type LeadPipelineStage,
  type LeadSource,
} from "@/lib/crm/leads-core";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type CanonicalLead = {
  id: string;
  name: string;
  mobile: string;
  mobileNormalized: string;
  service: string | null;
  message: string | null;
  notes: string | null;
  status: string;
  source: string | null;
  leadSource: LeadSource;
  pipelineStage: LeadPipelineStage;
  assignedTo: string | null;
  agentId: string | null;
  partnerId: string | null;
  nextFollowUpAt: string | null;
  lostReason: string | null;
  convertedApplicationId: string | null;
  convertedCustomerId: string | null;
  overdue: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

function rowToLead(row: Record<string, unknown>): CanonicalLead {
  const stage = isLeadPipelineStage(String(row.pipeline_stage ?? ""))
    ? (row.pipeline_stage as LeadPipelineStage)
    : mapLegacyStatusToStage(String(row.status ?? "new"));
  const leadSource = isLeadSource(String(row.lead_source ?? row.source ?? ""))
    ? ((row.lead_source ?? row.source) as LeadSource)
    : "manual";
  const nextFollowUpAt = row.next_follow_up_at ? String(row.next_follow_up_at) : null;
  return {
    id: String(row.id),
    name: String(row.name ?? row.customer_name ?? "Lead"),
    mobile: String(row.mobile ?? ""),
    mobileNormalized: normalizeLeadMobile(String(row.mobile_normalized ?? row.mobile ?? "")),
    service: row.service ? String(row.service) : null,
    message: row.message ? String(row.message) : null,
    notes: row.notes ? String(row.notes) : null,
    status: String(row.status ?? "new"),
    source: row.source ? String(row.source) : null,
    leadSource,
    pipelineStage: stage,
    assignedTo: row.assigned_to ? String(row.assigned_to) : null,
    agentId: row.agent_id ? String(row.agent_id) : null,
    partnerId: row.partner_id ? String(row.partner_id) : null,
    nextFollowUpAt,
    lostReason: row.lost_reason ? String(row.lost_reason) : null,
    convertedApplicationId: row.converted_application_id ? String(row.converted_application_id) : null,
    convertedCustomerId: row.converted_customer_id ? String(row.converted_customer_id) : null,
    overdue: isFollowUpOverdue({ nextFollowUpAt, stage }),
    createdAt: row.created_at ? String(row.created_at) : null,
    updatedAt: row.updated_at ? String(row.updated_at) : null,
  };
}

export async function listCanonicalLeads(input: {
  actorId: string;
  actorRole: string | null | undefined;
  q?: string;
  stage?: string;
  source?: string;
  assignee?: "all" | "unassigned" | "me" | string;
  overdueOnly?: boolean;
  page?: number;
  pageSize?: number;
}): Promise<{ ok: true; leads: CanonicalLead[]; total: number; page: number; pageSize: number; kpis: { overdue: number; unassigned: number } } | { ok: false; error: string; status: number }> {
  if (!roleHasCapability(input.actorRole, "leads.view")) {
    return { ok: false, error: "Forbidden", status: 403 };
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: "Service unavailable.", status: 503 };

  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 25));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("leads")
    .select(
      "id, name, customer_name, mobile, mobile_normalized, service, message, notes, status, source, lead_source, pipeline_stage, assigned_to, agent_id, partner_id, next_follow_up_at, lost_reason, converted_application_id, converted_customer_id, created_at, updated_at",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  const isPartner =
    String(input.actorRole ?? "").toLowerCase() === "agency_partner" ||
    String(input.actorRole ?? "").toLowerCase() === "agent";

  if (isPartner) {
    query = query.or(
      `agent_id.eq.${input.actorId},assigned_to.eq.${input.actorId},partner_id.eq.${input.actorId}`,
    );
  }

  if (input.q?.trim()) {
    const q = input.q.trim().replace(/[% ,]/g, "");
    query = query.or(`name.ilike.%${q}%,mobile.ilike.%${q}%,service.ilike.%${q}%`);
  }
  if (input.stage && input.stage !== "all") {
    query = query.eq("pipeline_stage", input.stage);
  }
  if (input.source && input.source !== "all") {
    query = query.eq("lead_source", input.source);
  }
  if (input.assignee === "unassigned") {
    query = query.is("assigned_to", null);
  } else if (input.assignee === "me") {
    query = query.eq("assigned_to", input.actorId);
  } else if (input.assignee && input.assignee !== "all") {
    query = query.eq("assigned_to", input.assignee);
  }
  if (input.overdueOnly) {
    query = query.lt("next_follow_up_at", new Date().toISOString()).not("pipeline_stage", "in", "(won,lost)");
  }

  const { data, error, count } = await query;
  if (error) {
    console.error("[crm-leads] list_failed", { error: error.message });
    return { ok: false, error: "Could not load leads.", status: 500 };
  }

  const leads = (data ?? []).map((row) => rowToLead(row as Record<string, unknown>));

  // KPI counts (scoped). Best-effort; ignore column-missing environments.
  let overdue = 0;
  let unassigned = 0;
  try {
    let overdueQuery = supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .lt("next_follow_up_at", new Date().toISOString())
      .not("pipeline_stage", "in", "(won,lost)");
    let unassignedQuery = supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .is("assigned_to", null)
      .not("pipeline_stage", "in", "(won,lost)");
    if (isPartner) {
      const scope = `agent_id.eq.${input.actorId},assigned_to.eq.${input.actorId},partner_id.eq.${input.actorId}`;
      overdueQuery = overdueQuery.or(scope);
      unassignedQuery = unassignedQuery.or(scope);
    }
    const [o, u] = await Promise.all([overdueQuery, unassignedQuery]);
    overdue = o.count ?? 0;
    unassigned = u.count ?? 0;
  } catch {
    overdue = leads.filter((l) => l.overdue).length;
    unassigned = leads.filter((l) => !l.assignedTo && l.pipelineStage !== "won" && l.pipelineStage !== "lost").length;
  }

  return {
    ok: true,
    leads,
    total: count ?? leads.length,
    page,
    pageSize,
    kpis: { overdue, unassigned },
  };
}

export async function findLeadDuplicates(input: {
  mobileInput: string;
  service?: string | null;
  /** When set, only return duplicates owned by this partner/actor — never cross-partner PII. */
  scopePartnerId?: string | null;
  /** Admin may see global suggestions; partners must pass scopePartnerId. */
  allowGlobal?: boolean;
}): Promise<LeadDuplicateSuggestion[]> {
  const mobile = normalizeLeadMobile(input.mobileInput);
  if (!isValidLeadMobile(mobile)) return [];
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  let query = supabase
    .from("leads")
    .select("id, name, mobile, service, status, pipeline_stage, agent_id, partner_id, assigned_to")
    .eq("mobile_normalized", mobile)
    .order("created_at", { ascending: false })
    .limit(8);

  if (!input.allowGlobal) {
    const scope = input.scopePartnerId?.trim();
    if (!scope) return [];
    query = query.or(`agent_id.eq.${scope},assigned_to.eq.${scope},partner_id.eq.${scope}`);
  }

  const { data } = await query;

  return (data ?? [])
    .map((row) =>
      classifyDuplicateMatch({
        candidateMobile: mobile,
        candidateService: input.service,
        existingMobile: String(row.mobile ?? ""),
        existingService: row.service ? String(row.service) : null,
        existingId: String(row.id),
        existingName: String(row.name ?? "Lead"),
        existingStage: isLeadPipelineStage(String(row.pipeline_stage ?? ""))
          ? (row.pipeline_stage as LeadPipelineStage)
          : mapLegacyStatusToStage(String(row.status ?? "new")),
      }),
    )
    .filter((item): item is LeadDuplicateSuggestion => Boolean(item));
}

export async function ingestLead(input: {
  source: LeadSource;
  name: string;
  mobile: string;
  service?: string | null;
  message?: string | null;
  city?: string | null;
  address?: string | null;
  notes?: string | null;
  email?: string | null;
  referralCode?: string | null;
  campaignAttribution?: string | null;
  /** Authenticated partner/actor — ownership is derived server-side, not from client spoof fields. */
  agentId?: string | null;
  partnerId?: string | null;
  assignedTo?: string | null;
  externalId?: string | null;
  actorId?: string | null;
  /** When true, actor is admin and may set assignee freely. */
  actorIsAdmin?: boolean;
}): Promise<
  | { ok: true; leadId: string; deduped: boolean; duplicates: LeadDuplicateSuggestion[] }
  | { ok: false; error: string; status: number }
> {
  const mobile = normalizeLeadMobile(input.mobile);
  if (!isValidLeadMobile(mobile)) {
    return { ok: false, error: "Enter a valid 10-digit Indian mobile number.", status: 400 };
  }
  const name = input.name.trim();
  if (name.length < 2) return { ok: false, error: "Name is required.", status: 400 };

  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: "Service unavailable.", status: 503 };

  // Derive ownership from authenticated context — ignore spoofed cross-partner IDs for partners.
  const partnerScope =
    input.source === "agency_partner"
      ? input.actorId || input.partnerId || input.agentId || null
      : input.actorIsAdmin
        ? input.partnerId ?? input.agentId ?? null
        : input.partnerId ?? input.agentId ?? null;

  const ownedAgentId =
    input.source === "agency_partner" ? input.actorId || partnerScope : input.agentId ?? partnerScope;

  const ingestionKey = buildLeadIngestionKey({
    source: input.source,
    mobile,
    service: input.service,
    externalId: input.externalId,
    scopeId: input.source === "agency_partner" || input.source === "manual" || input.source === "field_executive"
      ? partnerScope || input.actorId
      : null,
  });

  const duplicateQuery = {
    mobileInput: mobile,
    service: input.service,
    scopePartnerId: input.actorIsAdmin ? null : partnerScope || input.actorId,
    allowGlobal: Boolean(input.actorIsAdmin) || input.source === "website",
  };

  const existingKey = await supabase
    .from("lead_ingestion_keys")
    .select("lead_id, response")
    .eq("key", ingestionKey)
    .maybeSingle();

  if (existingKey.data?.lead_id) {
    return {
      ok: true,
      leadId: String(existingKey.data.lead_id),
      deduped: true,
      duplicates: await findLeadDuplicates(duplicateQuery),
    };
  }

  const duplicates = await findLeadDuplicates(duplicateQuery);
  // Do not auto-merge. Exact same scoped ingest is handled by ingestion key.

  const stage: LeadPipelineStage = "new";
  const assignee =
    input.source === "agency_partner"
      ? ownedAgentId
      : input.actorIsAdmin
        ? input.assignedTo ?? ownedAgentId
        : ownedAgentId;

  const payload: Record<string, unknown> = {
    name,
    mobile,
    mobile_normalized: mobile,
    email: input.email?.trim() || null,
    service: input.service?.trim() || "General enquiry",
    message: input.message ?? null,
    notes: input.notes ?? null,
    city: input.city ?? null,
    address: input.address ?? null,
    status: mapStageToLegacyStatus(stage),
    source: input.source === "agency_partner" ? "agency_partner" : input.source,
    lead_source: input.source,
    pipeline_stage: stage,
    agent_id: ownedAgentId,
    partner_id: partnerScope,
    assigned_to: assignee,
    assigned_by: input.actorId ?? null,
    assigned_at: assignee ? new Date().toISOString() : null,
    created_by: input.actorId ?? null,
    referral_code: input.referralCode ?? null,
    campaign_attribution: input.campaignAttribution ?? null,
    external_ref: input.externalId ?? null,
    ingestion_key: ingestionKey,
    last_activity_at: new Date().toISOString(),
  };

  const { data: lead, error } = await supabase.from("leads").insert(payload).select("id").single();
  if (error || !lead) {
    // Unique ingestion race — return prior lead if present.
    if (/duplicate|unique/i.test(error?.message ?? "")) {
      const again = await supabase.from("leads").select("id").eq("ingestion_key", ingestionKey).maybeSingle();
      if (again.data?.id) {
        return {
          ok: true,
          leadId: String(again.data.id),
          deduped: true,
          duplicates: await findLeadDuplicates(duplicateQuery),
        };
      }
    }
    console.error("[crm-leads] ingest_failed", { error: "lead_insert_failed" });
    return { ok: false, error: "Lead could not be created.", status: 500 };
  }

  const leadId = String(lead.id);

  await supabase.from("lead_ingestion_keys").upsert({
    key: ingestionKey,
    source: input.source,
    lead_id: leadId,
    response: { ok: true, leadId },
  });

  await supabase.from("lead_stage_history").insert({
    lead_id: leadId,
    from_stage: null,
    to_stage: stage,
    changed_by: input.actorId ?? null,
    changed_by_system: !input.actorId,
    note: "Lead ingested",
    metadata: { source: input.source },
  });

  await supabase.from("lead_activities").insert({
    lead_id: leadId,
    activity_type: "created",
    body: `Lead created from ${input.source}`,
    actor_id: input.actorId ?? null,
    actor_role: input.actorId ? "staff" : "system",
    metadata: { source: input.source },
  });

  if (assignee) {
    await supabase.from("lead_assignment_history").insert({
      lead_id: leadId,
      assigned_user_id: assignee,
      previous_assigned_user_id: null,
      assignment_reason: input.source === "agency_partner" ? "partner_ownership" : "initial_assignment",
      assigned_by: input.actorId ?? null,
      assigned_by_system: !input.actorId,
    });
  }

  return { ok: true, leadId, deduped: false, duplicates };
}

export async function transitionLeadStage(input: {
  actorId: string;
  actorRole: string | null | undefined;
  leadId: string;
  toStage: LeadPipelineStage;
  note?: string | null;
  lostReason?: string | null;
  nextFollowUpAt?: string | null;
}): Promise<{ ok: true; lead: CanonicalLead } | { ok: false; error: string; status: number }> {
  if (!roleHasCapability(input.actorRole, "leads.view")) {
    return { ok: false, error: "Forbidden", status: 403 };
  }
  if (input.toStage === "lost" && !String(input.lostReason ?? "").trim()) {
    return { ok: false, error: "Lost reason is required.", status: 400 };
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: "Service unavailable.", status: 503 };

  const { data: existing } = await supabase.from("leads").select("*").eq("id", input.leadId).maybeSingle();
  if (!existing) return { ok: false, error: "Lead not found.", status: 404 };

  const isPartner =
    String(input.actorRole ?? "").toLowerCase() === "agency_partner" ||
    String(input.actorRole ?? "").toLowerCase() === "agent";
  if (isPartner) {
    const owned =
      existing.agent_id === input.actorId ||
      existing.assigned_to === input.actorId ||
      existing.partner_id === input.actorId;
    if (!owned) return { ok: false, error: "Lead is outside your authorized scope.", status: 403 };
  }

  const fromStage = isLeadPipelineStage(String(existing.pipeline_stage ?? ""))
    ? (existing.pipeline_stage as LeadPipelineStage)
    : mapLegacyStatusToStage(String(existing.status ?? "new"));

  const updates: Record<string, unknown> = {
    pipeline_stage: input.toStage,
    status: mapStageToLegacyStatus(input.toStage),
    last_activity_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (input.toStage === "lost") updates.lost_reason = String(input.lostReason).trim();
  if (input.toStage === "follow_up_scheduled" || input.nextFollowUpAt) {
    updates.next_follow_up_at = input.nextFollowUpAt ?? existing.next_follow_up_at;
  }

  const { data: updated, error } = await supabase
    .from("leads")
    .update(updates)
    .eq("id", input.leadId)
    .select("*")
    .single();

  if (error || !updated) {
    return { ok: false, error: "Stage update failed.", status: 500 };
  }

  await supabase.from("lead_stage_history").insert({
    lead_id: input.leadId,
    from_stage: fromStage,
    to_stage: input.toStage,
    changed_by: input.actorId,
    note: input.note ?? "",
  });

  await supabase.from("lead_activities").insert({
    lead_id: input.leadId,
    activity_type: "stage_change",
    body: `Stage ${fromStage} → ${input.toStage}`,
    actor_id: input.actorId,
    actor_role: String(input.actorRole ?? "admin"),
    metadata: { fromStage, toStage: input.toStage },
  });

  return { ok: true, lead: rowToLead(updated as Record<string, unknown>) };
}

export async function reassignLead(input: {
  actorId: string;
  actorRole: string | null | undefined;
  leadId: string;
  assigneeUserId: string | null;
  reason?: string | null;
}): Promise<{ ok: true; lead: CanonicalLead } | { ok: false; error: string; status: number }> {
  // Partners cannot reassign outside their scope; only admin-like roles may reassign freely.
  const canAssign = roleHasCapability(input.actorRole, "applications.assign") || roleHasCapability(input.actorRole, "staff.manage");
  if (!canAssign) {
    return { ok: false, error: "Forbidden", status: 403 };
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: "Service unavailable.", status: 503 };

  const { data: existing } = await supabase.from("leads").select("*").eq("id", input.leadId).maybeSingle();
  if (!existing) return { ok: false, error: "Lead not found.", status: 404 };

  const previous = existing.assigned_to ? String(existing.assigned_to) : null;
  const { data: updated, error } = await supabase
    .from("leads")
    .update({
      assigned_to: input.assigneeUserId,
      assigned_by: input.actorId,
      assigned_at: new Date().toISOString(),
      agent_id: input.assigneeUserId ?? existing.agent_id,
      last_activity_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.leadId)
    .select("*")
    .single();

  if (error || !updated) return { ok: false, error: "Reassignment failed.", status: 500 };

  await supabase.from("lead_assignment_history").insert({
    lead_id: input.leadId,
    assigned_user_id: input.assigneeUserId,
    previous_assigned_user_id: previous,
    assignment_reason: input.reason?.trim() || "admin_reassignment",
    assigned_by: input.actorId,
    assigned_by_system: false,
  });

  await supabase.from("lead_activities").insert({
    lead_id: input.leadId,
    activity_type: "reassigned",
    body: input.assigneeUserId ? "Lead reassigned" : "Lead moved to unassigned queue",
    actor_id: input.actorId,
    actor_role: String(input.actorRole ?? "admin"),
  });

  return { ok: true, lead: rowToLead(updated as Record<string, unknown>) };
}

/** Read adapter: present canonical leads as crm_leads-shaped cards for the prototype Kanban. */
export function toCrmLeadsCard(lead: CanonicalLead) {
  return {
    id: lead.id,
    customer_name: lead.name,
    customer_mobile: lead.mobile,
    pipeline_stage: mapStageToCrmLeadsPipeline(lead.pipelineStage),
    lead_score: 50,
    notes: lead.notes ?? lead.message,
    follow_up_date: lead.nextFollowUpAt,
    canonical_stage: lead.pipelineStage,
    lead_source: lead.leadSource,
    assigned_to: lead.assignedTo,
    overdue: lead.overdue,
    source_table: "leads" as const,
  };
}
