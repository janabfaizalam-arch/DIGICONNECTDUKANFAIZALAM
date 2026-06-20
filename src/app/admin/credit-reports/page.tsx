// ============================================================
// Admin Portal Page — Credit Module Dashboard
// DigiConnect Dukan — Powered by RNOS India Pvt. Ltd.
// ============================================================

import { redirect } from "next/navigation";
import { getCurrentUser, isAdminUser } from "@/lib/auth";
import { getAdminCreditAnalytics } from "@/lib/credit/client";
import { CreditAdminDashboard } from "@/components/credit/credit-admin-dashboard";

export const dynamic = "force-dynamic";

export default async function AdminCreditDashboardPage() {
  // 1. Authenticate admin user
  const user = await getCurrentUser();
  const isAdmin = isAdminUser(user);

  if (!user || !isAdmin) {
    redirect("/login?redirect=/admin/credit-reports");
  }

  // 2. Load aggregated credit score metrics
  const analytics = await getAdminCreditAnalytics();

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 md:px-8 text-white relative">
      {/* Background radiant spots */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[300px] bg-gradient-to-b from-blue-600/5 to-transparent blur-[120px] pointer-events-none" />

      <div className="max-w-6xl mx-auto space-y-6 relative">
        <div className="border-b border-white/5 pb-4">
          <h1 className="text-3xl font-bold tracking-tight">Credit Module Admin Panel</h1>
          <p className="text-xs text-slate-400">Monitor credit check transactions, revenues, failed queries, and raw API audit logs</p>
        </div>

        {/* Render interactive client dashboard component */}
        <CreditAdminDashboard initialAnalytics={analytics} />
      </div>
    </div>
  );
}
