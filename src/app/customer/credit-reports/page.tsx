// ============================================================
// Customer Portal Page — Credit Score & Reports List
// DigiConnect Dukan — Powered by RNOS India Pvt. Ltd.
// ============================================================

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getCustomerCreditHistory } from "@/lib/credit/client";
import { CreditDashboardWidget } from "@/components/credit/credit-dashboard-widget";
import { CreditHistoryTable } from "@/components/credit/credit-history-table";

export const dynamic = "force-dynamic";

export default async function CustomerCreditReportsPage() {
  // 1. Authenticate user
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?redirect=/customer/credit-reports");
  }

  // 2. Load historical checks list
  const history = await getCustomerCreditHistory(user.id);
  const latestCheck = history.length > 0 ? history[0] : null;

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 md:px-8 text-white relative">
      {/* Glow spots */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[250px] bg-gradient-to-b from-blue-600/5 to-transparent blur-[120px] pointer-events-none" />

      <div className="max-w-4xl mx-auto space-y-8 relative">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/5 pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">My Credit Reports</h1>
            <p className="text-xs text-slate-400">Track and view your bureau ratings and credit check histories</p>
          </div>
        </div>

        {/* Top Summary Widget */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          <div className="md:col-span-1">
            <CreditDashboardWidget latestCheck={latestCheck} />
          </div>
          
          <div className="md:col-span-2 bg-white/5 border border-white/5 p-6 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">How is your score calculated?</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Bureaus calculate your score based on active loan timelines, card overdraft payments, debt limits, and hard query counts. A good score (above 750) helps you get faster, lower-interest approvals.
            </p>
            <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-300">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                Excellent (750 - 900)
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                Good (650 - 749)
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-orange-500" />
                Fair (550 - 649)
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                Poor (300 - 549)
              </div>
            </div>
          </div>
        </div>

        {/* History checks list */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold">Query History</h2>
          <CreditHistoryTable entries={history} />
        </div>
      </div>
    </div>
  );
}
