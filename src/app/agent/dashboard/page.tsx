import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Clock3, FileText, HandCoins, Inbox, IndianRupee, PlusCircle } from "lucide-react";

import { Card } from "@/components/ui/card";
import { getAgentApplications, getAgentCommissions, getAgentLeads } from "@/lib/agent-data";
import { getCurrentUser, isActiveAgent } from "@/lib/auth";
import { formatCurrency } from "@/lib/portal-data";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

async function getAgentProfile(userId: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data } = await supabase
    .from("profiles")
    .select("full_name, agent_code")
    .eq("id", userId)
    .eq("role", "agent")
    .maybeSingle();

  return data as { full_name?: string | null; agent_code?: string | null } | null;
}

export default async function AgentDashboardPage() {
  const user = await getCurrentUser();

  if (!user) redirect("/login/agent");
  if (!(await isActiveAgent(user))) redirect("/unauthorized");

  const [profile, leads, applications, commissions] = await Promise.all([
    getAgentProfile(user.id),
    getAgentLeads(user.id, 500),
    getAgentApplications(user.id, 500),
    getAgentCommissions(user.id, 500),
  ]);

  const pendingLeads = leads.filter((lead) => !["converted", "closed", "completed", "cancelled", "rejected"].includes(lead.status)).length;
  const processingApplications = applications.filter((application) =>
    ["in_process", "in_progress", "application_processing", "submitted", "submitted_to_department", "under_government_review", "documents_under_review"].includes(application.status),
  ).length;
  const completedServices = applications.filter((application) => application.status === "completed").length;
  const totalCommission = commissions.reduce((total, commission) => total + Number(commission.amount ?? 0), 0);
  const pendingCommission = commissions
    .filter((commission) => ["pending", "approved", "hold"].includes(commission.status))
    .reduce((total, commission) => total + Number(commission.amount ?? 0), 0);
  const paidCommission = commissions
    .filter((commission) => commission.status === "paid")
    .reduce((total, commission) => total + Number(commission.amount ?? 0), 0);

  const stats = [
    { label: "Total Leads", value: leads.length, icon: Inbox, tone: "text-blue-700 bg-blue-50" },
    { label: "Pending Leads", value: pendingLeads, icon: Clock3, tone: "text-orange-700 bg-orange-50" },
    { label: "Processing Applications", value: processingApplications, icon: FileText, tone: "text-slate-700 bg-slate-100" },
    { label: "Completed Services", value: completedServices, icon: CheckCircle2, tone: "text-emerald-700 bg-emerald-50" },
    { label: "Total Commission", value: formatCurrency(totalCommission), icon: HandCoins, tone: "text-blue-700 bg-blue-50" },
    { label: "Pending Commission", value: formatCurrency(pendingCommission), icon: HandCoins, tone: "text-orange-700 bg-orange-50" },
    { label: "Paid Commission", value: formatCurrency(paidCommission), icon: IndianRupee, tone: "text-emerald-700 bg-emerald-50" },
  ];

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 md:px-8 md:py-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-orange-600">Agent Panel</p>
              <h1 className="mt-2 text-2xl font-bold text-slate-950 md:text-3xl">{profile?.full_name || user.email || "Agent"}</h1>
              <p className="mt-1 font-mono text-sm font-semibold text-slate-500">{profile?.agent_code || "Agent"}</p>
            </div>
            <Link href="/agent/add-customer" className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-5 text-sm font-bold text-white">
              <PlusCircle className="h-4 w-4" />
              Add Customer
            </Link>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map(({ label, value, icon: Icon, tone }) => (
            <Card key={label} className="rounded-2xl p-4">
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}>
                <Icon className="h-5 w-5" />
              </span>
              <p className="mt-4 text-xs font-semibold text-slate-500">{label}</p>
              <p className="mt-2 text-xl font-bold text-slate-950">{value}</p>
            </Card>
          ))}
        </section>
      </div>
    </main>
  );
}
