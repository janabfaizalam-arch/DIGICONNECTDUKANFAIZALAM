import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Globe2, MessageCircle, Phone, ShieldCheck } from "lucide-react";

import { PrintButton } from "@/components/portal/print-button";
import { Card } from "@/components/ui/card";
import { getCurrentUser, getCurrentUserRole, isAdminRole, isAgentRole } from "@/lib/auth";
import { formatCurrency, paymentStatusLabels } from "@/lib/portal-data";
import type { Invoice } from "@/lib/portal-types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { buildInvoiceWhatsAppMessage, buildWhatsAppUrl } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(date));
}

function getInvoiceServices(serviceName: string) {
  return serviceName
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
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
  const invoiceServices = getInvoiceServices(invoice.service_name);
  const whatsappUrl = buildWhatsAppUrl(
    buildInvoiceWhatsAppMessage({
      invoiceNumber: invoice.invoice_number,
      serviceName: invoice.service_name,
      amount: invoice.amount,
      status: invoice.payment_status,
    }),
  );

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
    <main className="min-h-screen px-3 py-4 md:px-8 md:py-10 bg-slate-50/50 print:min-h-0 print:bg-white print:p-0">
      {/* Custom high-fidelity print overrides */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body {
            background-color: #ffffff !important;
            color: #0f172a !important;
          }
          .invoice-card {
            border: 0 !important;
            box-shadow: none !important;
            background: transparent !important;
            padding: 0 !important;
          }
          .invoice-shell {
            max-width: 100% !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
        }
      `}} />
      <div className="invoice-shell mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between gap-3 print:hidden">
          <Link href="/customer/dashboard" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--primary)]">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <div className="flex items-center gap-2">
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-full bg-emerald-600 px-4 text-sm font-bold text-white">
              <MessageCircle className="h-4 w-4" />
              WhatsApp Support
            </a>
            <PrintButton />
          </div>
        </div>

        <Card className="invoice-card overflow-hidden rounded-3xl border border-slate-100 bg-white p-0 shadow-sm print:rounded-none print:border-0 print:shadow-none">
          <div className="bg-slate-50 border-b border-slate-100 print:bg-white print:text-slate-950 print:border-b print:px-0 print:py-2 px-5 py-4 text-slate-800 md:px-10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Official Service Invoice</p>
              <p className="text-xs font-bold text-slate-400">Powered By RNoS India Pvt Ltd</p>
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
              <p className="mt-3 max-w-sm text-sm leading-6 text-slate-500 font-semibold">
                DigiConnect Dukan provides trusted digital and government service application support.
              </p>
            </div>
            <div className="text-right">
              <h1 className="text-3xl font-serif font-black text-slate-900 md:text-5xl">Invoice</h1>
              <p className="mt-2 font-mono text-xs font-black text-slate-700 md:text-sm">{invoice.invoice_number}</p>
              <p className="mt-1 text-xs font-bold text-slate-500 md:text-sm">{formatDate(invoice.created_at)}</p>
            </div>
          </div>

          <div className="grid gap-4 border-b py-6 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/40 p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Bill To</p>
              <p className="mt-2 font-black text-slate-900">{invoice.customer_name}</p>
              <p className="mt-1 text-xs font-bold text-slate-500">{invoice.customer_email}</p>
              <p className="mt-1 text-xs font-bold text-slate-500">{invoice.customer_mobile ?? "Mobile not available"}</p>
            </div>
            <div className="rounded-2xl border border-blue-100 bg-blue-50/20 p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-blue-700">Payment Status</p>
              <p className="mt-2.5 inline-flex rounded-full bg-white border border-blue-100 px-3.5 py-1 text-xs font-black text-blue-700">
                {paymentStatusLabels[invoice.payment_status]}
              </p>
            </div>
            <div className="rounded-2xl border border-orange-100 bg-orange-50/15 p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-orange-700">Support Desk</p>
              <p className="mt-2 text-xs font-black text-slate-900">+91 7007595931, 9305086491</p>
              <p className="mt-1 text-xs font-bold text-slate-500">rnos.in</p>
            </div>
          </div>

          <div className="overflow-hidden border-b py-6">
            <div className="grid grid-cols-[1fr_72px_110px] bg-slate-50 border-y border-slate-100 print:bg-slate-100 print:text-slate-900 px-4 py-3 text-xs font-black text-slate-700 uppercase tracking-wider">
              <p>Service Item</p>
              <p className="text-center">Qty</p>
              <p className="text-right">Amount</p>
            </div>
            {invoiceServices.map((serviceName, index) => (
              <div key={`${serviceName}-${index}`} className="grid grid-cols-[1fr_72px_110px] gap-4 border-b border-slate-100 px-4 py-4">
                <div>
                  <p className="font-bold text-slate-900 text-sm">{serviceName}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-400">Digital service application support</p>
                </div>
                <p className="text-center font-bold text-slate-900 text-sm">1</p>
                <p className="text-right font-serif font-bold text-slate-900 text-sm">{invoiceServices.length === 1 ? formatCurrency(invoice.amount) : "Included"}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 pt-5 md:grid-cols-[1fr_320px]">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/40 p-4">
              <p className="text-xs font-black text-slate-900 uppercase tracking-wider">Notes</p>
              <p className="mt-2 text-xs leading-relaxed text-slate-500 font-semibold">
                Thank you for choosing DigiConnect Dukan. Keep this invoice for your records and application tracking.
              </p>
              <div className="mt-4 grid gap-2 text-xs font-bold text-slate-600 sm:grid-cols-3">
                <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-blue-700" /> CA Secure</span>
                <span className="inline-flex items-center gap-1.5"><Phone className="h-4 w-4 text-orange-600" /> Support Desk</span>
                <span className="inline-flex items-center gap-1.5"><Globe2 className="h-4 w-4 text-blue-700" /> rnos.in</span>
              </div>
            </div>
            <div className="w-full max-w-xs pt-2 space-y-3">
              <div className="flex justify-between text-xs font-bold text-slate-500">
                <span>Subtotal</span>
                <span>{formatCurrency(invoice.amount)}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-slate-500">
                <span>Taxes / Charges</span>
                <span>Included</span>
              </div>
              <div className="flex justify-between border-t border-slate-150 pt-2 text-lg font-serif font-black text-slate-900">
                <span>Grand Total</span>
                <span>{formatCurrency(invoice.amount)}</span>
              </div>
            </div>
          </div>
          <div className="mt-10 border-t border-slate-100 pt-4 text-center text-[10px] leading-relaxed text-slate-400 font-semibold">
            <p>DigiConnect Dukan | Powered By RNoS India Pvt Ltd | 7007595931 | rnos.in</p>
            <p className="mt-0.5">This is a computer-generated tax invoice document. No signature required.</p>
          </div>
          </div>
        </Card>
      </div>
    </main>
  );
}
