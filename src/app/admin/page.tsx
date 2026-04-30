import { redirect } from "next/navigation";

import { AdminApplications } from "@/components/portal/admin-applications";
import { getCurrentUser, isAdminUser } from "@/lib/auth";
import type { AdminApplicationRow, Application, ApplicationDocument, Invoice, Lead, Payment } from "@/lib/portal-types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function textValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function groupByApplicationId<T extends { application_id: string }>(items: T[] = []) {
  return items.reduce<Record<string, T[]>>((grouped, item) => {
    grouped[item.application_id] = [...(grouped[item.application_id] ?? []), item];
    return grouped;
  }, {});
}

function applicationToAdminRow(
  application: Application,
  documentsByApplicationId: Record<string, ApplicationDocument[]>,
  paymentsByApplicationId: Record<string, Payment[]>,
  invoicesByApplicationId: Record<string, Invoice[]>,
): AdminApplicationRow {
  const formData = asRecord(application.form_data);
  const documents = documentsByApplicationId[application.id] ?? [];
  const payment = paymentsByApplicationId[application.id]?.[0];
  const invoice = invoicesByApplicationId[application.id]?.[0];

  return {
    id: `application-${application.id}`,
    source: "application",
    application_id: application.id,
    customer_name: textValue(formData.name) || "Customer",
    mobile: textValue(formData.mobile),
    service: application.service_name,
    message: textValue(formData.message),
    uploaded_files: documents.map((document) => ({
      id: document.id,
      file_name: document.file_name,
      file_url: document.file_url,
      file_type: document.file_type,
      storage_path: document.storage_path ?? null,
      document_type: document.document_type,
    })),
    payment_status: payment?.status ?? null,
    invoice_status: invoice?.payment_status ?? null,
    application_status: application.status,
    created_at: application.created_at,
  };
}

function leadToAdminRow(lead: Lead): AdminApplicationRow {
  return {
    id: `lead-${lead.id}`,
    source: "lead",
    application_id: null,
    customer_name: lead.name,
    mobile: lead.mobile,
    service: lead.service,
    message: lead.message,
    uploaded_files: lead.file_url
      ? [
          {
            id: lead.id,
            file_name: lead.file_name ?? "Uploaded file",
            file_url: lead.file_url,
            file_type: lead.file_type,
            storage_path: lead.storage_path,
            document_type: "Lead document",
          },
        ]
      : [],
    payment_status: null,
    invoice_status: null,
    application_status: lead.status,
    created_at: lead.created_at,
  };
}

export default async function AdminPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!isAdminUser(user)) {
    redirect("/dashboard");
  }

  const supabase = getSupabaseAdmin();
  let rows: AdminApplicationRow[] = [];

  if (supabase) {
    const [{ data: applicationData }, { data: leadData }] = await Promise.all([
      supabase.from("applications").select("*").order("created_at", { ascending: false }),
      supabase
        .from("leads")
        .select("id, name, mobile, service, message, status, file_name, file_url, file_type, storage_path, created_at")
        .order("created_at", { ascending: false }),
    ]);

    const applications = (applicationData ?? []) as Application[];
    const applicationIds = applications.map((application) => application.id);
    let documents: ApplicationDocument[] = [];
    let payments: Payment[] = [];
    let invoices: Invoice[] = [];

    if (applicationIds.length > 0) {
      const [documentsResult, paymentsResult, invoicesResult] = await Promise.all([
        supabase
          .from("application_documents")
          .select("id, application_id, document_type, file_name, file_url, file_type, storage_path, created_at")
          .in("application_id", applicationIds),
        supabase
          .from("payments")
          .select("id, application_id, amount, status, screenshot_url, storage_path, created_at")
          .in("application_id", applicationIds),
        supabase
          .from("invoices")
          .select("id, application_id, invoice_number, customer_name, customer_email, service_name, amount, payment_status, created_at")
          .in("application_id", applicationIds),
      ]);

      documents = (documentsResult.data ?? []) as ApplicationDocument[];
      payments = (paymentsResult.data ?? []) as Payment[];
      invoices = (invoicesResult.data ?? []) as Invoice[];
    }

    const documentsByApplicationId = groupByApplicationId(documents);
    const paymentsByApplicationId = groupByApplicationId(payments);
    const invoicesByApplicationId = groupByApplicationId(invoices);

    rows = [
      ...applications.map((application) =>
        applicationToAdminRow(application, documentsByApplicationId, paymentsByApplicationId, invoicesByApplicationId),
      ),
      ...((leadData ?? []) as Lead[]).map(leadToAdminRow),
    ].sort((first, second) => new Date(second.created_at).getTime() - new Date(first.created_at).getTime());
  }

  return <AdminApplications rows={rows} />;
}
