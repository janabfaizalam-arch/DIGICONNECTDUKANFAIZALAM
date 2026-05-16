import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, ArrowRight } from "lucide-react";

import { AdminPageHeader, AdminStatCard } from "@/components/admin/admin-shell";
import { AdminStatusBadge } from "@/components/admin/admin-status-badge";
import { getPaymentReconciliationSummary } from "@/lib/admin-payment-reconciliation";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { safeCurrency, safeDateTime } from "@/lib/admin-format";
import { getAdminApplications, getAdminCrmSummary, getAdminCustomerSummary, getAdminPaymentDiagnostics } from "@/lib/admin-crm";

export const dynamic = "force-dynamic";

function ShortId({ id }: { id: string }) {
  return <span className="font-mono text-xs text-slate-500">{id.slice(0, 8)}</span>;
}

export default async function AdminPage() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  const [summary, customers, recentApplications, pendingApplications, failedApplications, diagnostics, reconciliation] = await Promise.all([
    getAdminCrmSummary(),
    getAdminCustomerSummary(),
    getAdminApplications({ pageSize: 8 }),
    getAdminApplications({ status: "payment_pending", pageSize: 6 }),
    getAdminApplications({ status: "failed_payment", pageSize: 6 }),
    getAdminPaymentDiagnostics(8),
    getPaymentReconciliationSummary(),
  ]);

  const stats = [
    { title: "Total Applications", value: summary.totalApplications, icon: "fileText" as const, tone: "blue" as const },
    { title: "Today Applications", value: summary.todayApplications, icon: "calendarDays" as const, tone: "blue" as const },
    { title: "Payment Pending", value: summary.paymentPending, icon: "fileClock" as const, tone: "orange" as const },
    { title: "Paid / Submitted", value: summary.paidSubmitted, icon: "receiptText" as const, tone: "green" as const },
    { title: "In Process", value: summary.inProcess, icon: "clipboardList" as const, tone: "orange" as const },
    { title: "Completed", value: summary.completed, icon: "listChecks" as const, tone: "green" as const },
    { title: "Failed Payments", value: summary.failedPayments, icon: "receiptText" as const, tone: "slate" as const },
    { title: "Verified Revenue", value: safeCurrency(summary.verifiedRevenue), icon: "indianRupee" as const, tone: "green" as const },
    { title: "Wallet Redeemed", value: safeCurrency(summary.walletRedeemed), icon: "wallet" as const, tone: "blue" as const },
    { title: "Cashback Liability", value: safeCurrency(summary.cashbackLiability), icon: "gift" as const, tone: "orange" as const },
    { title: "New Customers Today", value: summary.newCustomersToday, icon: "users" as const, tone: "blue" as const },
    { title: "Unmatched Razorpay", value: reconciliation.unmatchedCount, icon: "repeat" as const, tone: reconciliation.unmatchedCount ? "orange" as const : "green" as const },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="Admin CRM"
        title="Control Room"
        description="Canonical application, payment, wallet, and customer numbers from one clean CRM data layer."
        action={
          <Link href="/admin/payment-reconciliation" className="inline-flex h-11 items-center gap-2 rounded-full bg-slate-950 px-4 text-sm font-bold text-white">
            Sync Razorpay
            <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <AdminStatCard key={stat.title} title={stat.title} value={stat.value} icon={stat.icon} tone={stat.tone} />
        ))}
      </section>

      {diagnostics.length ? (
        <section className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-orange-700">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <div>
                <p className="font-bold text-orange-950">{diagnostics.length} CRM data issue{diagnostics.length === 1 ? "" : "s"} need review</p>
                <p className="mt-1 text-sm text-orange-800">{diagnostics[0]?.message}</p>
              </div>
            </div>
            <Link href="/admin/crm-diagnostics" className="inline-flex h-10 items-center justify-center rounded-full bg-orange-600 px-4 text-sm font-bold text-white">
              Review diagnostics
            </Link>
          </div>
        </section>
      ) : null}

      {reconciliation.unmatchedCount ? (
        <section className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-rose-700">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <div>
                <p className="font-bold text-rose-950">{reconciliation.unmatchedCount} Razorpay payment{reconciliation.unmatchedCount === 1 ? "" : "s"} need reconciliation</p>
                <p className="mt-1 text-sm text-rose-800">Payments exist in Razorpay but are not matched to CRM applications yet.</p>
              </div>
            </div>
            <Link href="/admin/payment-reconciliation" className="inline-flex h-10 items-center justify-center rounded-full bg-rose-600 px-4 text-sm font-bold text-white">
              Open reconciliation
            </Link>
          </div>
        </section>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-950">Recent Applications</h2>
            <Link href="/admin/applications" className="text-sm font-bold text-blue-700">View all</Link>
          </div>
          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.08em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Service</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentApplications.rows.map((row) => (
                  <tr key={row.id} className="bg-white">
                    <td className="px-4 py-3"><ShortId id={row.application_id ?? row.id} /></td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/applications/${row.application_id ?? row.id}`} className="font-bold text-slate-950 hover:text-blue-700">{row.customer_name}</Link>
                      <p className="mt-0.5 font-mono text-xs text-slate-500">{row.mobile || row.customer_email || "-"}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{row.service}</td>
                    <td className="px-4 py-3"><AdminStatusBadge status={row.application_status} /></td>
                    <td className="px-4 py-3"><AdminStatusBadge status={row.payment_status} /></td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{safeDateTime(row.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">Payment Pending</h2>
            <div className="mt-4 space-y-3">
              {pendingApplications.rows.length ? pendingApplications.rows.map((row) => (
                <Link key={row.id} href={`/admin/applications/${row.application_id ?? row.id}`} className="block rounded-2xl bg-orange-50 p-4 transition hover:bg-orange-100">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-bold text-slate-950">{row.customer_name}</p>
                    <AdminStatusBadge status={row.payment_status} />
                  </div>
                  <p className="mt-1 text-sm text-slate-700">{row.service}</p>
                  <p className="mt-2 font-mono text-xs text-slate-500">{safeDateTime(row.created_at)}</p>
                </Link>
              )) : <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">No pending payment applications.</p>}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">Failed Payments</h2>
            <div className="mt-4 space-y-3">
              {failedApplications.rows.length ? failedApplications.rows.map((row) => (
                <Link key={row.id} href={`/admin/applications/${row.application_id ?? row.id}`} className="block rounded-2xl bg-rose-50 p-4 transition hover:bg-rose-100">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-bold text-slate-950">{row.customer_name}</p>
                    <AdminStatusBadge status={row.payment_status} />
                  </div>
                  <p className="mt-1 text-sm text-slate-700">{row.service}</p>
                  <p className="mt-2 font-mono text-xs text-slate-500">{safeDateTime(row.created_at)}</p>
                </Link>
              )) : <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">No failed payments found.</p>}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">Recent Customers</h2>
            <div className="mt-4 space-y-3">
              {customers.recentCustomers.slice(0, 5).map((customer) => (
                <Link key={customer.id} href={customer.href} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4">
                  <div>
                    <p className="font-bold text-slate-950">{customer.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{customer.mobile || customer.email || "No contact saved"}</p>
                  </div>
                  <span className="text-sm font-bold text-slate-700">{customer.applicationsCount} apps</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
