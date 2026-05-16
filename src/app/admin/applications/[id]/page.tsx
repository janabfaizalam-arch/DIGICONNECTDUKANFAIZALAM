import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AlertTriangle, ArrowLeft, FileText, MessageCircle, ReceiptText } from "lucide-react";

import { ReprocessRewardsButton } from "@/components/admin/reprocess-rewards-button";
import { AdminUpdateForm } from "@/components/portal/admin-update-form";
import { PaymentBadge, StatusBadge } from "@/components/portal/status-badge";
import { Card } from "@/components/ui/card";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { safeCurrency, safeDateTime } from "@/lib/admin-format";
import { getAdminApplicationDetail } from "@/lib/admin-crm";
import { generateWhatsAppLink } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function displayValue(value: unknown) {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function DetailTile({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="rounded-2xl bg-white p-3">
      <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
      <p className={`mt-1 break-words text-sm font-bold text-slate-950 ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}

export default async function AdminApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  const { id } = await params;
  const detail = await getAdminApplicationDetail(id);

  if (!detail) notFound();

  const {
    application,
    payment,
    invoice,
    customer,
    documents,
    invoices,
    payments,
    notes,
    staff,
    statusLogs,
    referralDebug,
    diagnostics,
    warnings,
    facts,
  } = detail;
  const formData = asRecord(application.form_data);
  const customerMobile = customer.mobile;
  const warningItems = [...warnings, ...diagnostics.map((item: { message?: string }) => item.message).filter(Boolean) as string[]];

  return (
    <div className="mx-auto max-w-7xl">
      <Link href="/admin/applications" className="inline-flex items-center gap-2 text-sm font-bold text-blue-700">
        <ArrowLeft className="h-4 w-4" />
        Back to applications
      </Link>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
        <Card className="p-5 md:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-orange-600">Admin Application</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-950">{application.service_name}</h1>
              <p className="mt-2 font-mono text-xs text-slate-500">ID: {application.id}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={application.status} />
              <PaymentBadge status={application.payment_status ?? payment?.status ?? "pending"} />
            </div>
          </div>

          {warningItems.length ? (
            <div className="mt-5 rounded-2xl border border-orange-200 bg-orange-50 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-orange-700" />
                <div>
                  <p className="font-bold text-orange-950">CRM warnings</p>
                  <ul className="mt-2 space-y-1 text-sm text-orange-800">
                    {warningItems.map((warning) => <li key={warning}>{warning}</li>)}
                  </ul>
                </div>
              </div>
            </div>
          ) : null}

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase text-slate-500">Customer</p>
              <p className="mt-1 font-bold text-slate-950">{customer.name}</p>
              <p className="mt-1 text-sm text-slate-600">{customer.email || application.customers?.email || "-"}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase text-slate-500">Mobile</p>
              <p className="mt-1 font-mono font-bold text-slate-950">{customerMobile || "Not provided"}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase text-slate-500">Total Amount</p>
              <p className="mt-1 font-bold text-slate-950">{safeCurrency(facts.totalAmount)}</p>
            </div>
          </div>

          <h2 className="mt-6 text-lg font-bold text-slate-950">Payment Facts</h2>
          <div className="mt-3 grid gap-3 rounded-2xl bg-slate-50 p-4 md:grid-cols-2">
            <DetailTile label="Payment Status" value={application.payment_status ?? payment?.status ?? "pending"} />
            <DetailTile label="Verified Razorpay Paid" value={safeCurrency(facts.verifiedPaidAmount)} />
            <DetailTile label="Wallet Redeemed" value={safeCurrency(facts.walletRedeemed)} />
            <DetailTile label="Cashback Eligible" value={safeCurrency(facts.cashbackEligible)} />
            <DetailTile label="Razorpay Order ID" value={application.razorpay_order_id ?? payment?.razorpay_order_id ?? "-"} mono />
            <DetailTile label="Razorpay Payment ID" value={application.razorpay_payment_id ?? payment?.razorpay_payment_id ?? "-"} mono />
            <DetailTile label="Payment Method" value={payment?.payment_method ?? "-"} />
            <DetailTile label="Paid At" value={facts.paidAt} mono />
          </div>

          <h2 className="mt-6 text-lg font-bold text-slate-950">Lifecycle</h2>
          <div className="mt-3 grid gap-3 rounded-2xl bg-blue-50/70 p-4 md:grid-cols-2">
            <DetailTile label="Created" value={facts.createdAt} mono />
            <DetailTile label="Submitted" value={facts.submittedAt} mono />
            <DetailTile label="Completed" value={facts.completedAt} mono />
            <DetailTile label="Payment Rows" value={payments.length} />
            <DetailTile label="Cashback Status" value={application.cashback_awarded || application.cashback_credited_at ? "credited" : "pending / not applicable"} />
            <DetailTile label="Referral Reward" value={application.referral_reward_processed ? "processed" : "pending / not applicable"} />
            <DetailTile label="Referral Code Used" value={referralDebug?.referral_code_used ?? "-"} mono />
            <DetailTile label="Referrer" value={referralDebug?.referred_by_user_id ?? "-"} mono />
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
            {documents.length ? (
              documents.map((document) => (
                <a key={document.id} href={document.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-2xl border bg-white p-4 text-sm font-bold text-slate-900">
                  <FileText className="h-4 w-4 text-blue-600" />
                  {document.file_name}
                </a>
              ))
            ) : (
              <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">No documents uploaded.</p>
            )}
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
                staff={staff ?? []}
                assignedStaffId={application.assigned_staff_id ?? ""}
              />
              <div className="mt-3">
                <ReprocessRewardsButton applicationId={application.id} />
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-lg font-bold text-slate-950">Invoices & Payments</h2>
            <div className="mt-4 space-y-3">
              {invoice ? (
                <Link href={`/invoice/${invoice.id}`} className="flex min-h-11 items-center justify-center gap-2 rounded-full border bg-white px-4 text-sm font-bold text-slate-900">
                  <ReceiptText className="h-4 w-4" />
                  Open Invoice
                </Link>
              ) : (
                <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">No invoice found yet.</p>
              )}
              <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">{invoices.length} invoice row(s), {payments.length} payment row(s) linked.</p>
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
              {notes.length ? notes.map((note: { id: string; note: string; created_at: string }) => (
                <div key={note.id} className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm leading-relaxed text-slate-700">{note.note}</p>
                  <p className="mt-2 text-xs font-bold text-slate-500">{safeDateTime(note.created_at)}</p>
                </div>
              )) : <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">No notes yet.</p>}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-lg font-bold text-slate-950">Activity Timeline</h2>
            <div className="mt-4 space-y-3">
              {statusLogs.length ? statusLogs.map((log: { id: string; old_status: string | null; new_status: string; note: string | null; created_at: string }) => (
                <div key={log.id} className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm font-bold text-slate-950">
                    {String(log.old_status ?? "new").replace(/_/g, " ")} to {String(log.new_status).replace(/_/g, " ")}
                  </p>
                  {log.note ? <p className="mt-1 text-sm text-slate-600">{log.note}</p> : null}
                  <p className="mt-2 text-xs font-bold text-slate-500">{safeDateTime(log.created_at)}</p>
                </div>
              )) : <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">No activity history yet.</p>}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
