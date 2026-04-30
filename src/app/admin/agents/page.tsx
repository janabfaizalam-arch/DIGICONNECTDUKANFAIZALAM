import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Eye, Pencil, UserPlus } from "lucide-react";

import { AgentStatusButton } from "@/components/portal/agent-status-button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { formatCurrency } from "@/lib/portal-data";
import type { PortalUser } from "@/lib/portal-types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type AgentRow = PortalUser & {
  total: number;
  pending: number;
  completed: number;
  pendingCommission: number;
};

export default async function AdminAgentsPage() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  const supabase = getSupabaseAdmin();
  let agents = [] as AgentRow[];

  if (supabase) {
    const [{ data: agentData }, { data: applicationData }, { data: commissionData }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url, role, mobile, agent_code, commission_type, commission_value, commission_rate, active, is_active")
        .eq("role", "agent")
        .order("created_at", { ascending: false }),
      supabase.from("applications").select("id, assigned_agent_id, created_by, status"),
      supabase.from("commissions").select("agent_id, amount, status"),
    ]);

    agents = ((agentData ?? []) as PortalUser[]).map((agent) => {
      const applications = (applicationData ?? []).filter(
        (application) => application.assigned_agent_id === agent.id || application.created_by === agent.id,
      );
      const commissions = (commissionData ?? []).filter((commission) => commission.agent_id === agent.id && commission.status === "pending");

      return {
        ...agent,
        total: applications.length,
        pending: applications.filter((application) => application.status !== "completed").length,
        completed: applications.filter((application) => application.status === "completed").length,
        pendingCommission: commissions.reduce((total, commission) => total + Number(commission.amount ?? 0), 0),
      };
    });
  }

  return (
    <main className="min-h-screen px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <Link href="/admin" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--primary)]">
              <ArrowLeft className="h-4 w-4" />
              Back to admin
            </Link>
            <h1 className="mt-4 text-3xl font-bold text-slate-950">Agent Management</h1>
          </div>
          <Link href="/admin/agents/new" className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-4 text-sm font-bold text-white">
            <UserPlus className="h-4 w-4" />
            Create Agent
          </Link>
        </div>

        <Card className="overflow-hidden p-4 md:p-6">
          <div className="hidden overflow-x-auto lg:block">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Agent Code</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead>Pending Commission</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.map((agent) => {
                  const active = agent.is_active ?? agent.active ?? true;

                  return (
                    <TableRow key={agent.id}>
                      <TableCell className="font-bold">{agent.full_name || "Agent"}</TableCell>
                      <TableCell className="font-mono">{agent.mobile || "-"}</TableCell>
                      <TableCell>{agent.email}</TableCell>
                      <TableCell className="font-mono">{agent.agent_code || "-"}</TableCell>
                      <TableCell className="capitalize">{agent.role}</TableCell>
                      <TableCell>
                        <span className="capitalize">{agent.commission_type ?? "fixed"}</span> {agent.commission_value ?? agent.commission_rate ?? 0}
                      </TableCell>
                      <TableCell className={active ? "font-bold text-emerald-700" : "font-bold text-red-700"}>
                        {active ? "Active" : "Inactive"}
                      </TableCell>
                      <TableCell>{agent.total}</TableCell>
                      <TableCell>{agent.completed}</TableCell>
                      <TableCell>{formatCurrency(agent.pendingCommission)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <Link href={`/admin/agents/${agent.id}`} className="inline-flex h-9 items-center justify-center gap-2 rounded-full border bg-white px-3 text-xs font-bold text-slate-900">
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </Link>
                          <Link href={`/admin/agents/${agent.id}`} className="inline-flex h-9 items-center justify-center gap-2 rounded-full border bg-white px-3 text-xs font-bold text-slate-900">
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
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

          <div className="grid gap-3 lg:hidden">
            {agents.map((agent) => {
              const active = agent.is_active ?? agent.active ?? true;

              return (
                <div key={agent.id} className="rounded-2xl border bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-slate-950">{agent.full_name || "Agent"}</p>
                      <p className="mt-1 font-mono text-xs text-slate-500">{agent.agent_code || "-"}</p>
                    </div>
                    <span className={active ? "text-sm font-bold text-emerald-700" : "text-sm font-bold text-red-700"}>
                      {active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="mt-3 font-mono text-sm text-slate-700">{agent.mobile || "-"}</p>
                  <p className="text-sm text-slate-600">{agent.email}</p>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">Total</p>
                      <p className="font-bold">{agent.total}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">Done</p>
                      <p className="font-bold">{agent.completed}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">Pending</p>
                      <p className="font-bold">{formatCurrency(agent.pendingCommission)}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link href={`/admin/agents/${agent.id}`} className="inline-flex h-9 items-center justify-center gap-2 rounded-full border bg-white px-3 text-xs font-bold text-slate-900">
                      <Eye className="h-3.5 w-3.5" />
                      View
                    </Link>
                    <AgentStatusButton agentId={agent.id} isActive={active} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </main>
  );
}
