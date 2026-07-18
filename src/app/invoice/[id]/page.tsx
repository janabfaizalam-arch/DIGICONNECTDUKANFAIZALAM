import { notFound } from "next/navigation";

import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function InvoicePage({ params }: Props) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();
  if (!supabase) notFound();

  const { data: invoice } = await supabase
    .from("invoices")
    .select("id, invoice_number, amount, status, issued_at, application_id")
    .eq("id", id)
    .maybeSingle();

  if (!invoice) notFound();

  return (
    <div className="container-narrow py-12">
      <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-tight">Invoice</h1>
      <dl className="mt-8 space-y-3 text-sm">
        <div>
          <dt className="text-[var(--muted)]">Number</dt>
          <dd className="font-medium">{String(invoice.invoice_number)}</dd>
        </div>
        <div>
          <dt className="text-[var(--muted)]">Amount</dt>
          <dd className="font-medium">₹{Number(invoice.amount ?? 0).toFixed(2)}</dd>
        </div>
        <div>
          <dt className="text-[var(--muted)]">Status</dt>
          <dd className="font-medium">{String(invoice.status)}</dd>
        </div>
        <div>
          <dt className="text-[var(--muted)]">Issued</dt>
          <dd className="font-medium">{String(invoice.issued_at)}</dd>
        </div>
      </dl>
    </div>
  );
}
