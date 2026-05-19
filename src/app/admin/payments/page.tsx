import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminPageHeader, AdminStatCard } from "@/components/admin/admin-shell";
import { safeCurrency, safeDateTime } from "@/lib/admin-format";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type PaymentRow = {
  id: string;
  application_id: string | null;
  user_id: string | null;
  amount: number | null;
  real_payment_amount: number | null;
  wallet_used_amount: number | null;
  status: string | null;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  payment_method: string | null;
  paid_at: string | null;
  created_at: string;
};

function normalize(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

export default async function AdminPaymentsPage() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  const supabase = getSupabaseAdmin();
  let payments: PaymentRow[] = [];

  if (supabase) {
    const { data, error } = await supabase
      .from("payments")
      .select("id, application_id, user_id, amount, real_payment_amount, wallet_used_amount, status, razorpay_order_id, razorpay_payment_id, payment_method, paid_at, created_at")
      .order("created_at", { ascending: false })
      .limit(300);

    if (error) console.error("[admin-payments] Payment list failed", error);
    payments = (data ?? []) as PaymentRow[];
  }

  const verified = payments.filter((payment) => ["verified", "paid"].includes(normalize(payment.status)));
  const pending = payments.filter((payment) => ["pending", "unpaid"].includes(normalize(payment.status)));
  const totalPaid = verified.reduce((total, payment) => total + Number(payment.real_payment_amount ?? payment.amount ?? 0), 0);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader eyebrow="Finance" title="Payments" description="Server-side payment ledger with Razorpay IDs, application links, and wallet split." />

      <section className="grid gap-3 sm:grid-cols-3">
        <AdminStatCard title="Verified Payments" value={verified.length} icon="receiptText" tone="green" />
        <AdminStatCard title="Pending Payments" value={pending.length} icon="fileClock" tone="orange" />
        <AdminStatCard title="Verified Amount" value={safeCurrency(totalPaid)} icon="indianRupee" tone="blue" />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.12em] text-slate-500">
              <tr>
                <th className="py-3">Date</th>
                <th className="py-3">Application</th>
                <th className="py-3">Status</th>
                <th className="py-3">Amount</th>
                <th className="py-3">Wallet</th>
                <th className="py-3">Method</th>
                <th className="py-3">Razorpay Payment</th>
                <th className="py-3">Razorpay Order</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td className="py-3 text-slate-700">{safeDateTime(payment.paid_at ?? payment.created_at)}</td>
                  <td className="py-3">
                    {payment.application_id ? (
                      <Link href={`/admin/applications/${payment.application_id}`} className="font-bold text-blue-700 hover:text-blue-900">
                        {payment.application_id.slice(0, 8)}
                      </Link>
                    ) : "Not available"}
                  </td>
                  <td className="py-3 font-bold capitalize text-slate-700">{String(payment.status ?? "unknown").replace(/_/g, " ")}</td>
                  <td className="py-3 font-bold text-slate-950">{safeCurrency(payment.real_payment_amount ?? payment.amount ?? 0)}</td>
                  <td className="py-3 text-slate-700">{safeCurrency(payment.wallet_used_amount ?? 0)}</td>
                  <td className="py-3 text-slate-700">{payment.payment_method ?? "Not available"}</td>
                  <td className="py-3 font-mono text-xs text-slate-600">{payment.razorpay_payment_id ?? "-"}</td>
                  <td className="py-3 font-mono text-xs text-slate-600">{payment.razorpay_order_id ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!payments.length ? <p className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-600">No payments found.</p> : null}
        </div>
      </section>
    </div>
  );
}
