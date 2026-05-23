import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Download, FileText, ReceiptText } from "lucide-react";

import { AdminDocumentReviewActions } from "@/components/admin/admin-document-review-actions";
import { GenerateInvoiceButton } from "@/components/admin/generate-invoice-button";
import { AdminUpdateForm } from "@/components/portal/admin-update-form";
import { PaymentBadge, StatusBadge } from "@/components/portal/status-badge";
import { Card } from "@/components/ui/card";
import { getAdminApplicationDetail } from "@/lib/admin-crm";
import { safeCurrency, safeDateTime } from "@/lib/admin-format";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function DetailRow({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
      <p className={`mt-1 break-words text-sm font-semibold text-slate-950 ${mono ? "font-mono" : ""}`}>{value || "-"}</p>
    </div>
  );
}

function text(value: unknown) {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean" ? String(value) : "";
}

const hiddenFormKeys = new Set(["documents", "payment", "service_slugs"]);
const formLabels: Record<string, string> = {
  pincode: "Pin Code",
  district: "District",
  state: "State",
  maritalStatus: "Marital Status",
  casteCategory: "Caste / Category",
  tradeWorkType: "Trade / Work Type",
  traditionalOccupationCommunity: "Traditional occupation caste/community",
  migrantWorker: "Migrant worker/artisan",
  upResidentFamilyBenefit: "UP resident and family benefit declaration",
  termsAccepted: "Terms Accepted",
};

