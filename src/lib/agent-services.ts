import { portalServices } from "@/lib/portal-data";
import type { PortalUser, ServiceCatalogItem } from "@/lib/portal-types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type AgentPayoutType = "fixed" | "percentage";
export type AgentServiceVisibility = "all" | "selected_agents" | "selected_groups";

export type AgentService = {
  id: string;
  service_id: string | null;
  slug: string;
  title: string;
  description: string | null;
  category: string | null;
  customer_fee: number;
  agent_payout: number;
  payout_type: AgentPayoutType;
  payout_percentage: number;
  required_documents: string | null;
  processing_time: string | null;
  instructions: string | null;
  is_active: boolean;
  is_featured: boolean;
  visibility_type: AgentServiceVisibility;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
  assigned_agent_ids?: string[];
};

export type AgentServiceInput = Omit<AgentService, "id" | "created_at" | "updated_at" | "assigned_agent_ids"> & {
  assigned_agent_ids?: string[];
};

export type AgentServiceSource = Pick<ServiceCatalogItem, "id" | "slug" | "name" | "description" | "amount" | "commission_amount" | "commission_rate" | "required_documents" | "active">;
const unavailableAgentServiceSlugs = new Set(["pan-card", "cibil-credit-score-guidance"]);

function numberValue(value: unknown, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function normalizePayoutType(value: unknown): AgentPayoutType {
  return value === "percentage" ? "percentage" : "fixed";
}

function normalizeVisibility(value: unknown): AgentServiceVisibility {
  return value === "selected_agents" || value === "selected_groups" ? value : "all";
}

export function payoutForAgentService(service: Pick<AgentService, "customer_fee" | "agent_payout" | "payout_type" | "payout_percentage">) {
  if (service.payout_type === "percentage") {
    return Math.round((Number(service.customer_fee ?? 0) * Number(service.payout_percentage ?? 0)) / 100);
  }

  return Number(service.agent_payout ?? 0);
}

export function normalizeAgentService(row: Record<string, unknown>): AgentService {
  return {
    id: String(row.id ?? ""),
    service_id: row.service_id ? String(row.service_id) : null,
    slug: String(row.slug ?? row.id ?? ""),
    title: String(row.title ?? row.name ?? row.slug ?? "Service"),
    description: (row.description as string | null | undefined) ?? null,
    category: (row.category as string | null | undefined) ?? null,
    customer_fee: numberValue(row.customer_fee ?? row.amount),
    agent_payout: numberValue(row.agent_payout ?? row.commission_amount),
    payout_type: normalizePayoutType(row.payout_type),
    payout_percentage: numberValue(row.payout_percentage ?? row.commission_rate),
    required_documents: (row.required_documents as string | null | undefined) ?? null,
    processing_time: (row.processing_time as string | null | undefined) ?? null,
    instructions: (row.instructions as string | null | undefined) ?? null,
    is_active: Boolean(row.is_active ?? row.active ?? true),
    is_featured: Boolean(row.is_featured ?? false),
    visibility_type: normalizeVisibility(row.visibility_type),
    sort_order: numberValue(row.sort_order),
    created_at: row.created_at ? String(row.created_at) : undefined,
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
  };
}

export async function getAgentServiceSourceCatalog() {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return portalServices.map((service) => ({
      id: service.slug,
      slug: service.slug,
      name: service.title,
      description: service.description,
      amount: service.amount,
      commission_amount: Math.max(Math.round(service.amount * 0.2), 25),
      commission_rate: null,
      required_documents: service.documents,
      active: true,
    })) satisfies AgentServiceSource[];
  }

  const { data, error } = await supabase
    .from("service_catalog")
    .select("id, slug, name, description, amount, commission_amount, commission_rate, required_documents, active")
    .order("name", { ascending: true });

  if (error) {
    return [] as AgentServiceSource[];
  }

  return ((data ?? []) as AgentServiceSource[]).filter((service) => !unavailableAgentServiceSlugs.has(service.slug));
}

export async function getAdminAgentServices() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [] as AgentService[];

  const [servicesResult, assignmentsResult] = await Promise.all([
    supabase.from("agent_services").select("*").order("sort_order", { ascending: true }).order("title", { ascending: true }),
    supabase.from("agent_service_assignments").select("agent_service_id, agent_id"),
  ]);

  if (servicesResult.error) return [] as AgentService[];

  const assignments = ((assignmentsResult.data ?? []) as Array<{ agent_service_id: string; agent_id: string }>).reduce<Record<string, string[]>>((grouped, assignment) => {
    grouped[assignment.agent_service_id] = [...(grouped[assignment.agent_service_id] ?? []), assignment.agent_id];
    return grouped;
  }, {});

  return ((servicesResult.data ?? []) as Record<string, unknown>[]).map((row) => ({
    ...normalizeAgentService(row),
    assigned_agent_ids: assignments[String(row.id)] ?? [],
  }));
}

export async function getVisibleAgentServices(agentId: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [] as AgentService[];

  const [allResult, assignedResult] = await Promise.all([
    supabase
      .from("agent_services")
      .select("*")
      .eq("is_active", true)
      .eq("visibility_type", "all")
      .order("is_featured", { ascending: false })
      .order("sort_order", { ascending: true })
      .order("title", { ascending: true }),
    supabase
      .from("agent_service_assignments")
      .select("agent_services(*)")
      .eq("agent_id", agentId),
  ]);

  const assignedRows = (assignedResult.data ?? []) as unknown as Array<{ agent_services: Record<string, unknown> | Record<string, unknown>[] | null }>;
  const rows = [
    ...((allResult.data ?? []) as Record<string, unknown>[]),
    ...assignedRows
      .flatMap((item) => item.agent_services ?? [])
      .filter((item): item is Record<string, unknown> => Boolean(item)),
  ];

  const byId = new Map<string, AgentService>();
  rows.map(normalizeAgentService).forEach((service) => {
    if (service.is_active && !unavailableAgentServiceSlugs.has(service.slug)) byId.set(service.id, service);
  });

  return Array.from(byId.values()).sort((a, b) => Number(b.is_featured) - Number(a.is_featured) || a.sort_order - b.sort_order || a.title.localeCompare(b.title));
}

export async function getAdminAgentOptions() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [] as PortalUser[];

  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url, role, mobile, agent_code, active, is_active")
    .eq("role", "agent")
    .order("full_name", { ascending: true });

  return (data ?? []) as PortalUser[];
}

export async function replaceAgentServiceAssignments(agentServiceId: string, agentIds: string[] = []) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  await supabase.from("agent_service_assignments").delete().eq("agent_service_id", agentServiceId);

  const uniqueAgentIds = [...new Set(agentIds.filter(Boolean))];
  if (!uniqueAgentIds.length) return;

  await supabase.from("agent_service_assignments").insert(
    uniqueAgentIds.map((agentId) => ({
      agent_service_id: agentServiceId,
      agent_id: agentId,
    })),
  );
}
