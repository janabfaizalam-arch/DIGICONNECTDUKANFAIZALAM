import { Download, MessageCircle, ReceiptText } from "lucide-react";

import { verifyInvoiceLinkToken } from "@/lib/invoices/invoice-link";
import type { Invoice } from "@/lib/portal-types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Invoice | DigiConnect Dukan",
  robots: { index: false, follow: false },
};

/**
 * The invoice a customer opens from WhatsApp.
 *
 * The WhatsApp link used to point straight at the PDF, and WhatsApp's in-app
 * browser on Android shows a PDF as a blank white page. So the link opens this
 * plain HTML page instead — it renders everywhere — with the PDF one tap away.
 *
 * No login: access is the signed `t` token from the message (that invoice
 * only, expires). A bad or expired token gets a short explanation, not a 404.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PAYMENT_LABELS: Record<string, string> = {
  verified: "Paid",
  paid: "Paid",
  pending: "Payment pending",
  failed: "Payment failed",
  refunded: "Refunded",
};

function rupees(value: unknown) {
  const amount = Number(value ?? 0);
  return `₹${(Number.isFinite(amount) ? amount : 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" }).format(date);
}

function maskMobile(value: string | null | undefined) {
  const digits = String(value ?? "").replace(/\D/g, "").slice(-10);
  return digits.length === 10 ? `${digits.slice(0, 2)}******${digits.slice(-2)}` : "";
}

function Unavailable() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-16">
      <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <ReceiptText className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
        <h1 className="mt-3 text-lg font-bold text-slate-900">Invoice link expired</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Ye link purana ho gaya hai ya galat hai. Naya invoice link paane ke liye isi WhatsApp number par message
          karein, ya apne DigiConnect Dukan account mein login karke invoice dekhein.
        </p>
        <a
          href={buildWhatsAppUrl("Namaste, mujhe apna invoice dobara chahiye.")}
          className="mt-5 inline-flex h-11 items-center gap-2 rounded-full bg-emerald-600 px-5 text-sm font-bold text-white"
        >
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          WhatsApp Support
        </a>
      </div>
    </main>
  );
}

export default async function PublicInvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { id } = await params;
  const { t } = await searchParams;
  if (!UUID.test(id) || !verifyInvoiceLinkToken(id, t)) return <Unavailable />;

  const supabase = getSupabaseAdmin();
  const { data } = supabase ? await supabase.from("invoices").select("*").eq("id", id).maybeSingle() : { data: null };
  if (!data) return <Unavailable />;
  const invoice = data as Invoice;

  const services = invoice.service_name
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const paymentLabel = PAYMENT_LABELS[String(invoice.payment_status).toLowerCase()] ?? String(invoice.payment_status);
  const pdfHref = `/api/invoices/${invoice.id}/pdf?t=${encodeURIComponent(String(t))}&download=1`;
  const wallet = Number(invoice.wallet_used_amount ?? 0);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:py-10">
      <div className="mx-auto max-w-lg">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="bg-blue-50 px-5 py-5">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-orange-600">Invoice</p>
            <h1 className="mt-1 text-xl font-extrabold text-slate-900">DigiConnect Dukan</h1>
            <p className="mt-0.5 text-xs font-semibold text-slate-500">Powered by RNOS India Pvt Ltd</p>
            <div className="mt-4 flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="font-mono text-sm font-bold text-slate-900">{invoice.invoice_number}</p>
                <p className="text-xs font-medium text-slate-500">{formatDate(invoice.created_at)}</p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-blue-700 ring-1 ring-blue-100">
                {paymentLabel}
              </span>
            </div>
          </div>

          <div className="space-y-5 px-5 py-5">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">Bill to</p>
              <p className="mt-1 text-sm font-bold text-slate-900">{invoice.customer_name}</p>
              {maskMobile(invoice.customer_mobile) ? (
                <p className="text-xs font-medium text-slate-500">+91 {maskMobile(invoice.customer_mobile)}</p>
              ) : null}
            </div>

            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100">
              {(services.length ? services : ["Service"]).map((service, index) => (
                <li key={`${service}-${index}`} className="flex items-start justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{service}</p>
                    <p className="text-xs text-slate-500">Digital service application support</p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-slate-900">
                    {services.length > 1 ? "Included" : rupees(invoice.amount)}
                  </p>
                </li>
              ))}
            </ul>

            <div className="space-y-1.5 text-sm">
              {wallet > 0 ? (
                <div className="flex justify-between text-slate-600">
                  <span>Wallet used</span>
                  <span>- {rupees(wallet)}</span>
                </div>
              ) : null}
              <div className="flex justify-between text-base font-extrabold text-slate-900">
                <span>Total</span>
                <span>{rupees(invoice.amount)}</span>
              </div>
            </div>

            <a
              href={pdfHref}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-blue-700 text-sm font-bold text-white"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Download PDF
            </a>
            <p className="text-center text-xs leading-relaxed text-slate-500">
              Support: +91 7007595931, 9305086491 · rnos.in
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
