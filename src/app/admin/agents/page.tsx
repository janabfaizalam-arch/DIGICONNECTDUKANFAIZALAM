import Link from "next/link";
import { redirect } from "next/navigation";
import { Eye, Search, UserPlus } from "lucide-react";

import { AdminEmptyState, AdminPageHeader, AdminStatCard } from "@/components/admin/admin-shell";
import { AgentStatusButton } from "@/components/portal/agent-status-button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { safeCurrency } from "@/lib/admin-format";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import type { PortalUser } from "@/lib/portal-types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type AdminAgentsPageProps = {
  searchParams?: Promise<{ q?: string }>;
};

type AgentRow = PortalUser & {
  total: number;
  leads: number;
  pending: number;
  completed: number;
  pendingCommission: number;
};

function isAgentActive(agent: PortalUser) {
  return agent.is_active ?? agent.active ?? true;
}

function matchesAgentSearch(agent: AgentRow, query: string) {
  const haystack = [
    agent.full_name,
    agent.mobile,
    agent.email,
    agent.agent_code,
    agent.address,
    agent.area,
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(query.toLowerCase());
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${active ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
      {active ? "Active" : "Inactive"}
    </span>
  );
}

export default async function AdminAgentsPage({ searchParams }: AdminAgentsPageProps) {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  const params = await searchParams;
  const query = String(params?.q ?? "").trim();
  const supabase = getSupabaseAdmin();
  let agents = [] as AgentRow[];

  if (supabase) {
    try {
      const [agentResult, applicationResult, commissionResult, leadResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, email, avatar_url, role, mobile, agent_code, address, area, commission_type, commission_value, commission_rate, active, is_active, created_at, updated_at")
          .eq("role", "agent")
          .order("created_at", { ascending: false }),
        supabase.from("applications").select("id, agent_id, assigned_agent_id, created_by, status"),
        supabase.from("commissions").select("agent_id, amount, status"),
        supabase.from("leads").select("id, agent_id"),
      ]);

      const agentData = agentResult.error ? [] : agentResult.data ?? [];
      const applicationData = applicationResult.error ? [] : applicationResult.data ?? [];
      const commissionData = commissionResult.error ? [] : commissionResult.data ?? [];
      const leadData = leadResult.error ? [] : leadResult.data ?? [];

      agents = ((agentData ?? []) as PortalUser[]).map((agent) => {
        const applications = (applicationData ?? []).filter(
          (application) =>
            application.agent_id === agent.id ||
            application.assigned_agent_id === agent.id ||
            application.created_by === agent.id,
        );
        const commissions = (commissionData ?? []).filter((commission) => commission.agent_id === agent.id && commission.status === "pending");
        const leads = (leadData ?? []).filter((lead) => lead.agent_id === agent.id);

        return {
          ...agent,
          total: applications.length,
          leads: leads.length,
          pending: applications.filter((application) => application.status !== "completed").length,
          completed: applications.filter((application) => application.status === "completed").length,
          pendingCommission: commissions.reduce((total, commission) => total + Number(commission.amount ?? 0), 0),
        };
      });
    } catch (error) {
      console.error("[admin-agents] Failed to load agents", error);
    }
  }

  const visibleAgents = query ? agents.filter((agent) => matchesAgentSearch(agent, query)) : agents;

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Agents"
        title="Agent Management"
        description="Create agent IDs, control login access, and review agent workload from one admin screen."
        action={
          <Link href="/admin/agents/new" className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-4 text-sm font-bold text-white">
            <UserPlus className="h-4 w-4" />
            Create Agent
          </Link>
        }
      />

      <div className="grid gap-3 md:grid-cols-4">
        <AdminStatCard title="Total Agents" value={agents.length} icon="userCheck" tone="blue" />
        <AdminStatCard title="Active Agents" value={agents.filter((agent) => isAgentActive(agent)).length} icon="users" tone="green" />
        <AdminStatCard title="Agent Leads" value={agents.reduce((total, agent) => total + agent.leads, 0)} icon="inbox" tone="orange" />
        <AdminStatCard title="Pending Commission" value={safeCurrency(agents.reduce((total, agent) => total + agent.pendingCommission, 0))} icon="indianRupee" tone="slate" />
      </div>

      <Card className="overflow-hidden p-4 md:p-6">
        <form className="mb-4 flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input name="q" defaultValue={query} placeholder="Search name, mobile, email, or agent code" className="pl-11" />
          </div>
          <button type="submit" className="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-950 px-5 text-sm font-bold text-white">
            Search
          </button>
        </form>

        {!visibleAgents.length ? (
          <AdminEmptyState
            title={agents.length ? "No matching agents" : "No agents yet"}
            description={agents.length ? "Try another name, mobile, email, or agent code." : "Create your first agent ID to begin assigning leads and applications."}
          />
        ) : null}

        {visibleAgents.length ? (
          <div className="hidden overflow-x-auto lg:block">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Agent Code</TableHead>
                  <TableHead>Area</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Leads</TableHead>
                  <TableHead>Applications</TableHead>
                  <TableHead>Pending Commission</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleAgents.map((agent) => {
                  const active = isAgentActive(agent);

                  return (
                    <TableRow key={agent.id}>
                      <TableCell className="font-bold">{agent.full_name || "Agent"}</TableCell>
                      <TableCell className="font-mono">{agent.mobile || "-"}</TableCell>
                      <TableCell>{agent.email}</TableCell>
                      <TableCell className="font-mono">{agent.agent_code || "-"}</TableCell>
                      <TableCell>{agent.area || agent.address || "-"}</TableCell>
                      <TableCell>
                        <span className="capitalize">{agent.commission_type ?? "fixed"}</span> {agent.commission_value ?? agent.commission_rate ?? 0}
                      </TableCell>
                      <TableCell><StatusBadge active={active} /></TableCell>
                      <TableCell>{agent.leads}</TableCell>
                      <TableCell>{agent.total}</TableCell>
                      <TableCell>{safeCurrency(agent.pendingCommission)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <Link href={`/admin/agents/${agent.id}`} className="inline-flex h-9 items-center justify-center gap-2 rounded-full border bg-white px-3 text-xs font-bold text-slate-900">
                            <Eye className="h-3.5 w-3.5" />
                            Edit/View
                          </Link>
                          <AgentStatusButton agentId={agent.id} isActive={active} />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : null}

        <div className="grid gap-3 lg:hidden">
          {visibleAgents.map((agent) => {
            const active = isAgentActive(agent);

            return (
              <div key={agent.id} className="rounded-2xl border bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-slate-950">{agent.full_name || "Agent"}</p>
                    <p className="mt-1 font-mono text-xs text-slate-500">{agent.agent_code || "-"}</p>
                  </div>
                  <StatusBadge active={active} />
                </div>
                <p className="mt-3 font-mono text-sm text-slate-700">{agent.mobile || "-"}</p>
                <p className="text-sm text-slate-600">{agent.email}</p>
                <p className="mt-1 text-sm text-slate-500">{agent.area || agent.address || "-"}</p>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Leads</p>
                    <p className="font-bold">{agent.leads}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Apps</p>
                    <p className="font-bold">{agent.total}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Pending</p>
                    <p className="font-bold">{safeCurrency(agent.pendingCommission)}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href={`/admin/agents/${agent.id}`} className="inline-flex h-9 items-center justify-center gap-2 rounded-full border bg-white px-3 text-xs font-bold text-slate-900">
                    <Eye className="h-3.5 w-3.5" />
                    Edit/View
                  </Link>
                  <AgentStatusButton agentId={agent.id} isActive={active} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
