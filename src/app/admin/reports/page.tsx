import { redirect } from "next/navigation";

import { AdminPageHeader, AdminStatCard } from "@/components/admin/admin-shell";
import { safeCurrency } from "@/lib/admin-format";
import { getAdminDashboardStats } from "@/lib/admin/admin-dashboard";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  const stats = await getAdminDashboardStats();

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader eyebrow="Reports" title="Operational Reports" description="Read-only backend-calculated totals for applications, finance, wallet liability, and commissions." />
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard title="This Month Applications" value={stats.thisMonthApplications} icon="calendarDays" tone="blue" />
        <AdminStatCard title="Rejected / Cancelled" value={stats.rejectedApplications} icon="fileClock" tone="slate" />
        <AdminStatCard title="Cashback Issued" value={safeCurrency(stats.totalCashbackIssued)} icon="badgePercent" tone="orange" />
        <AdminStatCard title="Paid Commissions" value={safeCurrency(stats.paidCommissions)} icon="indianRupee" tone="green" />
      </section>
    </div>
  );
}
