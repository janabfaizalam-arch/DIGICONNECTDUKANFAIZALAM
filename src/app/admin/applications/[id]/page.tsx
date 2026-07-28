import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Download, FileText, ReceiptText } from "lucide-react";

import { GeneratePaymentLink } from "@/components/admin/generate-payment-link";
import { AdminApplicationTabs } from "@/components/admin/admin-application-tabs";
import { AdminDocumentReviewActions } from "@/components/admin/admin-document-review-actions";
import { AdminFinalDocumentPreviewButton } from "@/components/admin/admin-final-document-preview-button";
import { GenerateInvoiceButton } from "@/components/admin/generate-invoice-button";
import { AdminUpdateForm } from "@/components/portal/admin-update-form";
import { PaymentBadge, StatusBadge } from "@/components/portal/status-badge";
import { Card } from "@/components/ui/card";
import { getAdminApplicationDetail } from "@/lib/admin-crm";
import { safeCurrency, safeDateTime } from "@/lib/admin-format";
import { resolveApplicationSourceInfo } from "@/lib/applications/source";
import { isFinalApplicationDocument } from "@/lib/applications/document-visibility";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { DprApplicationDetails } from "@/components/services/dpr/dpr-application-details";
import { ItrApplicationDetails } from "@/components/services/itr/itr-application-details";

