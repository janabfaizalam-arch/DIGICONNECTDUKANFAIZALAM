import "server-only";

import { getAgentServiceBySlug } from "@/lib/agent-services";
import { roleHasCapability } from "@/lib/crm/permissions-core";
import {
  isLeadPipelineStage,
  mapLegacyStatusToStage,
  normalizeLeadMobile,
  type LeadPipelineStage,
} from "@/lib/crm/leads-core";
import { assertLostReason, canTransitionLeadStage } from "@/lib/crm/lead-workflow-core";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { scheduleCrmSync } from "@/lib/crmSync";
import { dispatchApplicationNotification } from "@/lib/automation/dispatch-notification";

export type LeadConvertResult = {
  ok: true;
  deduped: boolean;
  leadId: string;
  customerId: string;
  applicationId: string;
  workId?: string | null;
  amount?: number;
  serviceName?: string;
  assignmentReason?: string;
  alreadyConverted?: boolean;
};

function isPartnerRole(role: string | null | undefined) {
  const value = String(role ?? "").toLowerCase();
  return value === "agency_partner" || value === "agent";
}

/**
 * Partner customer scope without invented customers.created_by / assigned_agent_id.
 * Canonical ownership lives on applications (created_by / assigned_agent_id / agent_id).
 */
export async function partnerCanAccessCustomer(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  actorId: string,
  customerId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("applications")
    .select("id")
    .eq("customer_id", customerId)
    .or(`created_by.eq.${actorId},assigned_agent_id.eq.${actorId},agent_id.eq.${actorId}`)
    .limit(1)
    .maybeSingle();
  return Boolean(data?.id);
}

/**
 * App-layer authZ + scope. The RPC ALSO validates actor/ownership/customer/assignee
 * because service_role bypasses RLS — defense in depth, not duplicate trust of client values.
 *
 * Conversion does not create Auth users or temporary PINs.
 * New customers are created inside the RPC with production columns (id, name, mobile, …).
 * applications.user_id is set only when customers.id == auth.users.id (proven link).
 */
