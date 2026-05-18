import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { Application, Commission } from "@/lib/portal-types";
import { hydrateApplications } from "@/lib/crm";

export async function getAgentApplications(agentId: string, limit = 100) {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return [] as Application[];
  }

  const { data } = await supabase
    .from("applications")
    .select("*")
    .or(`agent_id.eq.${agentId},created_by.eq.${agentId},created_by_agent_id.eq.${agentId},assigned_agent_id.eq.${agentId}`)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (await hydrateApplications((data ?? []) as Application[])) as Application[];
}

export async function getAgentAssignedApplications(agentId: string, limit = 100) {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return [] as Application[];
  }

  const { data: assignmentRows } = await supabase
    .from("assignments")
    .select("application_id")
    .eq("agent_id", agentId)
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(limit);
  const assignmentIds = (assignmentRows ?? []).map((row) => String(row.application_id)).filter(Boolean);

  const { data } = await supabase
    .from("applications")
    .select("*")
    .or(`assigned_agent_id.eq.${agentId}${assignmentIds.length ? `,id.in.(${assignmentIds.join(",")})` : ""}`)
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