export const dynamic = "force-dynamic";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function DetailRow({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-0.5 break-words text-sm font-semibold text-slate-950 ${mono ? "font-mono" : ""}`}>{value || "—"}</p>
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
  const result = await getAdminApplicationDetail(id);

  if (!result.ok) {
    if (result.reason === "not_found") notFound();
    if (result.reason === "forbidden") redirect("/dashboard");

    console.error("[admin-application-detail] load_failed", {
      applicationId: id,
      reason: result.reason,
      code: "code" in result ? result.code : undefined,
    });

    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <Card className="rounded-xl border border-amber-200 bg-amber-50 p-6 shadow-none">
          <h1 className="text-lg font-bold text-amber-950">Application could not be loaded</h1>
          <p className="mt-2 text-sm text-amber-900">
            {result.message || "Application could not be loaded. Please retry."}
          </p>
          <Link
            href="/admin/applications"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:text-blue-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to applications
          </Link>
        </Card>
      </div>
    );
  }

  const detail = result.detail;
  const { application, payment, invoice, customer, documents, invoices, payments, notes, statusLogs, agents, facts, partner, whatsappMessages = [], whatsappLogsAvailable } = detail;
  const formData = asRecord(application.form_data);
  const customerMobile = customer.mobile;
  const sourceInfo = resolveApplicationSourceInfo(application);
  const finalDocuments = documents.filter((document) => isFinalApplicationDocument(document));
  const customerDocuments = documents.filter((document) => !isFinalApplicationDocument(document));
  const missingDocuments = customerDocuments.some((document) =>
    ["rejected", "reupload_required", "pending"].includes(
      String(document.review_status ?? document.status ?? "").toLowerCase(),
    ),
  ) || String(application.status).includes("document");
  const paymentProofUrl = payment?.screenshot_url || application.payment_screenshot_url || "";
  const hasFinalDocument = Boolean(finalDocuments.length || application.final_document_path || application.completed_document_storage_path || application.final_document_id);
  const paymentStatus = application.payment_status ?? payment?.status ?? "pending";
  const assignedLabel =
    agents.find((agent) => agent.id === (application.assigned_agent_id ?? application.agent_id))?.full_name ||
    application.assigned_to ||
    "Unassigned";

  const overviewContent = (
    <>
      <Card className="rounded-xl border border-slate-200 p-4 shadow-none">
        <h2 className="text-sm font-bold text-slate-950">Customer</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <DetailRow label="Name" value={customer.name || text(formData.name)} />
          <DetailRow label="Mobile" value={customerMobile || text(formData.mobile)} mono />
          <DetailRow label="Email" value={customer.email || text(formData.email)} />
          <DetailRow label="Address" value={customer.address || text(formData.address)} />
          <DetailRow label="City" value={customer.city || text(formData.city)} />
          <DetailRow label="State / PIN" value={[customer.state || text(formData.state), customer.pincode || text(formData.pincode)].filter(Boolean).join(" / ")} />
        </div>
      </Card>

      {sourceInfo.origin === "agency_partner" ? (
        <Card className="rounded-xl border border-violet-100 bg-violet-50/40 p-4 shadow-none">
          <h2 className="text-sm font-bold text-violet-950">Digi Partner</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <DetailRow label="Partner Name" value={partner?.full_name || "—"} />
            <DetailRow label="Partner ID" value={partner?.partner_code || application.agency_partner_id} mono />
            <DetailRow label="Partner Type" value={partner?.partner_type?.replace(/_/g, " ")} />
            <DetailRow label="Partner Mobile" value={partner?.mobile} mono />
            <DetailRow label="Customer" value={customer.name || text(formData.name)} />
            <DetailRow label="Customer Mobile" value={customerMobile || text(formData.mobile)} mono />
            <DetailRow label="Commission" value={application.commissions?.[0]?.status || "—"} />
            <DetailRow label="Partner Payout" value={safeCurrency(application.commissions?.[0]?.amount ?? application.commission_amount)} />
          </div>
        </Card>
      ) : null}

      <Card className="rounded-xl border border-slate-200 p-4 shadow-none">
        <h2 className="text-sm font-bold text-slate-950">Application</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <DetailRow label="Service" value={application.service_name} />
          <DetailRow label="Application ID" value={application.application_code || application.id} mono />
          <DetailRow label="Source" value={sourceInfo.label} />
          <DetailRow label="Submitted" value={facts.submittedAt !== "-" ? facts.submittedAt : facts.createdAt} mono />
          <DetailRow label="Payment Method" value={payment?.payment_method || application.source || "—"} />
          <DetailRow label="Assigned To" value={assignedLabel} />
          <DetailRow label="Status" value={String(application.status).replace(/_/g, " ")} />
          <DetailRow label="Priority" value={application.priority || "normal"} />
          <DetailRow label="Due" value={application.due_at ? safeDateTime(application.due_at) : "—"} mono />
        </div>
      </Card>

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

      <Card className="rounded-xl border border-slate-200 p-4 shadow-none">
        <h2 className="text-sm font-bold text-slate-950">Submitted fields</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {Object.entries(formData)
            .filter(([key, value]) => !hiddenFormKeys.has(key) && text(value) && key !== "dpr" && key !== "details")
            .map(([key, value]) => (
              <DetailRow key={key} label={labelFromKey(key)} value={text(value)} />
            ))}
        </div>
      </Card>
    </>
  );

  const documentsContent = (
    <Card className="rounded-xl border border-slate-200 p-4 shadow-none">
      <h2 className="text-sm font-bold text-slate-950">Customer documents</h2>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {customerDocuments.length ? customerDocuments.map((document) => (
          <div key={document.id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
            <div className="flex items-start gap-2 font-semibold text-slate-950">
              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
              <span className="min-w-0 truncate">{document.document_name || document.document_type || document.file_name}</span>
            </div>
            <p className="mt-1 text-[11px] capitalize text-slate-500">{String(document.document_type ?? "document").replace(/_/g, " ")}</p>
            <p className="mt-1 font-mono text-[11px] text-slate-400">{document.file_name}</p>
            <p className="mt-1 text-[11px] text-slate-500">{safeDateTime(document.uploaded_at ?? document.created_at)}</p>
            <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${
              String(document.review_status ?? document.status).toLowerCase() === "approved"
                ? "bg-emerald-50 text-emerald-700"
                : String(document.review_status ?? document.status).toLowerCase() === "rejected"
                  ? "bg-rose-50 text-rose-700"
                  : "bg-amber-50 text-amber-700"
            }`}>
              {String(document.review_status ?? document.status ?? "pending").replace(/_/g, " ")}
            </span>
            <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-2">
              {document.signed_url || document.file_url ? (
                <a href={document.signed_url || document.file_url} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1 rounded-md bg-blue-600 px-2.5 text-[11px] font-semibold text-white">
                  <Download className="h-3.5 w-3.5" />
                  Open
                </a>
              ) : null}
              {document.source === "application_documents" ? <AdminDocumentReviewActions documentId={document.id} /> : null}
            </div>
          </div>
        )) : <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 md:col-span-2">No customer documents yet.</p>}
      </div>

      <h3 className="mt-5 text-[11px] font-bold uppercase tracking-wide text-slate-400">Final document (WhatsApp only)</h3>
      <div className="mt-2 grid gap-2 md:grid-cols-2">
        {finalDocuments.length ? finalDocuments.map((document) => (
          <div key={document.id} className="rounded-lg border border-emerald-100 bg-emerald-50/40 p-3">
            <p className="text-sm font-semibold text-emerald-950">{document.document_name || document.file_name}</p>
            <p className="mt-1 text-[11px] text-emerald-800">{safeDateTime(document.uploaded_at ?? document.created_at)}</p>
            <p className="mt-1 text-[11px] font-semibold capitalize text-emerald-700">
              Delivery: {document.delivery_status || application.whatsapp_final_delivery_status || "pending"}
            </p>
            <AdminFinalDocumentPreviewButton applicationId={application.id} documentId={document.id} />
          </div>
        )) : application.final_document_path || application.final_document_id ? (
          <div className="rounded-lg border border-emerald-100 bg-emerald-50/40 p-3">
            <p className="text-sm font-semibold text-emerald-950">{application.final_document_name || "Final document"}</p>
            <p className="mt-1 text-[11px] font-semibold capitalize text-emerald-700">
              Delivery: {application.whatsapp_final_delivery_status || "pending"}
            </p>
            <AdminFinalDocumentPreviewButton
              applicationId={application.id}
              documentId={application.final_document_id}
            />
          </div>
        ) : <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 md:col-span-2">No final document yet.</p>}
      </div>
    </Card>
  );

  const activityContent = (
    <>
      <Card className="rounded-xl border border-slate-200 p-4 shadow-none">
        <h2 className="text-sm font-bold text-slate-950">Internal notes</h2>
        <div className="mt-3 space-y-2">
          {notes.length ? notes.map((note: { id: string; note: string; created_at: string }) => (
            <div key={note.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
              <p className="text-sm text-slate-700">{note.note}</p>
              <p className="mt-2 font-mono text-[11px] text-slate-400">{safeDateTime(note.created_at)}</p>
            </div>
          )) : <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">No internal notes.</p>}
        </div>
      </Card>
      <Card className="rounded-xl border border-slate-200 p-4 shadow-none">
        <h2 className="text-sm font-bold text-slate-950">Status timeline</h2>
        <div className="mt-3 space-y-2">
          {statusLogs.length ? statusLogs.map((log: { id: string; old_status: string | null; new_status: string; note: string | null; created_at: string }) => (
            <div key={log.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
              <p className="text-sm font-semibold text-slate-950">
                <span className="capitalize text-slate-500">{String(log.old_status ?? "new").replace(/_/g, " ")}</span>
                <span className="mx-2 text-slate-400">→</span>
                <span className="capitalize">{String(log.new_status).replace(/_/g, " ")}</span>
              </p>
              {log.note ? <p className="mt-1 text-sm text-slate-600">{log.note}</p> : null}
              <p className="mt-2 font-mono text-[11px] text-slate-400">{safeDateTime(log.created_at)}</p>
            </div>
          )) : <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">No status logs.</p>}
        </div>
      </Card>
    </>
  );

  const paymentContent = (
    <>
      <Card className="rounded-xl border border-slate-200 p-4 shadow-none">
        <h2 className="text-sm font-bold text-slate-950">Payment</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <DetailRow label="Payment Status" value={paymentStatus} />
          <DetailRow label="Service Amount" value={safeCurrency(facts.totalAmount)} />
          <DetailRow label="Net Received" value={safeCurrency(facts.verifiedPaidAmount || application.fresh_payable_amount || application.real_payment_amount)} />
          <DetailRow label="Wallet Used" value={safeCurrency(facts.walletRedeemed)} />
          <DetailRow label="Cashback Eligible" value={safeCurrency(facts.cashbackEligible)} />
          <DetailRow label="Razorpay Order" value={application.razorpay_order_id ?? payment?.razorpay_order_id} mono />
          <DetailRow label="Razorpay Payment" value={application.razorpay_payment_id ?? payment?.razorpay_payment_id} mono />
        </div>
        {paymentProofUrl ? (
          <a href={paymentProofUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-900">
            <Download className="h-3.5 w-3.5" />
            Payment proof
          </a>
        ) : null}
      </Card>
      <Card className="rounded-xl border border-slate-200 p-4 shadow-none">
        <h2 className="text-sm font-bold text-slate-950">Invoice</h2>
        <div className="mt-3">
          {invoice ? (
            <div className="flex flex-col gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-slate-950">{invoice.invoice_number}</p>
                <p className="mt-0.5 text-xs font-medium text-slate-600">{safeCurrency(invoice.amount)} · <span className="capitalize">{invoice.payment_status}</span></p>
              </div>
              <Link href={`/invoice/${invoice.id}`} className="inline-flex h-9 items-center gap-2 rounded-md bg-blue-600 px-3 text-xs font-semibold text-white">
                <ReceiptText className="h-3.5 w-3.5" />
                Open Invoice
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">No invoice yet.</p>
              <GenerateInvoiceButton applicationId={application.id} />
            </div>
          )}
          <p className="mt-2 text-[11px] font-medium text-slate-500">{invoices.length} invoice(s) · {payments.length} payment(s)</p>
        </div>
      </Card>
    </>
  );

  const communicationContent = (
    <Card className="rounded-xl border border-slate-200 p-4 shadow-none">
      <h2 className="text-sm font-bold text-slate-950">Communication</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <DetailRow label="Customer message" value={application.customer_message || application.customer_note || "—"} />
        <DetailRow label="WhatsApp final delivery" value={application.whatsapp_final_delivery_status || "—"} />
        <DetailRow label="Delivered at" value={application.whatsapp_final_delivered_at ? safeDateTime(application.whatsapp_final_delivered_at) : "—"} mono />
        <DetailRow label="Customer mobile" value={customerMobile || "—"} mono />
      </div>
      <div className="mt-4 space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">WhatsApp log</h3>
        {!whatsappLogsAvailable ? (
          <p className="rounded-lg border border-dashed border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Database upgrade required for WhatsApp delivery logs. Existing application actions still work.
          </p>
        ) : whatsappMessages.length ? (
          whatsappMessages.map((row: {
            id: string;
            event_type: string;
            status: string;
            attempt_count?: number | null;
            error_message?: string | null;
            created_at: string;
          }) => (
            <div key={row.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
              <p className="text-sm font-semibold text-slate-950">
                <span className="capitalize">{String(row.event_type).replace(/_/g, " ")}</span>
                <span className="mx-2 text-slate-300">·</span>
                <span className="capitalize text-slate-600">{String(row.status)}</span>
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                Attempts: {row.attempt_count ?? 0}
                {row.error_message ? ` · ${row.error_message}` : ""}
              </p>
              <p className="mt-1 font-mono text-[11px] text-slate-400">{safeDateTime(row.created_at)}</p>
            </div>
          ))
        ) : (
          <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
            No WhatsApp delivery logs yet.
          </p>
        )}
      </div>
    </Card>
  );

  return (
    <div className="mx-auto max-w-7xl pb-24 lg:pb-6">
      <Link href="/admin/applications" className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900">
        <ArrowLeft className="h-3.5 w-3.5" />
        Applications
      </Link>

      <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-4">
          <Card className="rounded-xl border border-slate-200 p-4 shadow-none">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <h1 className="truncate text-xl font-bold text-slate-950 md:text-2xl">{application.service_name}</h1>
                <p className="mt-1 truncate text-sm font-semibold text-slate-700">{customer.name || text(formData.name) || "Customer"}</p>
                <p className="mt-0.5 font-mono text-[11px] text-slate-500">{application.application_code || application.id}</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${sourceInfo.badgeClass}`}>
                  {sourceInfo.label}
                </span>
                <StatusBadge status={application.status} />
                <PaymentBadge status={paymentStatus} />
              </div>
            </div>
            <div className="mt-3 grid gap-2 rounded-lg border border-slate-100 bg-slate-50 p-3 sm:grid-cols-2 lg:grid-cols-4">
              <DetailRow label="Amount" value={safeCurrency(facts.totalAmount)} />
              <DetailRow label="Created" value={facts.createdAt} mono />
              <DetailRow label="Assigned" value={assignedLabel} />
              <DetailRow label="WhatsApp doc" value={application.whatsapp_final_delivery_status || "—"} />
            </div>
          </Card>

          <AdminApplicationTabs
            overviewContent={overviewContent}
            documentsContent={documentsContent}
            activityContent={activityContent}
            paymentContent={paymentContent}
            communicationContent={communicationContent}
            documentCount={customerDocuments.length}
            activityCount={notes.length + statusLogs.length}
          />
        </div>

        <aside className="space-y-3 lg:sticky lg:top-4 lg:self-start">
          <Card className="rounded-xl border border-slate-200 p-4 shadow-none">
            <h2 className="text-sm font-bold text-slate-950">Actions</h2>
            <div className="mt-3">
              <AdminUpdateForm
                applicationId={application.id}
                currentStatus={application.status}
                currentPaymentStatus={paymentStatus}
                customerMobile={customerMobile}
                customerName={customer.name}
                serviceName={application.service_name}
                invoiceHref={invoice ? `/invoice/${invoice.id}` : null}
                agentOptions={agents}
                assignedAgentId={application.assigned_agent_id ?? application.agent_id}
                hasFinalDocument={hasFinalDocument}
                missingDocuments={Boolean(missingDocuments)}
                whatsappFinalDeliveryStatus={application.whatsapp_final_delivery_status}
              />
            </div>
            {paymentStatus === "pending" ? (
              <div className="mt-3 border-t border-slate-100 pt-3">
                <GeneratePaymentLink
                  applicationId={application.id}
                  payableAmount={application.fresh_payable_amount ?? application.amount}
                  customerMobile={customerMobile || text(formData.mobile)}
                  customerName={customer.name || text(formData.name)}
                  serviceName={application.service_name}
                />
              </div>
            ) : null}
            {!invoice ? <div className="mt-3"><GenerateInvoiceButton applicationId={application.id} /></div> : null}
          </Card>
        </aside>
      </div>
    </div>
  );
}
