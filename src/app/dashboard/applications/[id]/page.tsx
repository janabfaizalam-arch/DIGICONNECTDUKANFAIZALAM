import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Download, FileText, RotateCcw } from "lucide-react";

import { PaymentBadge, StatusBadge } from "@/components/portal/status-badge";
import { RatingForm } from "@/components/portal/rating-form";
import { Card } from "@/components/ui/card";
import { getCurrentUser, getCurrentUserRole, getRoleHome, isCustomerRole } from "@/lib/auth";
import { formatCurrency } from "@/lib/portal-data";
import type { Application, ApplicationDocument, Invoice, Payment, Rating } from "@/lib/portal-types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

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
      .select("id, application_id, document_type, file_name, file_url, file_type, storage_path, created_at")
      .eq("application_id", id),
    supabase
      .from("payments")
      .select("id, application_id, amount, status, screenshot_url, storage_path, created_at")
      .eq("application_id", id),
    supabase
      .from("invoices")
      .select("id, application_id, invoice_number, customer_name, customer_email, service_name, amount, payment_status, created_at")
      .eq("application_id", id),
    supabase.from("ratings").select("id, application_id, user_id, rating, feedback, created_at").eq("application_id", id),
  ]);

  const application = {
    ...(data as Application),
    documents: (documentsResult.data ?? []) as ApplicationDocument[],
    payments: (paymentsResult.data ?? []) as Payment[],
    invoices: (invoicesResult.data ?? []) as Invoice[],
    ratings: (ratingsResult.data ?? []) as Rating[],
  };
  const formData = asRecord(application.form_data);
  const payment = application.payments?.[0];
  const invoice = application.invoices?.[0];
  const rating = application.ratings?.[0];

  return (
    <main className="min-h-screen px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-6xl">
        <Link href="/customer/dashboard" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--primary)]">
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          <Card className="rounded-2xl p-5 md:p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--secondary)]">Application</p>
                <h1 className="mt-2 text-3xl font-bold text-slate-950">{application.service_name}</h1>
                <p className="mt-2 font-mono text-xs text-slate-500">ID: {application.id}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge status={application.status} />
                {payment ? <PaymentBadge status={payment.status} /> : null}
              </div>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {Object.entries(formData).map(([key, value]) => (
                <div key={key} className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase text-slate-500">{key.replace(/([A-Z])/g, " $1")}</p>
                  <p className="mt-1 break-words text-sm font-bold text-slate-900">{displayValue(value)}</p>
                </div>
              ))}
            </div>

            <div className="mt-6">
              <h2 className="text-lg font-bold text-slate-950">Submitted Documents</h2>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {application.documents?.length ? (
                  application.documents.map((document) => (
                    <a key={document.id} href={document.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-2xl border bg-white p-4 text-sm font-bold text-slate-900">
                      <FileText className="h-4 w-4 text-[var(--primary)]" />
                      {document.file_name}
                    </a>
                  ))
                ) : (
                  <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">No documents uploaded.</p>
                )}
              </div>
            </div>
          </Card>

          <div className="space-y-4">
            <Card className="rounded-2xl p-5">
              <p className="text-sm font-medium text-slate-500">Amount</p>
              <p className="mt-1 text-2xl font-bold text-slate-950">{formatCurrency(application.amount)}</p>
              <p className="mt-4 text-sm font-medium text-slate-500">Submitted</p>
              <p className="mt-1 text-sm font-bold text-slate-900">{formatDate(application.created_at)}</p>
            </Card>

            {invoice ? (
              <Link href={`/invoice/${invoice.id}`} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-5 text-sm font-bold text-white">
                <Download className="h-4 w-4" />
                Download Invoice
              </Link>
            ) : null}

            {application.final_document_url ? (
              <a href={application.final_document_url} target="_blank" rel="noreferrer" className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 text-sm font-bold text-white">
                <Download className="h-4 w-4" />
                Download Final Document
              </a>
            ) : null}

            <Link href={`/services/${application.service_slug}`} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-orange-500 px-5 text-sm font-bold text-white">
              <RotateCcw className="h-4 w-4" />
              Apply Again
            </Link>

            {application.status === "completed" ? (
              <RatingForm applicationId={application.id} existingRating={rating?.rating} />
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}
