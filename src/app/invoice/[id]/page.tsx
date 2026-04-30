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
    <main className="min-h-screen px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between gap-3 print:hidden">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--primary)]">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <PrintButton />
        </div>

        <Card className="rounded-2xl p-6 md:p-10 print:shadow-none">
          <div className="flex flex-col gap-6 border-b pb-6 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm print:border-slate-200">
                <Image
                  src="/digiconnect-logo.png"
                  alt="DigiConnect Dukan Logo"
                  width={80}
                  height={50}
                  className="h-11 w-16 object-contain"
                />
              </div>
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--secondary)]">Invoice</p>
                <h1 className="mt-2 text-3xl font-black text-slate-950">DigiConnect Dukan</h1>
                <p className="mt-2 text-sm text-slate-600">Powered by RNoS India Pvt Ltd</p>
              </div>
            </div>
            <div className="text-left md:text-right">
              <p className="font-mono text-sm font-black text-slate-950">{invoice.invoice_number}</p>
              <p className="mt-1 text-sm text-slate-600">{formatDate(invoice.created_at)}</p>
            </div>
          </div>

          <div className="grid gap-6 border-b py-6 md:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase text-slate-500">Bill To</p>
              <p className="mt-2 font-black text-slate-950">{invoice.customer_name}</p>
              <p className="mt-1 text-sm text-slate-600">{invoice.customer_email}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-slate-500">Payment Status</p>
              <p className="mt-2 font-black text-slate-950">{paymentStatusLabels[invoice.payment_status]}</p>
            </div>
          </div>

          <div className="py-6">
            <div className="grid grid-cols-[1fr_auto] gap-4 rounded-2xl bg-slate-50 p-4">
              <div>
                <p className="font-black text-slate-950">{invoice.service_name}</p>
                <p className="mt-1 text-sm text-slate-600">Digital service application support</p>
              </div>
              <p className="font-black text-slate-950">{formatCurrency(invoice.amount)}</p>
            </div>
          </div>

          <div className="flex justify-end border-t pt-6">
            <div className="w-full max-w-xs">
              <div className="flex justify-between text-sm text-slate-600">
                <span>Subtotal</span>
                <span>{formatCurrency(invoice.amount)}</span>
              </div>
              <div className="mt-3 flex justify-between text-xl font-black text-slate-950">
                <span>Total</span>
                <span>{formatCurrency(invoice.amount)}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
}
