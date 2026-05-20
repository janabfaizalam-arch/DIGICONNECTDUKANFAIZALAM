import { NextResponse } from "next/server";

import { getAdminAgentServices, replaceAgentServiceAssignments, type AgentServiceInput } from "@/lib/agent-services";
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
  };
}

export async function GET() {
  if (!(await requireAdmin())) return jsonError("Admin access required.", 403);
  return NextResponse.json({ services: await getAdminAgentServices() });
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) return jsonError("Admin access required.", 403);

  const supabase = getSupabaseAdmin();
  if (!supabase) return jsonError("Supabase service role key is missing.", 500);

  const payload = cleanPayload((await request.json()) as Record<string, unknown>);
  if (!payload.title || !payload.slug) return jsonError("Service title is required.", 400);

  const { assigned_agent_ids: assignedAgentIds, ...servicePayload } = payload;
  const { data, error } = await supabase.from("agent_services").insert(servicePayload).select("id").single();

  if (error || !data) return jsonError(error?.message ?? "Agent service could not be created.", 500);

  if (payload.visibility_type === "selected_agents") {
    await replaceAgentServiceAssignments(data.id, assignedAgentIds);
  }

  return NextResponse.json({ message: "Agent service created.", serviceId: data.id });
}
