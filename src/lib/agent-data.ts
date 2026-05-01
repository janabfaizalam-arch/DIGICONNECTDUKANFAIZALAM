import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { Application, Commission, Customer, Lead } from "@/lib/portal-types";
import { hydrateApplications } from "@/lib/crm";

export type AgentLead = Lead & {
  customer_name?: string | null;
  city?: string | null;
  notes?: string | null;
  agent_id?: string | null;
};

export async function getAgentLeads(agentId: string, limit = 100) {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return [] as AgentLead[];
  }

  const { data } = await supabase
    .from("leads")
    .select("id, name, customer_name, mobile, service, city, message, notes, status, agent_id, created_at")
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []) as AgentLead[];
}

export async function getAgentCustomers(agentId: string, limit = 100) {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return [] as Customer[];
  }

  const { data } = await supabase
    .from("customers")
    .select("*")
    .or(`created_by.eq.${agentId},assigned_agent_id.eq.${agentId}`)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []) as Customer[];
}

export async function getAgentApplications(agentId: string, limit = 100) {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return [] as Application[];
  }

  const { data } = await supabase
    .from("applications")
    .select("*")
    .or(`agent_id.eq.${agentId},created_by.eq.${agentId},assigned_agent_id.eq.${agentId}`)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (await hydrateApplications((data ?? []) as Application[])) as Application[];
}

export async function getAgentCommissions(agentId: string, limit = 100) {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return [] as Commission[];
  }

  const { data } = await supabase
    .from("commissions")
    .select("*, applications(id, service_name, amount, created_at, form_data, customer_id)")
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []) as Commission[];
}
