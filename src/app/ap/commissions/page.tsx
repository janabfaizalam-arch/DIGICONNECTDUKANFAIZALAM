import { redirect } from "next/navigation";
import { HandCoins, TrendingUp, CheckCircle } from "lucide-react";

import { Card } from "@/components/ui/card";
import { getAPCommissions, getAgencyPartnerByUserId } from "@/lib/ap-data";
import { getCurrentUser, isActiveAgent } from "@/lib/auth";
import { formatCurrency } from "@/lib/portal-data";

export const dynamic = "force-dynamic";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export default async function APCommissionsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/ap/login");
  }

  if (!(await isActiveAgent(user))) {
    redirect("/unauthorized");
  }

  const ap = await getAgencyPartnerByUserId(user.id);
  if (!ap) {
    redirect("/unauthorized");
  }

  const commissions = await getAPCommissions(ap.id);

  const totalCommission = commissions.reduce(
    (total, c) => total + Number(c.calculated_amount ?? 0),
    0
  );
  const pendingCommission = commissions
    .filter((c) => c.status === "pending" || c.status === "earned" || c.status === "approved")
    .reduce((total, c) => total + Number(c.calculated_amount ?? 0),
    0
  );
  const paidCommission = commissions
    .filter((c) => c.status === "paid")
    .reduce((total, c) => total + Number(c.calculated_amount ?? 0),
    0
  );

  const commissionStats = [
    {
      label: "Total Commission",
      value: totalCommission,
      icon: HandCoins,
      gradient: "from-blue-500/20 to-cyan-500/20 text-blue-400 border-blue-500/20",
    },
    {
      label: "Pending Verification",
      value: pendingCommission,
      icon: TrendingUp,
      gradient: "from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/20",
    },
    {
      label: "Total Paid Out",
      value: paidCommission,
      icon: CheckCircle,
      gradient: "from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/20",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <div className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-blue-400">
            Agency Partner Ecosystem
          </div>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white md:text-5xl">
            My Commissions
          </h1>
          <p className="mt-2 text-slate-400 max-w-2xl text-sm">
            Review your earnings, rule overrides, and commission statuses calculated by the hierarchical commission engine.
          </p>
        </div>

        {/* Commission Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          {commissionStats.map(({ label, value, icon: Icon, gradient }) => (
            <Card
              key={label}
              className={`border border-white/5 bg-slate-900/20 p-5 backdrop-blur-md rounded-2xl ${gradient.split(" ")[2]}`}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-500">{label}</p>
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 border ${gradient}`}>
                  <Icon className="h-4.5 w-4.5" />
                </span>
              </div>
              <p className="mt-4 text-2xl font-black tracking-tight text-white">
                {formatCurrency(value)}
              </p>
            </Card>
          ))}
        </div>

        {/* Commission History */}
        <Card className="border border-white/5 bg-slate-900/20 backdrop-blur-md rounded-3xl p-5 md:p-7 overflow-hidden">
          <h2 className="text-lg font-bold text-white mb-4">Earning Logs</h2>
          <div className="space-y-3">
            {commissions.length ? (
              commissions.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-col gap-4 rounded-xl border border-white/5 bg-slate-900/30 p-4 transition-all duration-150 hover:bg-slate-900/50 md:flex-row md:items-center md:justify-between"
                >
                  <div className="space-y-1">
                    <p className="font-extrabold text-white text-sm">
                      {c.service_name || "Premium Digital Service"}
                    </p>
                    <p className="font-mono text-xs text-slate-500">
                      Rule Type: <span className="capitalize text-slate-400">{c.commission_type}</span>
                      {c.commission_rate ? ` (${c.commission_rate}%)` : ""}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 shrink-0 justify-between md:justify-end">
                    <p className="text-lg font-black text-white">{formatCurrency(c.calculated_amount)}</p>
                    
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold capitalize border ${
                        c.status === "paid"
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                          : c.status === "approved"
                          ? "bg-blue-500/10 border-blue-500/20 text-blue-400"
                          : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                      }`}
                    >
                      {c.status}
                    </span>

                    <p className="text-xs text-slate-500 font-mono">{formatDate(c.created_at)}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-slate-500">
                No commission transactions recorded yet.
              </p>
            )}
          </div>
        </Card>
      </div>
    </main>
  );
}
