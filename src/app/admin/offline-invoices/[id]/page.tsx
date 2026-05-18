import Image from "next/image";
import { notFound, redirect } from "next/navigation";

import { OfflineInvoicePrintActions } from "@/components/admin/offline-invoice-actions";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { safeCurrency, safeDate } from "@/lib/admin-format";
import { getOfflineInvoice } from "@/lib/offline-invoices";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

async function getStaffName(userId: string | null, fallback: string) {
  if (!userId) return fallback;
  const supabase = getSupabaseAdmin();
  if (!supabase) return fallback;

  const { data } = await supabase.from("profiles").select("full_name, email").eq("id", userId).maybeSingle();
  return String(data?.full_name ?? data?.email ?? fallback);
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <div className="mt-1 text-sm font-semibold text-slate-900">{value || "-"}</div>
    </div>
  );
}

export default async function OfflineInvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  const { id } = await params;
  const invoice = await getOfflineInvoice(id);
  if (!invoice) notFound();

  const fallbackStaffName = String(user.user_metadata.full_name ?? user.user_metadata.name ?? user.email ?? "Admin Staff");
  const staffName = await getStaffName(invoice.created_by, fallbackStaffName);
  const subtotal = Number(invoice.quantity) * Number(invoice.unit_price);
  const taxable = Math.max(subtotal - Number(invoice.discount), 0);
  const taxAmount = (taxable * Number(invoice.tax_percent)) / 100;

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <OfflineInvoicePrintActions invoiceId={invoice.id} />
      <article className="invoice-print rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-10">
        <header className="flex flex-col gap-6 border-b border-slate-200 pb-6 md:flex-row md:items-start md:justify-between">
          <div className="flex items-center gap-4">
            <Image src="/digiconnect-dukan-logo-original.png" alt="DigiConnect Dukan" width={72} height={72} className="h-16 w-16 object-contain" />
            <div>
              <h1 className="text-2xl font-bold text-slate-950">DigiConnect Dukan</h1>
              <p className="mt-1 text-sm font-semibold text-slate-500">Powered by RNOS India Pvt Ltd</p>
            </div>
          </div>
          <div className="text-left md:text-right">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">Offline Invoice</p>
            <p className="mt-2 text-xl font-bold text-slate-950">{invoice.invoice_number}</p>
            <p className="mt-1 text-sm text-slate-500">{safeDate(invoice.created_at)}</p>
          </div>
        </header>

        <section className="grid gap-6 border-b border-slate-200 py-6 md:grid-cols-2">
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-blue-700">Customer Details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Detail label="Name" value={invoice.customer_name} />
              <Detail label="Mobile" value={invoice.mobile} />
              <Detail label="Email" value={invoice.email} />
              <Detail label="GST Number" value={invoice.gst_number} />
              <Detail label="Address" value={[invoice.address, invoice.city, invoice.state, invoice.pincode].filter(Boolean).join(", ")} />
            </div>
          </div>
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-blue-700">Office Details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Detail label="Staff Name" value={staffName} />
              <Detail label="Invoice Created By" value={staffName} />
              <Detail label="Payment Status" value={invoice.payment_status} />
              <Detail label="Payment Method" value={invoice.payment_method} />
            </div>
          </div>
        </section>

        <section className="py-6">
          <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-blue-700">Service Details</h2>
          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Service</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="px-4 py-3 text-right">Unit Price</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-slate-200">
                  <td className="px-4 py-4">
                    <p className="font-bold text-slate-950">{invoice.service_name}</p>
                    <p className="mt-1 text-xs text-slate-500">{invoice.service_category ?? ""}</p>
                    {invoice.description ? <p className="mt-2 text-xs leading-5 text-slate-500">{invoice.description}</p> : null}
                  </td>
                  <td className="px-4 py-4 text-right">{invoice.quantity}</td>
                  <td className="px-4 py-4 text-right">{safeCurrency(invoice.unit_price)}</td>
                  <td className="px-4 py-4 text-right font-bold">{safeCurrency(subtotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-6 border-t border-slate-200 pt-6 md:grid-cols-[1fr_22rem]">
          <div className="rounded-2xl bg-slate-50 p-4">
            <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-500">Payment Details</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Detail label="Amount Paid" value={safeCurrency(invoice.amount_paid)} />
              <Detail label="Balance Due" value={safeCurrency(invoice.balance_due)} />
            </div>
          </div>
          <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
            <div className="flex justify-between text-sm"><span>Subtotal</span><strong>{safeCurrency(subtotal)}</strong></div>
            <div className="flex justify-between text-sm"><span>Discount</span><strong>{safeCurrency(invoice.discount)}</strong></div>
            <div className="flex justify-between text-sm"><span>Tax ({invoice.tax_percent}%)</span><strong>{safeCurrency(taxAmount)}</strong></div>
            <div className="flex justify-between text-sm"><span>Extra Charges</span><strong>{safeCurrency(invoice.extra_charges)}</strong></div>
            <div className="flex justify-between border-t border-slate-200 pt-3 text-lg font-bold text-slate-950">
              <span>Total</span>
              <span>{safeCurrency(invoice.total_amount)}</span>
            </div>
          </div>
        </section>
      </article>
    </div>
  );
}
