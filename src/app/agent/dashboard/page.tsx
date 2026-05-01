import Link from "next/link";
import { redirect } from "next/navigation";
import { ClipboardList, HandCoins, IndianRupee, UsersRound } from "lucide-react";

import { LogoutButton } from "@/components/auth/logout-button";
import { StatusBadge } from "@/components/portal/status-badge";
import { Card } from "@/components/ui/card";
import { getAgentApplications, getAgentCommissions, getAgentCustomers, getAgentLeads } from "@/lib/agent-data";
import { getCurrentUser, isActiveAgent } from "@/lib/auth";
import { getCustomerName } from "@/lib/crm";
import { formatCurrency } from "@/lib/portal-data";

export const dynamic = "force-dynamic";

const statCards = [
  { label: "Total Leads", key: "leads", icon: ClipboardList, tone: "text-[var(--primary)]" },
  { label: "Total Customers", key: "customers", icon: UsersRound, tone: "text-blue-700" },
  { label: "Applications Submitted", key: "applications", icon: ClipboardList, tone: "text-orange-600" },
  { label: "Pending Commission", key: "pendingCommission", icon: HandCoins, tone: "text-orange-600" },
  { label: "Paid Commission", key: "paidCommission", icon: IndianRupee, tone: "text-emerald-600" },
] as const;

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(date));
}

export default async function AgentDashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login/agent");
  }

  if (!(await isActiveAgent(user))) {
    redirect("/unauthorized");
  }

  const [leads, customers, applications, commissions] = await Promise.all([
    getAgentLeads(user.id, 8),
    getAgentCustomers(user.id, 200),
    getAgentApplications(user.id, 8),
    getAgentCommissions(user.id, 100),
  ]);
  const pendingCommission = commissions
    .filter((commission) => commission.status === "pending" || commission.status === "approved")
    .reduce((total, commission) => total + Number(commission.amount ?? 0), 0);
  const paidCommission = commissions
    .filter((commission) => commission.status === "paid")
    .reduce((total, commission) => total + Number(commission.amount ?? 0), 0);

  return (
    <main className="min-h-screen px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--secondary)]">Agent Dashboard</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-950 md:text-5xl">My Agent Workspace</h1>
            <p className="mt-3 max-w-2xl text-slate-600">Track your leads, customers, applications, and commissions from one panel.</p>
          </div>
          <LogoutButton className="h-11 w-full md:w-auto" />
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {statCards.map(({ label, key, icon: Icon, tone }) => {
            const value =
              key === "leads"
                ? leads.length
                : key === "customers"
                  ? customers.length
                  : key === "applications"
                    ? applications.length
                    : key === "pendingCommission"
                      ? formatCurrency(pendingCommission)
                      : formatCurrency(paidCommission);

            return (
            <Card key={label} className="rounded-2xl p-4 md:p-5">
              <Icon className={`h-5 w-5 ${tone}`} />
              <p className="mt-4 text-xs font-medium text-slate-500">{label}</p>
              <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
            </Card>
            );
          })}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="rounded-2xl p-4 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-slate-950">Recent Leads</h2>
              <Link href="/agent/leads" className="text-sm font-bold text-[var(--primary)]">View all</Link>
            </div>
            <div className="mt-4 grid gap-3">
              {leads.length ? leads.map((lead) => (
                <div key={lead.id} className="rounded-2xl border bg-white p-4">
                  <p className="font-bold text-slate-950">{lead.customer_name || lead.name}</p>
                  <p className="mt-1 text-sm text-slate-600">{lead.service} | {lead.mobile}</p>
                  <p className="mt-2 text-xs font-bold capitalize text-[var(--primary)]">{lead.status.replace(/_/g, " ")}</p>
                </div>
              )) : <p className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-600">No leads yet.</p>}
            </div>
          </Card>

          <Card className="rounded-2xl p-4 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-slate-950">Recent Applications</h2>
              <Link href="/agent/applications" className="text-sm font-bold text-[var(--primary)]">View all</Link>
            </div>
            <div className="mt-4 grid gap-3">
              {applications.length ? applications.map((application) => (
                <Link key={application.id} href={`/agent/applications/${application.id}`} className="grid gap-2 rounded-2xl border bg-white p-4 md:grid-cols-[1fr_auto] md:items-center">
                  <div>
                    <p className="font-bold text-slate-950">{getCustomerName(application)}</p>
                    <p className="mt-1 text-sm text-slate-600">{application.service_name} | {formatDate(application.created_at)}</p>
                  </div>
                  <StatusBadge status={application.status} />
                </Link>
              )) : <p className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-600">No applications yet.</p>}
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
