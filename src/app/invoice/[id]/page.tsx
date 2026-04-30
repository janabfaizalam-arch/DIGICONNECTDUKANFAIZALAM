import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PrintButton } from "@/components/portal/print-button";
import { Card } from "@/components/ui/card";
import { getCurrentUser, isAdminUser } from "@/lib/auth";
import { formatCurrency, paymentStatusLabels } from "@/lib/portal-data";
import type { Invoice } from "@/lib/portal-types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(date));
}

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const { id } = await params;
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    notFound();
  }

  let query = supabase.from("invoices").select("*").eq("id", id);

  if (!isAdminUser(user)) {
    query = query.eq("user_id", user.id);
  }

  const { data } = await query.single();

  if (!data) {
    notFound();
  }

  const invoice = data as Invoice;

  return (
    <main className="min-h-screen px-3 py-4 md:px-8 md:py-10 print:min-h-0 print:bg-white print:p-0">
      <div className="invoice-shell mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between gap-3 print:hidden">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--primary)]">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <PrintButton />
        </div>

        <Card className="invoice-card rounded-2xl bg-white p-5 md:p-10 print:rounded-none print:border-0 print:p-0 print:shadow-none">
          <div className="flex items-start justify-between gap-4 border-b pb-5">
            <div>
              <Image
                src="/logo-navbar.png"
                alt="DigiConnect Dukan Logo"
                width={220}
                height={94}
                priority
                className="h-auto w-[165px] object-contain md:w-[220px] print:w-[190px]"
              />
            </div>
            <div className="text-right">
              <h1 className="text-2xl font-bold text-slate-950 md:text-3xl">Invoice</h1>
              <p className="mt-2 font-mono text-xs font-bold text-slate-700 md:text-sm">{invoice.invoice_number}</p>
              <p className="mt-1 text-xs text-slate-600 md:text-sm">{formatDate(invoice.created_at)}</p>
            </div>
          </div>

          <div className="grid gap-5 border-b py-5 md:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase text-slate-500">Bill To</p>
              <p className="mt-2 font-bold text-slate-950">{invoice.customer_name}</p>
              <p className="mt-1 text-sm text-slate-600">{invoice.customer_email}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-slate-500">Payment Status</p>
              <p className="mt-2 inline-flex rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-950">
                {paymentStatusLabels[invoice.payment_status]}
              </p>
            </div>
          </div>

          <div className="overflow-hidden border-b py-5">
            <div className="grid grid-cols-[1fr_auto] bg-slate-950 px-4 py-3 text-sm font-bold text-white">
              <p>Service Item</p>
              <p>Amount</p>
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-4 border-x border-b px-4 py-4">
              <div>
                <p className="font-bold text-slate-950">{invoice.service_name}</p>
                <p className="mt-1 text-sm text-slate-600">Digital service application support</p>
              </div>
              <p className="font-bold text-slate-950">{formatCurrency(invoice.amount)}</p>
            </div>
          </div>

          <div className="flex justify-end pt-5">
            <div className="w-full max-w-xs">
              <div className="flex justify-between text-sm text-slate-600">
                <span>Subtotal</span>
                <span>{formatCurrency(invoice.amount)}</span>
              </div>
              <div className="mt-3 flex justify-between text-xl font-bold text-slate-950">
                <span>Total</span>
                <span>{formatCurrency(invoice.amount)}</span>
              </div>
            </div>
          </div>
          <div className="mt-8 border-t pt-4 text-center text-xs text-slate-500">
            DigiConnect Dukan | Powered by RNoS India Pvt Ltd | 7007595931
          </div>
        </Card>
      </div>
    </main>
  );
}
