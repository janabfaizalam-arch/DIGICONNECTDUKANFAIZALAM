import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Download, FileText, MessageCircle, RotateCcw } from "lucide-react";

import { PaymentBadge, StatusBadge } from "@/components/portal/status-badge";
import { RatingForm } from "@/components/portal/rating-form";
import { getCurrentUser, getCurrentUserRole, getRoleHome, isCustomerRole } from "@/lib/auth";
import { formatCurrency } from "@/lib/portal-data";
import { resolveDocumentUrls } from "@/lib/crm";
import type { Application, ApplicationDocument, Invoice, Payment, Rating } from "@/lib/portal-types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { buildApplicationWhatsAppMessage, buildWhatsAppUrl } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

function formatFieldLabel(key: string): string {
  const acronyms = ["itr", "gst", "msme", "pan", "dsc", "dob", "upi", "fssai", "cibil"];
  const words = key
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  return words
    .map((word) => {
      const lower = word.toLowerCase();
      if (acronyms.includes(lower)) {
        return word.toUpperCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(date));
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function displayValue(value: unknown) {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return "";
}

export default async function CustomerApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login/customer");
  }

  const role = await getCurrentUserRole(user);

  if (!isCustomerRole(role)) {
    redirect(getRoleHome(role));
  }

  const { id } = await params;
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    notFound();
  }

  const { data } = await supabase
    .from("applications")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!data) {
    notFound();
  }

  const [documentsResult, paymentsResult, invoicesResult, ratingsResult] = await Promise.all([
    supabase
      .from("application_documents")
      .select("id, application_id, document_type, document_name, file_name, file_url, file_type, storage_path, status, review_status, uploaded_by_role, is_final, uploaded_at, created_at")
      .eq("application_id", id),
    supabase
      .from("payments")
      .select("id, application_id, amount, status, screenshot_url, storage_path, razorpay_order_id, razorpay_payment_id, razorpay_status, payment_method, paid_at, created_at")
      .eq("application_id", id),
    supabase
      .from("invoices")
      .select("id, application_id, invoice_number, customer_name, customer_email, service_name, amount, payment_status, created_at")
      .eq("application_id", id),
    supabase.from("ratings").select("id, application_id, user_id, rating, feedback, created_at").eq("application_id", id),
  ]);

  const signedDocuments = await resolveDocumentUrls((documentsResult.data ?? []) as ApplicationDocument[]);
  const finalDocument = signedDocuments.find((document) => document.is_final || document.document_type === "final_document");
  const application = {
    ...(data as Application),
    final_document_url: (data as Application).final_document_url || finalDocument?.file_url || null,
    documents: signedDocuments,
    payments: (paymentsResult.data ?? []) as Payment[],
    invoices: (invoicesResult.data ?? []) as Invoice[],
    ratings: (ratingsResult.data ?? []) as Rating[],
  };
  const formData = asRecord(application.form_data);
  const payment = application.payments?.[0];
  const invoice = application.invoices?.[0];
  const rating = application.ratings?.[0];
  const whatsappUrl = buildWhatsAppUrl(
    buildApplicationWhatsAppMessage({
      applicationId: application.id,
      serviceName: application.service_name,
      status: application.status,
    }),
  );

  return (
    <main className="min-h-screen px-3 py-6 md:px-8 md:py-10 bg-[linear-gradient(180deg,#ffffff_0%,#fbfdff_100%)]">
      <div className="mx-auto max-w-5xl">
        <Link href="/customer/dashboard" className="inline-flex items-center gap-2 text-xs font-extrabold text-blue-700">
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="space-y-5">
            <div className="rounded-3xl border border-slate-100 bg-white/78 p-5 shadow-[0_8px_24px_rgba(15,23,42,0.02)] backdrop-blur-sm md:p-7">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-orange-700">Application File</p>
                  <h1 className="mt-2 text-2xl font-extrabold text-slate-950 leading-tight">{application.service_name}</h1>
                  <p className="mt-2 font-mono text-xs text-slate-400">ID: {application.id}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge status={application.status} />
                  {payment ? <PaymentBadge status={payment.status} /> : null}
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {Object.entries(formData).map(([key, value]) => (
                  <div key={key} className="rounded-2xl border border-slate-100/60 bg-slate-50/50 p-4">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">{formatFieldLabel(key)}</p>
                    <p className="mt-1 break-words text-sm font-extrabold text-slate-800 leading-normal">{displayValue(value)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-100 bg-white/78 p-5 shadow-[0_8px_24px_rgba(15,23,42,0.02)] backdrop-blur-sm md:p-7">
              <h2 className="text-lg font-extrabold text-slate-950">Submitted Documents</h2>
              <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                {application.documents?.length ? (
                  application.documents.map((document) => (
                    <a key={document.id} href={document.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3.5 text-xs font-bold text-slate-800 shadow-sm transition hover:border-blue-200">
                      <FileText className="h-4 w-4 shrink-0 text-blue-600" />
                      <span className="truncate">{document.file_name}</span>
                    </a>
                  ))
                ) : (
                  <p className="rounded-2xl bg-slate-50 p-4 text-xs font-bold text-slate-500 col-span-2">No documents uploaded.</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl border border-slate-100 bg-white/78 p-5 shadow-[0_8px_24px_rgba(15,23,42,0.02)] backdrop-blur-sm">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Total Amount</p>
              <p className="mt-1 text-2xl font-extrabold text-slate-950">{formatCurrency(application.amount)}</p>
              <p className="mt-4 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Submitted Date</p>
              <p className="mt-1 text-xs font-bold text-slate-700">{formatDate(application.created_at)}</p>
            </div>

            <div className="rounded-3xl border border-slate-100 bg-white/78 p-4 shadow-sm space-y-2.5">
              {invoice ? (
                <Link href={`/invoice/${invoice.id}`} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-blue-600 text-xs font-extrabold text-white shadow-md shadow-blue-500/10 transition duration-150 active:scale-[0.98]">
                  <Download className="h-4 w-4" />
                  Download Invoice
                </Link>
              ) : null}

              {application.final_document_url ? (
                <a href={application.final_document_url} target="_blank" rel="noreferrer" className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-emerald-600 text-xs font-extrabold text-white shadow-md shadow-emerald-500/10 transition duration-150 active:scale-[0.98]">
                  <Download className="h-4 w-4" />
                  Download Output Document
                </a>
              ) : null}

              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-emerald-100 bg-emerald-50/40 text-xs font-extrabold text-emerald-700 transition duration-150 hover:bg-emerald-600 hover:text-white hover:border-emerald-600">
                <MessageCircle className="h-4 w-4 text-emerald-600 group-hover:text-white" />
                WhatsApp Help Desk
              </a>

              <Link href={`/services/${application.service_slug}`} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white text-xs font-extrabold text-slate-700 transition duration-150 hover:bg-slate-50">
                <RotateCcw className="h-4 w-4" />
                Apply Service Again
              </Link>
            </div>

            {application.status === "completed" ? (
              <RatingForm applicationId={application.id} existingRating={rating?.rating} />
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}