function labelFromKey(key: string) {
  return formLabels[key] ?? key.replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default async function AdminApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  const { id } = await params;
  const detail = await getAdminApplicationDetail(id);
  if (!detail) notFound();

  const { application, payment, invoice, customer, documents, invoices, payments, notes, statusLogs, agents, facts } = detail;
  const formData = asRecord(application.form_data);
  const customerMobile = customer.mobile;
  const finalDocuments = documents.filter((document) => document.is_final || document.document_type === "final_document");
  const customerDocuments = documents.filter((document) => !(document.is_final || document.document_type === "final_document"));
  const paymentProofUrl = payment?.screenshot_url || application.payment_screenshot_url || "";
  const appFinalDocumentUrl = application.final_document_url || application.completed_document_url || "";

  return (
    <div className="mx-auto max-w-7xl">
      <Link href="/admin/applications" className="inline-flex items-center gap-2 text-sm font-bold text-blue-700">
        <ArrowLeft className="h-4 w-4" />
        Back to applications
      </Link>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <Card className="p-5 md:p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-600">Application</p>
                <h1 className="mt-2 text-3xl font-bold text-slate-950">{application.service_name}</h1>
                <p className="mt-1 font-mono text-xs text-slate-500">{application.id}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge status={application.status} />
                <PaymentBadge status={application.payment_status ?? payment?.status ?? "pending"} />
              </div>
            </div>

            <div className="mt-5 grid gap-4 rounded-2xl bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-4">
              <DetailRow label="Amount" value={safeCurrency(facts.totalAmount)} />
              <DetailRow label="Created" value={facts.createdAt} mono />
              <DetailRow label="Paid" value={facts.paidAt} mono />
              <DetailRow label="Completed" value={facts.completedAt} mono />
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-lg font-bold text-slate-950">Customer Details</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <DetailRow label="Name" value={customer.name || text(formData.name)} />
              <DetailRow label="Mobile" value={customerMobile || text(formData.mobile)} mono />
              <DetailRow label="Email" value={customer.email || text(formData.email)} />
              <DetailRow label="Address" value={customer.address || text(formData.address)} />
              <DetailRow label="City" value={customer.city || text(formData.city)} />
              <DetailRow label="State / PIN" value={[customer.state || text(formData.state), customer.pincode || text(formData.pincode)].filter(Boolean).join(" / ")} />
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-lg font-bold text-slate-950">Submitted Form Details</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {Object.entries(formData)
                .filter(([key, value]) => !hiddenFormKeys.has(key) && text(value))
                .map(([key, value]) => (
                  <DetailRow key={key} label={labelFromKey(key)} value={text(value)} />
                ))}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-lg font-bold text-slate-950">Payment Details</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <DetailRow label="Payment Status" value={application.payment_status ?? payment?.status ?? "pending"} />
              <DetailRow label="Net Received" value={safeCurrency(facts.verifiedPaidAmount || application.fresh_payable_amount || application.real_payment_amount)} />
              <DetailRow label="Wallet Used" value={safeCurrency(facts.walletRedeemed)} />
              <DetailRow label="Cashback Eligible" value={safeCurrency(facts.cashbackEligible)} />
              <DetailRow label="Razorpay Order" value={application.razorpay_order_id ?? payment?.razorpay_order_id} mono />
              <DetailRow label="Razorpay Payment" value={application.razorpay_payment_id ?? payment?.razorpay_payment_id} mono />
            </div>
            {paymentProofUrl ? (
              <a href={paymentProofUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex h-10 items-center gap-2 rounded-full border bg-white px-4 text-sm font-bold text-slate-900">
                <Download className="h-4 w-4" />
                View Payment Proof
              </a>
            ) : null}
          </Card>

          <Card className="p-5">
            <h2 className="text-lg font-bold text-slate-950">Customer Uploaded Documents</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {customerDocuments.length ? customerDocuments.map((document) => (
                <div key={document.id} className="rounded-xl border bg-white p-4 text-sm">
                  <div className="flex items-center gap-2 font-bold text-slate-950">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <span className="min-w-0 truncate">{document.document_name || document.document_type || document.file_name}</span>
                  </div>
                  <p className="mt-1 text-xs font-semibold capitalize text-slate-500">{String(document.document_type ?? "document").replace(/_/g, " ")}</p>
                  <p className="mt-1 break-all font-mono text-xs text-slate-500">{document.file_name}</p>
                  <p className="mt-1 text-xs text-slate-500">Uploaded {safeDateTime(document.uploaded_at ?? document.created_at)}</p>
                  <p className="mt-1 text-xs font-bold capitalize text-slate-600">{String(document.review_status ?? document.status ?? "pending").replace(/_/g, " ")}</p>
                  {document.rejection_reason ? <p className="mt-1 text-xs text-orange-700">{document.rejection_reason}</p> : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {document.file_url ? (
                      <a href={document.file_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-3 py-2 text-xs font-bold text-white">
                        <Download className="h-3.5 w-3.5" />
                        View / Download
                      </a>
                    ) : null}
                    <AdminDocumentReviewActions documentId={document.id} />
                  </div>
                </div>
              )) : <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600 md:col-span-2">No customer documents uploaded yet.</p>}
            </div>

            <h3 className="mt-5 text-sm font-bold uppercase text-slate-500">Final Document</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {finalDocuments.length ? finalDocuments.map((document) => (
                <div key={document.id} className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                  <p className="font-bold text-emerald-950">{document.document_name || document.file_name}</p>
                  <p className="mt-1 text-xs text-emerald-800">{safeDateTime(document.uploaded_at ?? document.created_at)}</p>
                  {document.file_url ? (
                    <a href={document.file_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex rounded-full bg-emerald-600 px-3 py-2 text-xs font-bold text-white">Open Final Document</a>
                  ) : null}
                </div>
              )) : appFinalDocumentUrl ? (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                  <p className="font-bold text-emerald-950">{application.final_document_name || "Final document"}</p>
                  <a href={appFinalDocumentUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex rounded-full bg-emerald-600 px-3 py-2 text-xs font-bold text-white">Open Final Document</a>
                </div>
              ) : <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600 md:col-span-2">No final document uploaded yet.</p>}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-lg font-bold text-slate-950">Invoice</h2>
            <div className="mt-4">
              {invoice ? (
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="font-bold text-slate-950">{invoice.invoice_number}</p>
                  <p className="mt-1 text-sm text-slate-600">{safeCurrency(invoice.amount)} · {invoice.payment_status}</p>
                  <Link href={`/invoice/${invoice.id}`} className="mt-3 inline-flex h-10 items-center gap-2 rounded-full bg-blue-600 px-4 text-sm font-bold text-white">
                    <ReceiptText className="h-4 w-4" />
                    Open Invoice
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Invoice has not been generated yet.</p>
                  <GenerateInvoiceButton applicationId={application.id} />
                </div>
              )}
              <p className="mt-3 text-xs text-slate-500">{invoices.length} invoice row(s), {payments.length} payment row(s) linked.</p>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-lg font-bold text-slate-950">Status Timeline</h2>
            <div className="mt-4 space-y-3">
              {statusLogs.length ? statusLogs.map((log: { id: string; old_status: string | null; new_status: string; note: string | null; created_at: string }) => (
                <div key={log.id} className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm font-bold text-slate-950">{String(log.old_status ?? "new").replace(/_/g, " ")} to {String(log.new_status).replace(/_/g, " ")}</p>
                  {log.note ? <p className="mt-1 text-sm text-slate-600">{log.note}</p> : null}
                  <p className="mt-2 text-xs font-bold text-slate-500">{safeDateTime(log.created_at)}</p>
                </div>
              )) : <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">No status history yet.</p>}
            </div>
          </Card>

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
        </div>

        <aside className="space-y-4 lg:sticky lg:top-5 lg:self-start">
          <Card className="p-5">
            <h2 className="text-lg font-bold text-slate-950">Actions</h2>
            <div className="mt-4">
              <AdminUpdateForm
                applicationId={application.id}
                currentStatus={application.status}
                currentPaymentStatus={application.payment_status ?? payment?.status ?? "pending"}
                customerMobile={customerMobile}
                customerName={customer.name}
                serviceName={application.service_name}
                invoiceHref={invoice ? `/invoice/${invoice.id}` : null}
                agentOptions={agents}
                assignedAgentId={application.assigned_agent_id ?? application.agent_id}
              />
            </div>
            {!invoice ? <div className="mt-3"><GenerateInvoiceButton applicationId={application.id} /></div> : null}
            {appFinalDocumentUrl ? (
              <a href={appFinalDocumentUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border bg-white px-4 text-sm font-bold text-slate-900">
                <Download className="h-4 w-4" />
                Open Final Document
              </a>
            ) : null}
          </Card>
        </aside>
      </div>
    </div>
  );
}
