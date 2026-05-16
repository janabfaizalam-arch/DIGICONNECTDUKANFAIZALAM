import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";

import { PaymentReconciliationClient } from "@/components/admin/payment-reconciliation-client";
import { AdminPageHeader } from "@/components/admin/admin-shell";
import { getPaymentReconciliationRows, getPaymentReconciliationSummary } from "@/lib/admin-payment-reconciliation";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { safeDateTime } from "@/lib/admin-format";

export const dynamic = "force-dynamic";

function defaultRange() {
  const to = new Date();
  const from = new Date(to);
  from.setDate(to.getDate() - 7);

  return {
    from: from.toISOString(),
    to: to.toISOString(),
  };
}

export default async function AdminPaymentReconciliationPage() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  const [rows, summary] = await Promise.all([
    getPaymentReconciliationRows(100),
    getPaymentReconciliationSummary(),
  ]);
  const range = defaultRange();

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="Finance"
        title="Razorpay Payment Reconciliation"
        description="Pull captured Razorpay payments server-side, repair missing payment rows, link real applications, and keep an audit log for every admin action."
        action={
          <Link href="/admin" className="inline-flex h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700">
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>
        }
      />

      <section className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4">
          <p className="text-sm font-bold text-orange-800">Unmatched Razorpay Payments</p>
          <p className="mt-2 text-3xl font-bold text-orange-950">{summary.unmatchedCount}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-bold text-slate-500">Reconciliation Warnings</p>
          <p className="mt-2 text-3xl font-bold text-slate-950">{summary.warningCount}</p>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-emerald-800">
            <ShieldCheck className="h-4 w-4" />
            Server-side only
          </div>
          <p className="mt-2 text-sm leading-6 text-emerald-900">Razorpay secret keys stay in API routes. The browser only triggers admin actions.</p>
        </div>
      </section>

      <PaymentReconciliationClient rows={rows} defaultFrom={range.from} defaultTo={range.to} />

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-950">Recent Reconciliation Logs</h2>
        <div className="mt-4 grid gap-3">
          {summary.recentLogs.length ? summary.recentLogs.map((log) => (
            <div key={log.id} className="grid gap-2 rounded-2xl bg-slate-50 p-4 text-sm md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <p className="font-bold text-slate-950">{log.action.replace(/_/g, " ")}</p>
                <p className="mt-1 font-mono text-xs text-slate-500">
                  {log.razorpay_payment_id ?? "-"} / {log.razorpay_order_id ?? "-"}
                </p>
              </div>
              <div className="text-left md:text-right">
                {log.application_id ? <Link href={`/admin/applications/${log.application_id}`} className="font-mono text-xs font-bold text-blue-700">{log.application_id.slice(0, 8)}</Link> : null}
                <p className="mt-1 font-mono text-xs text-slate-500">{safeDateTime(log.created_at)}</p>
              </div>
            </div>
          )) : (
            <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">No reconciliation actions logged yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
