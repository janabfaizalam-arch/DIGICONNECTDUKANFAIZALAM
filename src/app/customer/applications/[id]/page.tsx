import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, FileText, MessageCircle, RotateCcw } from "lucide-react";

import { PaymentBadge, StatusBadge } from "@/components/portal/status-badge";
import { RatingForm } from "@/components/portal/rating-form";
import { DprApplicationDetails } from "@/components/services/dpr/dpr-application-details";
import { ItrApplicationDetails } from "@/components/services/itr/itr-application-details";
import { getCurrentUser, getCurrentUserRole, getRoleHome, isCustomerRole } from "@/lib/auth";
import { CUSTOMER_APPLICATION_SELECT } from "@/lib/applications/safe-selects";
import { isCustomerVisibleDocument } from "@/lib/applications/document-visibility";
import {
  mapStatusLogToCustomerActivity,
  mapTimelineToCustomerActivity,
  mergeCustomerActivity,
  type CustomerActivityItem,
} from "@/lib/applications/customer-activity";
import {
  isCustomerPaymentSettled,
  resolveCustomerNextAction,
} from "@/lib/applications/customer-next-action";
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

function stripStoragePath<T extends { storage_path?: string | null }>(row: T): Omit<T, "storage_path"> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { storage_path, ...rest } = row;
  return rest;
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

  const { data, error } = await supabase
    .from("applications")
    .select(CUSTOMER_APPLICATION_SELECT)
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("CUSTOMER_APPLICATION_DETAIL_LOAD_FAILED", {
      applicationId: id,
      userId: user.id,
      message: error.message,
      code: error.code,
    });
    return (
      <main className="min-h-screen bg-slate-50 px-3 py-10">
        <div className="mx-auto max-w-lg rounded-xl border border-slate-200 bg-white p-6 text-center">
          <h1 className="text-lg font-bold text-slate-900">Unable to load application</h1>
          <p className="mt-2 text-sm text-slate-600">Please retry in a moment.</p>
          <Link href="/customer/dashboard" className="mt-4 inline-flex text-sm font-semibold text-blue-700">
            Back to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  if (!data) {
    notFound();
  }

  const [documentsResult, paymentsResult, invoicesResult, ratingsResult, timelineRes, logsRes] = await Promise.all([
    supabase
      .from("application_documents")
      .select(
        "id, application_id, document_type, document_name, file_name, file_url, file_type, storage_path, status, review_status, uploaded_by_role, is_final, customer_visible, uploaded_at, created_at",
      )
      .eq("application_id", id)
      .eq("is_final", false),
    supabase
      .from("payments")
      .select(
        "id, application_id, amount, status, screenshot_url, razorpay_order_id, razorpay_payment_id, razorpay_status, payment_method, paid_at, created_at",
      )
      .eq("application_id", id),
    supabase
      .from("invoices")
      .select("id, application_id, invoice_number, customer_name, customer_email, service_name, amount, payment_status, created_at")
      .eq("application_id", id),
    supabase.from("ratings").select("id, application_id, user_id, rating, feedback, created_at").eq("application_id", id),
    supabase
      .from("entity_timelines")
      .select("id, event_title, event_description, created_at, metadata")
      .eq("entity_type", "application")
      .eq("entity_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("status_logs")
      .select("id, new_status, note, created_at")
      .eq("application_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const signedDocuments = await resolveDocumentUrls(
    ((documentsResult.data ?? []) as ApplicationDocument[]).filter(isCustomerVisibleDocument),
  );
  const safeDocuments = signedDocuments.map((doc) => stripStoragePath(doc));

  const application = {
    ...(data as unknown as Application),
    final_document_url: null,
    final_document_path: null,
    documents: safeDocuments,
    payments: (paymentsResult.data ?? []) as Payment[],
    invoices: (invoicesResult.data ?? []) as Invoice[],
    ratings: (ratingsResult.data ?? []) as Rating[],
  };
  const formData = asRecord(application.form_data);
  const payment = application.payments?.[0];
  const invoice = application.invoices?.[0];
  const rating = application.ratings?.[0];
  const paymentStatus = payment?.status ?? application.payment_status;
  const paymentSettled = isCustomerPaymentSettled(paymentStatus);
  const missingDocuments =
    application.status === "documents_required" || application.status === "document_pending";

  const nextAction = resolveCustomerNextAction({
    applicationId: application.id,
    status: application.status,
    paymentStatus,
    missingDocuments,
    invoiceId: invoice?.id ?? null,
  });

  const whatsappUrl = buildWhatsAppUrl(
    buildApplicationWhatsAppMessage({
      applicationId: application.id,
      serviceName: application.service_name,
      status: application.status,
    }),
  );

  const timelineItems = ((timelineRes.data ?? []) as Array<{
    id: string;
    event_title?: string | null;
    event_description?: string | null;
    created_at: string;
    metadata?: { customer_visible?: boolean | null } | null;
  }>)
    .map((row) =>
      mapTimelineToCustomerActivity({
        ...row,
        customer_visible: row.metadata?.customer_visible,
      }),
    )
    .filter((item): item is CustomerActivityItem => Boolean(item));

  const logItems = ((logsRes.data ?? []) as Array<{
    id: string;
    new_status?: string | null;
    note?: string | null;
    created_at: string;
  }>).map(mapStatusLogToCustomerActivity);

  let timelines = mergeCustomerActivity([...timelineItems, ...logItems]);

  if (timelines.length === 0 && application.created_at) {
    timelines = [
      {
        id: "fallback-creation",
        title: "Application submitted",
        description: "Your application was registered successfully.",
        created_at: application.created_at,
      },
    ];
  }

  let activeStep = 1;
  if (application.status === "completed" || application.status === "delivered") {
    activeStep = 5;
  } else if (application.status === "in_progress" || application.status === "assigned_to_agent") {
    activeStep = 4;
  } else if (application.status === "documents_verified") {
    activeStep = 3;
  } else if (paymentSettled || application.status === "payment_success" || application.status === "submitted") {
    activeStep = 2;
  }

  const trackingSteps = [
    { step: 1, label: "Submitted" },
    { step: 2, label: "Payment" },
    { step: 3, label: "Docs" },
    { step: 4, label: "In Progress" },
    { step: 5, label: "Completed" },
  ];

  return (
    <main className="min-h-screen bg-slate-50 px-3 py-6 pb-24 md:px-8 md:py-10">
      <div className="mx-auto max-w-5xl">
        <Link href="/customer/dashboard?tab=applications" className="inline-flex items-center gap-2 text-xs font-semibold text-blue-700">
          <ArrowLeft className="h-4 w-4" />
          Applications
        </Link>

        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-none md:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold text-slate-950 md:text-2xl">{application.service_name}</h1>
              <p className="mt-1 font-mono text-[11px] text-slate-500">ID: {application.application_code || application.id}</p>
              <p className="mt-1 text-xs text-slate-500">Created {formatDate(application.created_at)}</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <StatusBadge status={application.status} />
              {paymentStatus ? <PaymentBadge status={paymentStatus} /> : null}
            </div>
          </div>

          {nextAction.key !== "none" ? (
            <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
              <span className="text-xs font-semibold text-blue-900">Next:</span>
              <Link href={nextAction.href} className="inline-flex h-8 items-center rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white">
                {nextAction.label}
              </Link>
            </div>
          ) : null}

          <div className="mt-6 border-t border-slate-100 pt-5">
            <p className="mb-4 text-[10px] font-bold uppercase tracking-wide text-slate-500">Progress</p>
            <div className="relative mx-auto flex max-w-xl items-center justify-between px-2">
              <div className="absolute left-2 right-2 top-1/2 z-0 h-0.5 -translate-y-1/2 bg-slate-100" />
              <div
                className="absolute left-2 top-1/2 z-0 h-0.5 -translate-y-1/2 bg-blue-500 transition-all"
                style={{ width: `calc((100% - 1rem) * ${(activeStep - 1) / 4})` }}
              />
              {trackingSteps.map((s) => {
                const isCompleted = s.step < activeStep;
                const isActive = s.step === activeStep;
                return (
                  <div key={s.step} className="relative z-10 flex flex-col items-center">
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-[10px] font-bold ${
                        isCompleted
                          ? "border-emerald-600 bg-emerald-600 text-white"
                          : isActive
                            ? "border-blue-600 bg-white text-blue-600"
                            : "border-slate-200 bg-white text-slate-400"
                      }`}
                    >
                      {isCompleted ? "✓" : s.step}
                    </div>
                    <span className={`mt-1 max-w-[64px] text-center text-[9px] font-semibold ${isActive ? "text-blue-600" : isCompleted ? "text-emerald-700" : "text-slate-400"}`}>
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_280px]">
          <div className="space-y-4">
            <section id="overview" className="rounded-xl border border-slate-200 bg-white p-4 shadow-none md:p-5">
              <h2 className="text-sm font-bold text-slate-950">Overview</h2>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {Object.entries(formData)
                  .filter(([, value]) => displayValue(value))
                  .map(([key, value]) => (
                    <div key={key} className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{formatFieldLabel(key)}</p>
                      <p className="mt-1 break-words text-sm font-semibold text-slate-800">{displayValue(value)}</p>
                    </div>
                  ))}
              </div>
            </section>

            <section id="documents" className="rounded-xl border border-slate-200 bg-white p-4 shadow-none md:p-5">
              <h2 className="text-sm font-bold text-slate-950">Documents</h2>
              <p className="mt-0.5 text-xs text-slate-500">Your uploaded files for this application.</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {application.documents?.length ? (
                  application.documents.map((document) => (
                    <a
                      key={document.id}
                      href={document.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-3 text-xs font-semibold text-slate-800 hover:border-blue-200"
                    >
                      <FileText className="h-4 w-4 shrink-0 text-blue-600" />
                      <span className="min-w-0 truncate">{document.document_name || document.file_name}</span>
                      {document.review_status || document.status ? (
                        <span className="ml-auto shrink-0 text-[10px] capitalize text-slate-500">
                          {String(document.review_status || document.status).replace(/_/g, " ")}
                        </span>
                      ) : null}
                    </a>
                  ))
                ) : (
                  <p className="col-span-2 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-500">
                    No documents uploaded.
                  </p>
                )}
              </div>
            </section>

            <section id="activity" className="rounded-xl border border-slate-200 bg-white p-4 shadow-none md:p-5">
              <h2 className="text-sm font-bold text-slate-950">Activity</h2>
              <div className="mt-3 space-y-3">
                {timelines.length === 0 ? (
                  <p className="text-xs text-slate-500">No activity yet.</p>
                ) : (
                  timelines.map((item) => (
                    <div key={item.id} className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-xs font-semibold text-slate-900">{item.title}</p>
                        <time className="shrink-0 text-[10px] text-slate-400" dateTime={item.created_at}>
                          {formatDate(item.created_at)}
                        </time>
                      </div>
                      {item.description ? <p className="mt-1 text-[11px] text-slate-600">{item.description}</p> : null}
                    </div>
                  ))
                )}
              </div>
            </section>

            <DprApplicationDetails
              formData={formData}
              serviceSlug={application.service_slug}
              status={application.status}
              finalDocumentUrl={null}
            />

            <ItrApplicationDetails
              formData={formData}
              serviceSlug={application.service_slug}
              status={application.status}
              finalDocumentUrl={null}
            />
          </div>

          <aside className="space-y-3">
            <section id="payment" className="rounded-xl border border-slate-200 bg-white p-4 shadow-none">
              <h2 className="text-sm font-bold text-slate-950">Payment</h2>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Amount</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(application.amount)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Status</span>
                  <span className="font-semibold capitalize text-slate-900">
                    {String(paymentStatus || "pending").replace(/_/g, " ")}
                  </span>
                </div>
              </div>
              {!paymentSettled ? (
                <Link
                  href={`/pay/application/${application.id}`}
                  className="mt-3 inline-flex h-9 w-full items-center justify-center rounded-lg bg-blue-600 text-xs font-semibold text-white"
                >
                  Pay Now
                </Link>
              ) : null}
            </section>

            <section id="invoice" className="rounded-xl border border-slate-200 bg-white p-4 shadow-none">
              <h2 className="text-sm font-bold text-slate-950">Invoice</h2>
              {invoice && paymentSettled ? (
                <Link
                  href={`/invoice/${invoice.id}`}
                  className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                >
                  <FileText className="h-4 w-4 text-blue-600" />
                  View Invoice
                </Link>
              ) : (
                <p className="mt-2 text-xs text-slate-500">
                  {paymentSettled ? "Invoice not available yet." : "Available after verified payment."}
                </p>
              )}
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-none">
              <h2 className="text-sm font-bold text-slate-950">Support</h2>
              <div className="mt-3 grid gap-2">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-emerald-600 text-xs font-semibold text-white"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  WhatsApp Support
                </a>
                <Link
                  href={`/services/${application.service_slug}`}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Apply Again
                </Link>
              </div>
            </section>

            {application.status === "completed" || application.status === "delivered" ? (
              <RatingForm applicationId={application.id} existingRating={rating?.rating} />
            ) : null}
          </aside>
        </div>
      </div>
    </main>
  );
}
