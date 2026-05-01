import { redirect } from "next/navigation";
import { HandCoins, IndianRupee } from "lucide-react";

import { Card } from "@/components/ui/card";
import { getAgentCommissions } from "@/lib/agent-data";
import { getCurrentUser, isActiveAgent } from "@/lib/auth";
import { asRecord, textValue } from "@/lib/crm";
import { formatCurrency } from "@/lib/portal-data";

export const dynamic = "force-dynamic";

const commissionStats = [
  { label: "Total Commission", key: "total", icon: HandCoins, tone: "text-[var(--primary)]" },
  { label: "Pending Commission", key: "pending", icon: HandCoins, tone: "text-orange-600" },
  { label: "Paid Commission", key: "paid", icon: IndianRupee, tone: "text-emerald-600" },
] as const;

type CommissionApplication = {
  service_name?: string | null;
  form_data?: Record<string, unknown> | null;
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(date));
}

function getCommissionApplication(value: unknown) {
  return value && typeof value === "object" ? (value as CommissionApplication) : null;
}

export default async function AgentCommissionsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login/agent");
  }

  if (!(await isActiveAgent(user))) {
    redirect("/unauthorized");
  }

  const commissions = await getAgentCommissions(user.id);
  const totalCommission = commissions.reduce((total, commission) => total + Number(commission.amount ?? 0), 0);
  const pendingCommission = commissions
    .filter((commission) => commission.status === "pending" || commission.status === "approved")
    .reduce((total, commission) => total + Number(commission.amount ?? 0), 0);
  const paidCommission = commissions
    .filter((commission) => commission.status === "paid")
    .reduce((total, commission) => total + Number(commission.amount ?? 0), 0);

  return (
    <main className="min-h-screen px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--secondary)]">Agent Commissions</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950 md:text-5xl">My Commission</h1>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {commissionStats.map(({ label, key, icon: Icon, tone }) => {
            const value = key === "total" ? totalCommission : key === "pending" ? pendingCommission : paidCommission;

            return (
            <Card key={label} className="rounded-2xl p-5">
              <Icon className={`h-5 w-5 ${tone}`} />
              <p className="mt-4 text-sm font-medium text-slate-500">{label}</p>
              <p className="mt-2 text-2xl font-bold text-slate-950">{formatCurrency(value)}</p>
            </Card>
            );
          })}
        </div>

        <Card className="rounded-2xl p-4 md:p-6">
          <h2 className="text-lg font-bold text-slate-950">Commission History</h2>
          <div className="mt-4 grid gap-3">
            {commissions.length ? (
              commissions.map((commission) => {
                const application = getCommissionApplication(commission.applications);
                const formData = asRecord(application?.form_data);
                const customerName = textValue(formData.name) || "Customer";

                return (
                  <div key={commission.id} className="grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-[1fr_140px_120px_120px] md:items-center">
                    <div>
                      <p className="font-bold text-slate-950">{application?.service_name || "Service"}</p>
                      <p className="mt-1 text-sm text-slate-600">{customerName}</p>
                    </div>
                    <p className="text-lg font-bold text-slate-950">{formatCurrency(commission.amount)}</p>
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-center text-xs font-bold capitalize text-blue-700">
                      {commission.status}
                    </span>
                    <p className="text-sm text-slate-600">{formatDate(commission.created_at)}</p>
                  </div>
                );
              })
            ) : (
              <p className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-600">No commission records yet.</p>
            )}
          </div>
        </Card>
      </div>
    </main>
  );
}