export async function convertLeadToApplication(input: {
  actorId: string;
  actorRole: string | null | undefined;
  leadId: string;
  idempotencyKey: string;
  serviceSlug?: string | null;
  existingCustomerId?: string | null;
  createCustomerIfMissing?: boolean;
  assigneeUserId?: string | null;
}): Promise<LeadConvertResult | { ok: false; error: string; status: number; matchedCustomerId?: string }> {
  if (!roleHasCapability(input.actorRole, "leads.convert")) {
    return { ok: false, error: "Forbidden", status: 403 };
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: "Service unavailable.", status: 503 };

  const { data: lead } = await supabase.from("leads").select("*").eq("id", input.leadId).maybeSingle();
  if (!lead) return { ok: false, error: "Lead not found.", status: 404 };

  if (isPartnerRole(input.actorRole)) {
    const owned =
      lead.agent_id === input.actorId ||
      lead.assigned_to === input.actorId ||
      lead.partner_id === input.actorId;
    if (!owned) {
      // Same generic message as other forbidden paths — no cross-partner existence leak.
      return { ok: false, error: "Lead is outside your authorized scope.", status: 403 };
    }
  }

  const stage = isLeadPipelineStage(String(lead.pipeline_stage ?? ""))
    ? (lead.pipeline_stage as LeadPipelineStage)
    : mapLegacyStatusToStage(String(lead.status ?? "new"));

  if (lead.converted_application_id) {
    return {
      ok: true,
      deduped: true,
      alreadyConverted: true,
      leadId: String(lead.id),
      customerId: String(lead.converted_customer_id ?? ""),
      applicationId: String(lead.converted_application_id),
    };
  }
  if (stage === "lost") {
    return { ok: false, error: "Lost leads cannot be converted without reopen.", status: 409 };
  }

  const mobile = normalizeLeadMobile(String(lead.mobile ?? ""));
  const existingCustomerId = input.existingCustomerId ?? null;

  if (!existingCustomerId) {
    // Production customers: name (not full_name); no created_by / assigned_agent_id / source.
    const { data: matches } = await supabase
      .from("customers")
      .select("id, mobile, name")
      .eq("mobile", mobile)
      .limit(5);

    let visible = matches ?? [];
    if (isPartnerRole(input.actorRole)) {
      const scoped: typeof visible = [];
      for (const row of visible) {
        if (await partnerCanAccessCustomer(supabase, input.actorId, String(row.id))) {
          scoped.push(row);
        }
      }
      visible = scoped;
    }

    if (visible.length === 1) {
      return {
        ok: false,
        error: "Existing customer found. Confirm link with existingCustomerId.",
        status: 409,
        // Admin + scoped partner only receive the id for authorized selection.
        matchedCustomerId: String(visible[0].id),
      };
    }
    if (visible.length > 1) {
      return { ok: false, error: "Multiple customer matches. Select one explicitly.", status: 409 };
    }
    if ((matches ?? []).length > 0 && isPartnerRole(input.actorRole) && visible.length === 0) {
      // Inaccessible exact match — generic conflict, no id/name/ownership leak.
      return {
        ok: false,
        error: "Conversion could not be completed. Contact an administrator if this persists.",
        status: 409,
      };
    }
  } else if (isPartnerRole(input.actorRole)) {
    const allowed = await partnerCanAccessCustomer(supabase, input.actorId, existingCustomerId);
    if (!allowed) {
      return { ok: false, error: "Customer is outside your authorized scope.", status: 403 };
    }
  }

  const slug = input.serviceSlug?.trim() || String(lead.service ?? "").toLowerCase().replace(/\s+/g, "-");
  const service = slug ? await getAgentServiceBySlug(slug) : null;
  // Price is resolved server-side; RPC ignores client fee when service id present and zeros otherwise.
  const amount = service && service.is_active ? Number(service.customer_fee) : 0;
  const serviceName = service?.title || String(lead.service || "Service");
  const canAssign = roleHasCapability(input.actorRole, "applications.assign");
  const assignee = canAssign ? input.assigneeUserId ?? null : null;

  const rpc = await supabase.rpc("convert_lead_to_application_core", {
    p_actor_id: input.actorId,
    p_client_idempotency_key: input.idempotencyKey,
    p_lead_id: input.leadId,
    p_existing_customer_id: existingCustomerId,
    p_allow_create_customer: input.createCustomerIfMissing !== false && !existingCustomerId,
    p_agent_service_id: service?.id ?? null,
    p_service_slug: service?.slug ?? slug,
    p_service_name: serviceName,
    p_amount: amount,
    p_assignee_id: assignee,
    p_assignment_reason: assignee ? "lead_conversion" : "unassigned_queue",
  });

  if (rpc.error) {
    const msg = `${rpc.error.message ?? ""}`;
    if (msg.includes("customer_match_required")) {
      return {
        ok: false,
        error: "Existing customer must be linked explicitly before conversion.",
        status: 409,
      };
    }
    if (msg.includes("actor_forbidden") || msg.includes("lead_forbidden") || msg.includes("customer_forbidden") || msg.includes("customer_auth_user_mismatch")) {
      return { ok: false, error: "Forbidden", status: 403 };
    }
    if (msg.includes("assignee_ineligible")) {
      return { ok: false, error: "Assignee is not an eligible CRM operational user.", status: 400 };
    }
    if (msg.includes("inactive_service")) {
      return { ok: false, error: "Selected service is inactive or unavailable.", status: 409 };
    }
    const codes = ["lead_terminal_state", "lead_mobile_invalid"];
    if (codes.some((c) => msg.includes(c))) {
      return { ok: false, error: "Conversion could not be completed.", status: 409 };
    }
    if (/PGRST202|42883|does not exist|schema cache|PRECONDITION FAILED/i.test(msg)) {
      return { ok: false, error: "Database upgrade required for transactional conversion.", status: 503 };
    }
    console.error("[lead-convert] rpc_failed", { error: "lead_convert_failed" });
    return { ok: false, error: "Conversion failed.", status: 500 };
  }

  const data = rpc.data as Record<string, unknown>;
  const applicationId = String(data.applicationId);
  const customerId = String(data.customerId);

  try {
    await scheduleCrmSync(applicationId, "application_created", { customerId });
  } catch {
    // Non-blocking — must not roll back conversion
  }

  try {
    await dispatchApplicationNotification({
      applicationId,
      eventType: "application_submitted",
      recipientMobile: mobile,
      customerName: String(lead.name ?? "Customer"),
      serviceName,
      amount: Number(data.amount ?? amount),
      status: "submitted",
      customerId,
      actorId: input.actorId,
      actorOrigin: input.actorRole === "agency_partner" ? "agency_partner" : "admin",
      automationEventType: "lead.converted",
      processRulesInline: true,
    });
  } catch {
    // Non-blocking
  }

  return {
    ok: true,
    deduped: Boolean(data.deduped),
    alreadyConverted: Boolean(data.alreadyConverted),
    leadId: String(data.leadId ?? input.leadId),
    customerId,
    applicationId,
    workId: data.workId ? String(data.workId) : null,
    amount: Number(data.amount ?? amount),
    serviceName: String(data.serviceName ?? serviceName),
    assignmentReason: data.assignmentReason ? String(data.assignmentReason) : undefined,
  };
}

