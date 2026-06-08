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

  let activeStep = 1; // Default is Submitted
  if (application.status === "completed" || application.status === "delivered") {
    activeStep = 5;
  } else if (application.status === "in_progress" || application.status === "assigned_to_agent") {
    activeStep = 4;
  } else if (application.status === "documents_verified") {
    activeStep = 3;
  } else if (payment?.status === "paid" || payment?.status === "verified" || application.status === "payment_success" || application.status === "submitted") {
    activeStep = 2;
  }

  const trackingSteps = [
    { step: 1, label: "Submitted" },
    { step: 2, label: "Payment Done" },
    { step: 3, label: "Docs Verified" },
    { step: 4, label: "In Progress" },
    { step: 5, label: "Completed" }
  ];

  return (
    <main className="min-h-screen px-3 py-6 md:px-8 md:py-10 bg-[linear-gradient(180deg,#ffffff_0%,#fbfdff_100%)]">
      <div className="mx-auto max-w-5xl">
        <Link href="/customer/dashboard" className="inline-flex items-center gap-2 text-xs font-black text-blue-700">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="space-y-5">
            
            {/* Main Details Glass Panel */}
            <div className="rounded-[32px] border border-white/60 bg-white/72 backdrop-blur-xl p-6 md:p-8 shadow-soft relative overflow-hidden">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-orange-600">Application File</p>
                  <h1 className="mt-2 text-2xl font-black text-slate-900 leading-tight">{application.service_name}</h1>
                  <p className="mt-2 font-mono text-xs text-slate-400">ID: {application.id}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge status={application.status} />
                  {payment ? <PaymentBadge status={payment.status} /> : null}
                </div>
              </div>

              {/* High-Fidelity Stepper Timeline */}
              <div className="mt-8 pt-6 border-t border-slate-100/80">
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-5">Filing Status Tracker</p>
                <div className="relative flex items-center justify-between max-w-xl mx-auto px-4">
                  {/* Connector line behind */}
                  <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-100 -translate-y-1/2 z-0" />
                  <div 
                    className="absolute top-1/2 left-0 h-0.5 bg-gradient-to-r from-blue-500 to-emerald-500 -translate-y-1/2 z-0 transition-all duration-500" 
                    style={{ width: `${((activeStep - 1) / 4) * 100}%` }}
                  />

                  {trackingSteps.map((s) => {
                    const isCompleted = s.step < activeStep;
                    const isActive = s.step === activeStep;
                    return (
                      <div key={s.step} className="flex flex-col items-center relative z-10">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center border-2 text-[10px] font-black transition-all duration-300 ${
                          isCompleted 
                            ? "bg-emerald-600 border-emerald-600 text-white" 
                            : isActive 
                            ? "bg-white border-blue-600 text-blue-600 shadow-md shadow-blue-500/10 scale-110" 
                            : "bg-white border-slate-200 text-slate-400"
                        }`}>
                          {isCompleted ? "✓" : s.step}
                        </div>
                        <span className={`text-[10px] font-bold mt-1.5 ${
                          isActive ? "text-blue-600" : isCompleted ? "text-emerald-700" : "text-slate-400"
                        }`}>
                          {s.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Form Data Properties List */}
              <div className="mt-8 pt-6 border-t border-slate-100/80">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Application Details</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {Object.entries(formData).map(([key, value]) => (
                    <div key={key} className="rounded-2xl border border-slate-100/50 bg-slate-50/20 p-4">
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{formatFieldLabel(key)}</p>
                      <p className="mt-1 break-words text-sm font-black text-slate-800 leading-normal">{displayValue(value)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Submitted Documents Panel */}
            <div className="rounded-[32px] border border-white/60 bg-white/72 backdrop-blur-xl p-6 md:p-8 shadow-soft relative overflow-hidden">
              <h2 className="text-lg font-black text-slate-900">Submitted Documents</h2>
              <p className="text-xs font-semibold text-slate-400 mt-0.5">Scanned files and certificates related to this file.</p>
              <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
                {application.documents?.length ? (
                  application.documents.map((document) => (
                    <a key={document.id} href={document.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3.5 text-xs font-bold text-slate-800 shadow-sm transition hover:border-blue-200">
                      <FileText className="h-4.5 w-4.5 shrink-0 text-blue-600" />
                      <span className="truncate">{document.file_name}</span>
                    </a>
                  ))
                ) : (
                  <p className="rounded-2xl bg-slate-50 border border-slate-100/50 p-4 text-xs font-semibold text-slate-400 col-span-2 text-center">No documents uploaded.</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            
            {/* Filing Overview Panel */}
            <div className="rounded-3xl border border-white/60 bg-white/72 backdrop-blur-xl p-5 shadow-soft space-y-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Filing Overview</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Paid</p>
                  <p className="mt-1 text-xl font-black text-slate-900">{formatCurrency(application.amount)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Submitted</p>
                  <p className="mt-1 text-xs font-black text-slate-700">{formatDate(application.created_at)}</p>
                </div>
              </div>
            </div>

            {/* Quick Actions Panel */}
            <div className="rounded-3xl border border-white/60 bg-white/72 backdrop-blur-xl p-5 shadow-soft space-y-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Manage Application</p>
                <h3 className="text-sm font-black text-slate-900 mt-1">Quick Actions</h3>
              </div>
              
              <div className="grid gap-2">
                {invoice ? (
                  <Link href={`/invoice/${invoice.id}`} className="flex items-center gap-3.5 rounded-2xl border border-slate-100 bg-white/60 p-3 hover:bg-slate-50/50 hover:border-slate-200 transition group">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 group-hover:scale-105 transition">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black text-slate-800">Download Invoice</p>
                      <p className="text-[10px] font-semibold text-slate-400 mt-0.5">View your tax payment statement</p>
                    </div>
                  </Link>
                ) : null}

                {application.final_document_url ? (
                  <a href={application.final_document_url} target="_blank" rel="noreferrer" className="flex items-center gap-3.5 rounded-2xl border border-slate-100 bg-white/60 p-3 hover:bg-slate-50/50 hover:border-slate-200 transition group">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 group-hover:scale-105 transition">
                      <Download className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black text-slate-800">Download Output</p>
                      <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Get your final certificate / card</p>
                    </div>
                  </a>
                ) : null}

                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3.5 rounded-2xl border border-slate-100 bg-white/60 p-3 hover:bg-slate-50/50 hover:border-slate-200 transition group">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-650 group-hover:scale-105 transition">
                    <MessageCircle className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black text-slate-800">Help Desk Chat</p>
                    <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Talk to our customer desk on WhatsApp</p>
                  </div>
                </a>

                <Link href={`/services/${application.service_slug}`} className="flex items-center gap-3.5 rounded-2xl border border-slate-100 bg-white/60 p-3 hover:bg-slate-50/50 hover:border-slate-200 transition group">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-600 group-hover:scale-105 transition">
                    <RotateCcw className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black text-slate-800">Apply Service Again</p>
                    <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Submit a new filing request</p>
                  </div>
                </Link>
              </div>
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
