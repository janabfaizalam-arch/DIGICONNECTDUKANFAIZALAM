import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";

import { OfflineInvoiceRowActions } from "@/components/admin/offline-invoice-actions";
import { AdminEmptyState, AdminPageHeader } from "@/components/admin/admin-shell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { safeCurrency, safeDate } from "@/lib/admin-format";
import { getOfflineInvoices } from "@/lib/offline-invoices";

export const dynamic = "force-dynamic";

export default async function OfflineInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  const { q = "", status = "all" } = await searchParams;
  const invoices = await getOfflineInvoices({ query: q, status });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="Offline Invoices"
        title="Invoice History"
        description="Create and manage invoices for walk-in customers handled by office staff."
        action={
          <Link href="/admin/offline-invoices/new" className="inline-flex h-11 items-center gap-2 rounded-full bg-blue-600 px-4 text-sm font-bold text-white">
            <Plus className="h-4 w-4" />
            Create Invoice
          </Link>
        }
      />

      <form className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_12rem_auto]">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search mobile, invoice number, customer name"
          className="h-11 rounded-2xl border bg-white px-4 text-sm outline-none focus:border-blue-500"
        />
        <select name="status" defaultValue={status} className="h-11 rounded-2xl border bg-white px-4 text-sm outline-none focus:border-blue-500">
          <option value="all">All payments</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="partial">Partial</option>
        </select>
        <button type="submit" className="h-11 rounded-full bg-slate-950 px-5 text-sm font-bold text-white">
          Search
        </button>
      </form>

      {invoices.length ? (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-bold text-slate-950">{invoice.invoice_number}</TableCell>
                  <TableCell>
                    <p className="font-semibold text-slate-900">{invoice.customer_name}</p>
                    <p className="text-xs text-slate-500">{invoice.mobile}</p>
                  </TableCell>
                  <TableCell>
                    <p className="font-semibold text-slate-900">{invoice.service_name}</p>
                    <p className="text-xs text-slate-500">{invoice.service_category ?? "-"}</p>
                  </TableCell>
                  <TableCell>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{invoice.payment_status}</span>
                  </TableCell>
                  <TableCell className="font-bold">{safeCurrency(invoice.total_amount)}</TableCell>
                  <TableCell>{safeDate(invoice.created_at)}</TableCell>
                  <TableCell><OfflineInvoiceRowActions invoiceId={invoice.id} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <AdminEmptyState title="No offline invoices found" description="Create the first walk-in customer invoice or adjust your search filters." />
      )}
    </div>
  );
}
