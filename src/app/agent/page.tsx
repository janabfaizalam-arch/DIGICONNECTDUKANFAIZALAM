import Link from "next/link";
import { redirect } from "next/navigation";
import { FilePlus2, UsersRound } from "lucide-react";

import { Card } from "@/components/ui/card";
import { getCurrentUser, getCurrentUserRole, isAgentRole } from "@/lib/auth";
import { getCustomerName, hydrateApplications } from "@/lib/crm";
import { formatCurrency } from "@/lib/portal-data";
import type { Application, Commission } from "@/lib/portal-types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function statusCount(applications: Application[], statuses: string[]) {
  return applications.filter((application) => statuses.includes(application.status)).length;
}

export default async function AgentDashboardPage() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) {
    redirect("/login");
  }

  if (!isAgentRole(role)) {
    redirect("/dashboard");
  }

  const supabase = getSupabaseAdmin();
  let applications = [] as Application[];
  let commissions = [] as Commission[];

  if (supabase) {
    const [{ data: applicationData }, { data: commissionData }] = await Promise.all([
      supabase
        .from("applications")
        .select("*")
        .or(`created_by.eq.${user.id},assigned_agent_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase.from("commissions").select("*").eq("agent_id", user.id).order("created_at", { ascending: false }),
    ]);

    applications = (await hydrateApplications((applicationData ?? []) as Application[])) as Application[];
    commissions = (commissionData ?? []) as Commission[];
  }

  const totalCommission = commissions
    .filter((commission) => commission.status !== "paid" && commission.status !== "rejected")
    .reduce((total, commission) => total + Number(commission.amount ?? 0), 0);

  return (
    <main className="min-h-screen px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--secondary)]">Agent Panel</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-950">My Leads and Commission</h1>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Link href="/agent/customers/new" className="inline-flex h-11 items-center justify-center gap-2 rounded-full border bg-white px-4 text-sm font-bold text-slate-900">
              <UsersRound className="h-4 w-4" />
              New Customer
            </Link>
            <Link href="/agent/applications/new" className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-4 text-sm font-bold text-white">
              <FilePlus2 className="h-4 w-4" />
              New Application
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {[
            ["Total Leads", applications.length],
            ["Pending", statusCount(applications, ["new", "documents_pending", "payment_pending"])],
            ["In Progress", statusCount(applications, ["in_process", "submitted"])],
            ["Completed", statusCount(applications, ["completed"])],
            ["Estimated Commission", formatCurrency(totalCommission)],
          ].map(([label, value]) => (
            <Card key={label} className="p-4">
              <p className="text-xs font-medium text-slate-500">{label}</p>
              <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
            </Card>
          ))}
        </div>

        <Card className="p-4 md:p-6">
          <h2 className="text-lg font-bold text-slate-950">Recent Applications</h2>
          <div className="mt-4 grid gap-3">
            {applications.length ? (
              applications.slice(0, 8).map((application) => (
                <Link
                  key={application.id}
                  href={`/agent/applications/${application.id}`}
                  className="grid gap-2 rounded-2xl border bg-white p-4 md:grid-cols-[1fr_180px_140px]"
                >
                  <div>
                    <p className="font-bold text-slate-950">{getCustomerName(application)}</p>
                    <p className="text-sm text-slate-600">{application.service_name}</p>
                  </div>
                  <p className="font-mono text-sm text-slate-600">{application.payment_status ?? "pending"}</p>
                  <p className="text-sm font-bold capitalize text-[var(--primary)]">{application.status.replace(/_/g, " ")}</p>
                </Link>
              ))
            ) : (
              <p className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-600">No agent applications yet.</p>
            )}
          </div>
        </Card>
      </div>
    </main>
  );
}
