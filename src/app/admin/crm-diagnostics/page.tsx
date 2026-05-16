import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, ArrowLeft } from "lucide-react";

import { AdminEmptyState, AdminPageHeader } from "@/components/admin/admin-shell";
import { AdminStatusBadge } from "@/components/admin/admin-status-badge";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { safeDateTime } from "@/lib/admin-format";
import { getAdminPaymentDiagnostics } from "@/lib/admin-crm";

export const dynamic = "force-dynamic";

export default async function AdminCrmDiagnosticsPage() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  const diagnostics = await getAdminPaymentDiagnostics(100);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="CRM Diagnostics"
        title="Application & Payment Diagnostics"
        description="Read-only checks for duplicate payments, orphan payments, stale pending applications, missing customers, and amount mismatches."
        action={
          <Link href="/admin" className="inline-flex h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700">
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>
        }
      />

      {!diagnostics.length ? (
        <AdminEmptyState title="No CRM diagnostics found" description="The current application and payment facts do not show known consistency issues." />
      ) : (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-700">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-950">{diagnostics.length} issue{diagnostics.length === 1 ? "" : "s"} found</h2>
              <p className="text-sm text-slate-500">No records are changed here. Review and repair intentionally.</p>
            </div>
          </div>

          <div className="hidden overflow-hidden rounded-2xl border border-slate-100 lg:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.08em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Severity</th>
                  <th className="px-4 py-3">Issue</th>
                  <th className="px-4 py-3">Application</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Razorpay</th>
                  <th className="px-4 py-3">Seen At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {diagnostics.map((item) => (
                  <tr key={item.id} className="bg-white">
                    <td className="px-4 py-3"><AdminStatusBadge status={item.severity} /></td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-950">{item.issue_type.replace(/_/g, " ")}</p>
                      <p className="mt-1 text-sm text-slate-600">{item.message}</p>
                    </td>
                    <td className="px-4 py-3">
                      {item.application_id ? <Link href={`/admin/applications/${item.application_id}`} className="font-mono text-xs font-bold text-blue-700">{item.application_id.slice(0, 8)}</Link> : <span className="text-slate-400">-</span>}
                      {item.issue_type === "unmatched_razorpay_payment" ? (
                        <Link href="/admin/payment-reconciliation" className="mt-2 block text-xs font-bold text-blue-700">Link to existing or create manually</Link>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{item.payment_id?.slice(0, 8) ?? "-"}</td>
                    <td className="px-4 py-3">
                      <p className="max-w-40 truncate font-mono text-xs text-slate-700">{item.razorpay_payment_id ?? "-"}</p>
                      <p className="mt-1 max-w-40 truncate font-mono text-[11px] text-slate-500">{item.razorpay_order_id ?? "-"}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{safeDateTime(item.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 lg:hidden">
            {diagnostics.map((item) => (
              <article key={item.id} className="rounded-2xl border border-slate-100 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-bold text-slate-950">{item.issue_type.replace(/_/g, " ")}</p>
                  <AdminStatusBadge status={item.severity} />
                </div>
                <p className="mt-2 text-sm text-slate-600">{item.message}</p>
                {item.application_id ? <Link href={`/admin/applications/${item.application_id}`} className="mt-3 inline-flex text-sm font-bold text-blue-700">Open application</Link> : null}
                {item.issue_type === "unmatched_razorpay_payment" ? (
                  <Link href="/admin/payment-reconciliation" className="mt-3 inline-flex text-sm font-bold text-blue-700">Create Application Manually or Link to Existing</Link>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
