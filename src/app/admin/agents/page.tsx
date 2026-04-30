import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { formatCurrency } from "@/lib/portal-data";
import type { PortalUser } from "@/lib/portal-types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AdminAgentsPage() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  const supabase = getSupabaseAdmin();
  let agents = [] as (PortalUser & { total?: number; pending?: number; completed?: number; commission?: number })[];

  if (supabase) {
    const [{ data: agentData }, { data: applicationData }, { data: commissionData }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, email, avatar_url, role, mobile, commission_rate, active").in("role", ["agent", "admin", "super_admin"]),
      supabase.from("applications").select("id, assigned_agent_id, created_by, status"),
      supabase.from("commissions").select("agent_id, amount, status"),
    ]);

    agents = ((agentData ?? []) as PortalUser[]).map((agent) => {
      const applications = (applicationData ?? []).filter(
        (application) => application.assigned_agent_id === agent.id || application.created_by === agent.id,
      );
      const commissions = (commissionData ?? []).filter((commission) => commission.agent_id === agent.id);

      return {
        ...agent,
        total: applications.length,
        pending: applications.filter((application) => application.status !== "completed").length,
        completed: applications.filter((application) => application.status === "completed").length,
        commission: commissions.reduce((total, commission) => total + Number(commission.amount ?? 0), 0),
      };
    });
  }

  return (
    <main className="min-h-screen px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-7xl space-y-5">
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--primary)]">
          <ArrowLeft className="h-4 w-4" />
          Back to admin
        </Link>
        <h1 className="text-3xl font-bold text-slate-950">Agents</h1>
        <Card className="overflow-hidden p-4 md:p-6">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Agent</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Pending</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead>Commission</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agents.map((agent) => (
                <TableRow key={agent.id}>
                  <TableCell className="font-bold">{agent.full_name || agent.email}</TableCell>
                  <TableCell className="capitalize">{agent.role}</TableCell>
                  <TableCell>{agent.total}</TableCell>
                  <TableCell>{agent.pending}</TableCell>
                  <TableCell>{agent.completed}</TableCell>
                  <TableCell>{formatCurrency(agent.commission ?? 0)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </main>
  );
}
