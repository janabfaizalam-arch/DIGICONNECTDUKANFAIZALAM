import { NextResponse } from "next/server";

import { replaceAgentServiceAssignments, type AgentServiceInput, type AgentService } from "@/lib/agent-services";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

function jsonError(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

async function requireAdmin() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  if (!user || !isAdminRole(role)) return false;
  return true;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function numberValue(value: unknown, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}
function cleanPayload(input: Record<string, unknown>): AgentServiceInput {
  const title = String(input.title ?? "").trim();
  const slug = slugify(String(input.slug ?? title));
  const payoutType = input.payout_type === "percentage" ? "percentage" : "fixed";
  const visibilityType = input.visibility_type === "selected_agents" || input.visibility_type === "selected_groups" ? input.visibility_type : "all";

  return {
    service_id: input.service_id ? String(input.service_id) : null,
    slug,
    title,
    description: String(input.description ?? "").trim() || null,
    category: String(input.category ?? "").trim() || null,
    customer_fee: numberValue(input.customer_fee),
    agent_payout: numberValue(input.agent_payout),
    payout_type: payoutType,
    payout_percentage: payoutType === "percentage" ? numberValue(input.payout_percentage) : 0,
    required_documents: String(input.required_documents ?? "").trim() || null,
    processing_time: String(input.processing_time ?? "").trim() || null,
    instructions: String(input.instructions ?? "").trim() || null,
    is_active: Boolean(input.is_active ?? true),
    is_featured: Boolean(input.is_featured ?? false),
    visibility_type: visibilityType,
    sort_order: Math.round(numberValue(input.sort_order)),
    assigned_agent_ids: Array.isArray(input.assigned_agent_ids) ? input.assigned_agent_ids.map(String).filter(Boolean) : [],

    // V2 Fields
    government_fee_type: (input.government_fee_type as AgentService["government_fee_type"]) ?? "not_applicable",
    government_fee_amount: numberValue(input.government_fee_amount),
    processing_fee: numberValue(input.processing_fee),
    eligibility: String(input.eligibility ?? "").trim() || null,
    faq: Array.isArray(input.faq) ? input.faq : [],
    terms: String(input.terms ?? "").trim() || null,
    important_notes: String(input.important_notes ?? "").trim() || null,
    popular: Boolean(input.popular),
    thumbnail: String(input.thumbnail ?? "").trim() || null,
    banner: String(input.banner ?? "").trim() || null,
    supported_states: Array.isArray(input.supported_states) ? input.supported_states.map(String) : [],
    supported_districts: Array.isArray(input.supported_districts) ? input.supported_districts.map(String) : [],
    supported_pincodes: Array.isArray(input.supported_pincodes) ? input.supported_pincodes.map(String) : [],
    variants: Array.isArray(input.variants) ? input.variants : [],
    required_documents_list: Array.isArray(input.required_documents_list) ? input.required_documents_list : [],
  };
}
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return jsonError("Admin access required.", 403);

  const supabase = getSupabaseAdmin();
  if (!supabase) return jsonError("Supabase service role key is missing.", 500);

  const { id } = await params;
  const payload = cleanPayload((await request.json()) as Record<string, unknown>);
  if (!payload.title || !payload.slug) return jsonError("Service title is required.", 400);

  const { assigned_agent_ids: assignedAgentIds, ...servicePayload } = payload;
  const { error } = await supabase
    .from("agent_services")
    .update({ ...servicePayload, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return jsonError(error.message, 500);

  await replaceAgentServiceAssignments(id, payload.visibility_type === "selected_agents" ? assignedAgentIds : []);

  return NextResponse.json({ message: "Agent service updated." });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return jsonError("Admin access required.", 403);

  const supabase = getSupabaseAdmin();
  if (!supabase) return jsonError("Supabase service role key is missing.", 500);

  const { id } = await params;
  const { error } = await supabase.from("agent_services").update({ is_active: false, updated_at: new Date().toISOString() }).eq("id", id);

  if (error) return jsonError(error.message, 500);

  return NextResponse.json({ message: "Agent service disabled." });
}
