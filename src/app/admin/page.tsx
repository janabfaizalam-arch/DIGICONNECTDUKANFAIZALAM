import { redirect } from "next/navigation";
import Link from "next/link";

import { AdminPageHeader, AdminStatCard } from "@/components/admin/admin-shell";
import { getAdminDashboardStats } from "@/lib/admin/admin-dashboard";
import { safeCurrency, safeDateTime } from "@/lib/admin-format";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  const stats = await getAdminDashboardStats();

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="Admin"
        title="Control Room"
        description="Backend-calculated operating snapshot. Counts are read server-side from canonical tables and do not depend on client guesses."
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Link href="/admin/customers"><AdminStatCard title="Total Customers" value={stats.totalCustomers} icon="users" tone="blue" /></Link>
        <Link href="/admin/applications"><AdminStatCard title="Total Applications" value={stats.totalApplications} icon="fileText" tone="green" /></Link>
        <Link href="/admin/applications?filter=today"><AdminStatCard title="Today Applications" value={stats.todayApplications} icon="calendarDays" tone="orange" /></Link>
        <Link href="/admin/payments"><AdminStatCard title="Verified Payments" value={stats.verifiedPayments} icon="receiptText" tone="green" /></Link>
        <Link href="/admin/applications?status=payment_pending"><AdminStatCard title="Pending Applications" value={stats.pendingApplications} icon="fileClock" tone="orange" /></Link>
        <Link href="/admin/applications?status=in_process"><AdminStatCard title="Processing" value={stats.processingApplications} icon="listChecks" tone="blue" /></Link>
        <Link href="/admin/applications?status=completed"><AdminStatCard title="Completed" value={stats.completedApplications} icon="clipboardList" tone="green" /></Link>
        <Link href="/admin/documents"><AdminStatCard title="Missing Documents" value={stats.missingDocumentApplications} icon="inbox" tone="orange" /></Link>
        <Link href="/admin/payments"><AdminStatCard title="Paid Amount" value={safeCurrency(stats.totalPaidAmount)} icon="indianRupee" tone="green" /></Link>
        <Link href="/admin/wallet"><AdminStatCard title="Wallet Balance" value={safeCurrency(stats.walletTotalBalance)} icon="wallet" tone="blue" /></Link>
        <Link href="/admin/wallet"><AdminStatCard title="Rewards Issued" value={safeCurrency(stats.totalRewardsIssued)} icon="gift" tone="orange" /></Link>
        <Link href="/admin/commissions"><AdminStatCard title="Unpaid Commissions" value={safeCurrency(stats.unpaidCommissions)} icon="badgePercent" tone="slate" /></Link>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-950">Recently Submitted Applications</h2>
          <Link href="/admin/applications" className="text-sm font-bold text-blue-700 hover:text-blue-900">View all</Link>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.12em] text-slate-500">
              <tr>
                <th className="py-3">Application</th>
                <th className="py-3">Customer</th>
                <th className="py-3">Mobile</th>
                <th className="py-3">Status</th>
                <th className="py-3">Payment</th>
                <th className="py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats.recentlySubmittedApplications.map((application) => (
                <tr key={application.id}>
                  <td className="py-3">
                    <Link href={`/admin/applications/${application.id}`} className="font-bold text-blue-700 hover:text-blue-900">
                      {application.serviceName}
                    </Link>
                  </td>
                  <td className="py-3 text-slate-700">{application.customerName}</td>
                  <td className="py-3 font-mono text-xs text-slate-600">{application.customerMobile || "Not available"}</td>
                  <td className="py-3 font-bold capitalize text-slate-700">{application.status.replace(/_/g, " ")}</td>
                  <td className="py-3 font-bold capitalize text-slate-700">{application.paymentStatus.replace(/_/g, " ")}</td>
                  <td className="py-3 text-slate-600">{safeDateTime(application.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!stats.recentlySubmittedApplications.length ? <p className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-600">No applications yet.</p> : null}
        </div>
      </section>
    </div>
  );
}
