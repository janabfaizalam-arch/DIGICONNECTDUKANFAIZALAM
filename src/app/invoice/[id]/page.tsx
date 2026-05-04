import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Globe2, Phone, ShieldCheck } from "lucide-react";

import { PrintButton } from "@/components/portal/print-button";
import { Card } from "@/components/ui/card";
import { getCurrentUser, getCurrentUserRole, isAdminRole, isAgentRole } from "@/lib/auth";
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
  const role = await getCurrentUserRole(user);

  const { id } = await params;
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    notFound();
  }

  const { data } = await supabase.from("invoices").select("*").eq("id", id).single();

  if (!data) {
    notFound();
  }

  const invoice = data as Invoice;

  if (!isAdminRole(role) && invoice.user_id !== user.id) {
    if (!isAgentRole(role)) {
      notFound();
    }

    const { data: application } = await supabase
      .from("applications")
      .select("id")
      .eq("id", invoice.application_id)
      .or(`created_by.eq.${user.id},assigned_agent_id.eq.${user.id}`)
      .maybeSingle();

    if (!application) {
      notFound();
    }
  }

  return (
    <main className="min-h-screen px-3 py-4 md:px-8 md:py-10 print:min-h-0 print:bg-white print:p-0">
      <div className="invoice-shell mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between gap-3 print:hidden">
          <Link href="/customer/dashboard" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--primary)]">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <PrintButton />
        </div>

        <Card className="invoice-card overflow-hidden rounded-2xl bg-white p-0 shadow-sm md:rounded-[1.5rem] print:rounded-none print:border-0 print:shadow-none">
          <div className="bg-slate-950 px-5 py-4 text-white md:px-10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-orange-200">Official Service Invoice</p>
              <p className="text-sm font-semibold text-white/80">Powered By RNoS India Pvt Ltd</p>
            </div>
          </div>

          <div className="p-5 md:p-10 print:p-0">
          <div className="flex items-start justify-between gap-4 border-b pb-6">
            <div>
              <Image
                src="/logo-navbar.png"
                alt="DigiConnect Dukan Logo"
                width={220}
                height={94}
                priority
                className="h-auto w-[165px] object-contain md:w-[220px] print:w-[190px]"
              />
              <p className="mt-3 max-w-sm text-sm leading-6 text-slate-600">
                DigiConnect Dukan provides trusted digital and government service application support.
              </p>
            </div>
            <div className="text-right">
              <h1 className="text-2xl font-bold text-slate-950 md:text-4xl">Invoice</h1>
              <p className="mt-2 font-mono text-xs font-bold text-slate-700 md:text-sm">{invoice.invoice_number}</p>
              <p className="mt-1 text-xs text-slate-600 md:text-sm">{formatDate(invoice.created_at)}</p>
            </div>
          </div>

          <div className="grid gap-4 border-b py-6 md:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase text-slate-500">Bill To</p>
              <p className="mt-2 font-bold text-slate-950">{invoice.customer_name}</p>
              <p className="mt-1 text-sm text-slate-600">{invoice.customer_email}</p>
              <p className="mt-1 text-sm text-slate-600">{invoice.customer_mobile ?? "Mobile not available"}</p>
            </div>
            <div className="rounded-2xl bg-blue-50 p-4">
              <p className="text-xs font-bold uppercase text-slate-500">Payment Status</p>
              <p className="mt-2 inline-flex rounded-full bg-white px-3 py-1 text-sm font-bold text-slate-950">
                {paymentStatusLabels[invoice.payment_status]}
              </p>
            </div>
            <div className="rounded-2xl bg-orange-50 p-4">
              <p className="text-xs font-bold uppercase text-slate-500">Support</p>
              <p className="mt-2 text-sm font-bold text-slate-950">+91 7007595931</p>
              <p className="mt-1 text-sm text-slate-600">rnos.in</p>
            </div>
          </div>

          <div className="overflow-hidden border-b py-6">
            <div className="grid grid-cols-[1fr_72px_110px] bg-slate-950 px-4 py-3 text-sm font-bold text-white">
              <p>Service Item</p>
              <p className="text-center">Qty</p>
              <p>Amount</p>
            </div>
            <div className="grid grid-cols-[1fr_72px_110px] gap-4 border-x border-b px-4 py-4">
              <div>
                <p className="font-bold text-slate-950">{invoice.service_name}</p>
                <p className="mt-1 text-sm text-slate-600">Digital service application support</p>
              </div>
              <p className="text-center font-bold text-slate-950">1</p>
              <p className="font-bold text-slate-950">{formatCurrency(invoice.amount)}</p>
            </div>
          </div>

          <div className="grid gap-6 pt-5 md:grid-cols-[1fr_320px]">
            <div className="rounded-2xl border bg-slate-50 p-4">
              <p className="font-bold text-slate-950">Notes</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Thank you for choosing DigiConnect Dukan. Keep this invoice for your records and application tracking.
              </p>
              <div className="mt-4 grid gap-2 text-sm font-semibold text-slate-700 sm:grid-cols-3">
                <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-blue-700" /> Secure</span>
                <span className="inline-flex items-center gap-2"><Phone className="h-4 w-4 text-orange-600" /> Support</span>
                <span className="inline-flex items-center gap-2"><Globe2 className="h-4 w-4 text-blue-700" /> rnos.in</span>
              </div>
            </div>
            <div className="w-full max-w-xs">
              <div className="flex justify-between text-sm text-slate-600">
                <span>Subtotal</span>
                <span>{formatCurrency(invoice.amount)}</span>
              </div>
              <div className="mt-3 flex justify-between text-sm text-slate-600">
                <span>Taxes / Charges</span>
                <span>Included</span>
              </div>
              <div className="mt-3 flex justify-between text-xl font-bold text-slate-950">
                <span>Grand Total</span>
                <span>{formatCurrency(invoice.amount)}</span>
              </div>
            </div>
          </div>
          <div className="mt-8 border-t pt-4 text-center text-xs leading-5 text-slate-500">
            <p>DigiConnect Dukan | Powered By RNoS India Pvt Ltd | 7007595931 | rnos.in</p>
            <p className="font-semibold">This is a computer-generated invoice.</p>
          </div>
          </div>
        </Card>
      </div>
    </main>
  );
}
