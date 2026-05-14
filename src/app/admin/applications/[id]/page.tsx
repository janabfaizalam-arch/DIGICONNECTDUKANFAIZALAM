import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, FileText, MessageCircle, ReceiptText } from "lucide-react";

import { AdminUpdateForm } from "@/components/portal/admin-update-form";
import { PaymentBadge, StatusBadge } from "@/components/portal/status-badge";
import { Card } from "@/components/ui/card";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { safeCurrency, safeDateTime } from "@/lib/admin-format";
import { getCustomerMobile, getCustomerName, hydrateApplications } from "@/lib/crm";
import type { Application } from "@/lib/portal-types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { generateWhatsAppLink } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

function formatDate(date: string) {
  return safeDateTime(date);
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

export default async function AdminApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) {
    redirect("/login");
  }

  if (!isAdminRole(role)) {
    redirect("/dashboard");
  }

  const { id } = await params;
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    notFound();
  }

  let data: Application | null = null;

  try {
    const result = await supabase.from("applications").select("*").eq("id", id).maybeSingle();
    data = result.error ? null : (result.data as Application | null);
  } catch (error) {
    console.error("[admin-application-detail] Failed to load application", error);
  }

  if (!data) {
    notFound();
  }

  let application = data;
  try {
    [application] = (await hydrateApplications([data])) as Application[];
  } catch (error) {
    console.error("[admin-application-detail] Failed to hydrate application", error);
  }
  const payment = application.payments?.[0];
  const invoice = application.invoices?.[0];
  const formData = asRecord(application.form_data);
  const customerMobile = getCustomerMobile(application);

  let notes: { id: string; application_id: string; note: string; assigned_to: string | null; created_at: string }[] = [];
  let staffData: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
    role?: string | null;
    mobile?: string | null;
    agent_code?: string | null;
    commission_type?: "fixed" | "percentage" | null;
    commission_value?: number | null;
    commission_rate?: number | null;
    active?: boolean | null;
    is_active?: boolean | null;
  }[] = [];
  let statusLogs: { id: string; old_status: string | null; new_status: string; note: string | null; created_at: string }[] = [];

  try {
    const [notesResult, staffResult, statusLogsResult] = await Promise.all([
      supabase.from("admin_notes").select("id, application_id, note, assigned_to, created_at").eq("application_id", id).order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, full_name, email, avatar_url, role, mobile, agent_code, commission_type, commission_value, commission_rate, active, is_active").eq("role", "staff"),
      supabase.from("status_logs").select("id, old_status, new_status, note, created_at").eq("application_id", id).order("created_at", { ascending: false }),
    ]);

    notes = notesResult.error ? [] : (notesResult.data ?? []) as typeof notes;
    staffData = staffResult.error ? [] : (staffResult.data ?? []) as typeof staffData;
    statusLogs = statusLogsResult.error ? [] : (statusLogsResult.data ?? []) as typeof statusLogs;
  } catch (error) {
    console.error("[admin-application-detail] Failed to load related data", error);
  }

  return (
    <div className="mx-auto max-w-7xl">
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--primary)]">
          <ArrowLeft className="h-4 w-4" />
          Back to admin
        </Link>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
          <Card className="p-5 md:p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--secondary)]">Admin Application</p>
                <h1 className="mt-2 text-3xl font-bold text-slate-950">{application.service_name}</h1>
                <p className="mt-2 font-mono text-xs text-slate-500">ID: {application.id}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge status={application.status} />
                <PaymentBadge status={application.payment_status ?? payment?.status ?? "pending"} />
              </div>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase text-slate-500">Customer</p>
                <p className="mt-1 font-bold text-slate-950">{getCustomerName(application)}</p>
                <p className="mt-1 text-sm text-slate-600">{displayValue(formData.email) || application.customers?.email}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase text-slate-500">Mobile</p>
                <p className="mt-1 font-mono font-bold text-slate-950">{customerMobile || "Not provided"}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase text-slate-500">Amount</p>
                <p className="mt-1 font-bold text-slate-950">{safeCurrency(application.amount)}</p>
              </div>
            </div>

            <h2 className="mt-6 text-lg font-bold text-slate-950">Service Details</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {Object.entries(formData).map(([key, value]) => (
                <div key={key} className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase text-slate-500">{key.replace(/([A-Z])/g, " $1")}</p>
                  <p className="mt-1 break-words text-sm font-bold text-slate-900">{displayValue(value)}</p>
                </div>
              ))}
            </div>

            <h2 className="mt-6 text-lg font-bold text-slate-950">Documents</h2>
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

            <h2 className="mt-6 text-lg font-bold text-slate-950">Payment</h2>
            <div className="mt-3 grid gap-3 rounded-2xl bg-slate-50 p-4 md:grid-cols-2">
              {[
                ["Payment Status", application.payment_status ?? payment?.status ?? "pending"],
                ["Razorpay Order ID", payment?.razorpay_order_id ?? "-"],
                ["Razorpay Payment ID", payment?.razorpay_payment_id ?? "-"],
                ["Amount", safeCurrency(payment?.amount ?? application.real_payment_amount ?? application.amount)],
                ["Payment Method", payment?.payment_method ?? "-"],
                ["Paid At", payment?.paid_at ? formatDate(payment.paid_at) : "-"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-white p-3">
                  <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
                  <p className="mt-1 break-words font-mono text-sm font-bold text-slate-950">{value}</p>
                </div>
              ))}
            </div>

            <h2 className="mt-6 text-lg font-bold text-slate-950">Rewards & Referral</h2>
            <div className="mt-3 grid gap-3 rounded-2xl bg-blue-50/70 p-4 md:grid-cols-2">
              {[
                ["Wallet Redeemed", safeCurrency(application.wallet_redeemed_amount ?? application.wallet_used_amount ?? 0)],
                ["Fresh Razorpay Paid", safeCurrency(application.fresh_payable_amount ?? application.real_payment_amount ?? payment?.amount ?? 0)],
                ["Cashback Eligible", safeCurrency(application.cashback_eligible_amount ?? application.real_payment_amount ?? 0)],
                ["Cashback Status", application.cashback_awarded || application.cashback_credited_at ? "credited" : "pending completion"],
                ["Referral Reward", application.referral_reward_processed ? "processed" : "pending / not applicable"],
                ["Closed-loop Use", "DigiConnect services only; no cash withdrawal"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-white p-3">
                  <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
                  <p className="mt-1 break-words text-sm font-bold text-slate-950">{value}</p>
                </div>
              ))}
            </div>
          </Card>

          <div className="space-y-4">
            <Card className="p-5">
              <h2 className="text-lg font-bold text-slate-950">Update Work</h2>
              <div className="mt-4">
                <AdminUpdateForm
                  applicationId={application.id}
                  currentStatus={application.status}
                  currentPaymentStatus={application.payment_status ?? payment?.status ?? "pending"}
                  cashbackEnabled={application.cashback_enabled ?? true}
                  cashbackAmount={application.cashback_amount ?? application.amount}
                  cashbackExpiryDays={application.cashback_expiry_days ?? 90}
                  customerMobile={customerMobile}
                  serviceName={application.service_name}
                  hideAgentFields
                  staff={staffData ?? []}
                  assignedStaffId={application.assigned_staff_id ?? ""}
                />
              </div>
            </Card>

            <Card className="p-5">
              <h2 className="text-lg font-bold text-slate-950">Invoice</h2>
              <div className="mt-4 space-y-3">
                {invoice ? (
                  <Link href={`/invoice/${invoice.id}`} className="flex min-h-11 items-center justify-center gap-2 rounded-full border bg-white px-4 text-sm font-bold text-slate-900">
                    <ReceiptText className="h-4 w-4" />
                    Open Invoice
                  </Link>
                ) : (
                  <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">No invoice found yet.</p>
                )}
              </div>
            </Card>

            {customerMobile ? (
              <Card className="p-5">
                <h2 className="text-lg font-bold text-slate-950">WhatsApp Status</h2>
                <div className="mt-4 grid gap-2">
                  {[
                    ["Send received message", "Your application has been received by DigiConnect Dukan. We will review it shortly."],
                    ["Send documents pending message", "Your DigiConnect Dukan application needs pending documents. Please share them to continue."],
                    ["Send completed message", "Your DigiConnect Dukan application is completed. Thank you for choosing us."],
                  ].map(([label, message]) => (
                    <a key={label} href={generateWhatsAppLink(customerMobile, message)} target="_blank" rel="noreferrer" className="flex min-h-11 items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 text-sm font-bold text-white">
                      <MessageCircle className="h-4 w-4" />
                      {label}
                    </a>
                  ))}
                </div>
              </Card>
            ) : null}

            <Card className="p-5">
              <h2 className="text-lg font-bold text-slate-950">Internal Notes</h2>
              <div className="mt-4 space-y-3">
                {notes?.length ? (
                  notes.map((note) => (
                    <div key={note.id} className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-sm leading-relaxed text-slate-700">{note.note}</p>
                      <p className="mt-2 text-xs font-bold text-slate-500">{formatDate(note.created_at)}</p>
                    </div>
                  ))
                ) : (
                  <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">No notes yet.</p>
                )}
              </div>
            </Card>

            <Card className="p-5">
              <h2 className="text-lg font-bold text-slate-950">Activity Timeline</h2>
              <div className="mt-4 space-y-3">
                {statusLogs?.length ? (
                  statusLogs.map((log) => (
                    <div key={log.id} className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-sm font-bold text-slate-950">
                        {String(log.old_status ?? "new").replace(/_/g, " ")} to {String(log.new_status).replace(/_/g, " ")}
                      </p>
                      {log.note ? <p className="mt-1 text-sm text-slate-600">{log.note}</p> : null}
                      <p className="mt-2 text-xs font-bold text-slate-500">{formatDate(log.created_at)}</p>
                    </div>
                  ))
                ) : (
                  <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">No activity history yet.</p>
                )}
              </div>
            </Card>
          </div>
        </div>
    </div>
  );
}