export async function transitionLeadStageSafe(input: {
  actorId: string;
  actorRole: string | null | undefined;
  leadId: string;
  toStage: LeadPipelineStage;
  note?: string | null;
  lostReason?: string | null;
  nextFollowUpAt?: string | null;
  allowReopen?: boolean;
}) {
  const { transitionLeadStage } = await import("@/lib/crm/leads");
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false as const, error: "Service unavailable.", status: 503 };

  const { data: existing } = await supabase.from("leads").select("pipeline_stage, status").eq("id", input.leadId).maybeSingle();
  if (!existing) return { ok: false as const, error: "Lead not found.", status: 404 };

  const from = isLeadPipelineStage(String(existing.pipeline_stage ?? ""))
    ? (existing.pipeline_stage as LeadPipelineStage)
    : mapLegacyStatusToStage(String(existing.status ?? "new"));

  const gate = canTransitionLeadStage({
    from,
    to: input.toStage,
    allowReopen: Boolean(input.allowReopen && roleHasCapability(input.actorRole, "applications.assign")),
  });
  if (!gate.ok) return { ok: false as const, error: gate.error, status: 400 };

  const lost = assertLostReason(input.toStage, input.lostReason);
  if (!lost.ok) return { ok: false as const, error: lost.error, status: 400 };

  return transitionLeadStage(input);
}

/** Eligible CRM assignees for admin reassignment / convert (not customers). */
export async function listEligibleLeadAssignees(): Promise<
  Array<{ id: string; label: string; kind: "admin" | "agency_partner" }>
> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const [{ data: profiles }, { data: partners }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, name, role")
      .in("role", ["admin", "super_admin", "staff", "team", "employee", "processor"])
      .limit(200),
    supabase
      .from("agency_partners")
      .select("user_id, business_name, partner_code, status, kyc_status")
      .eq("status", "active")
      .eq("kyc_status", "approved")
      .limit(200),
  ]);

  const rows: Array<{ id: string; label: string; kind: "admin" | "agency_partner" }> = [];
  for (const p of profiles ?? []) {
    rows.push({
      id: String(p.id),
      label: String(p.full_name || p.name || p.id),
      kind: "admin",
    });
  }
  for (const ap of partners ?? []) {
    if (!ap.user_id) continue;
    rows.push({
      id: String(ap.user_id),
      label: String(ap.business_name || ap.partner_code || ap.user_id),
      kind: "agency_partner",
    });
  }
  return rows;
}
