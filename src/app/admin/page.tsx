import { redirect } from "next/navigation";

import { AdminApplications } from "@/components/portal/admin-applications";
import { getCurrentUser, isAdminUser } from "@/lib/auth";
import type { AdminApplicationRow, Application, Lead } from "@/lib/portal-types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function readText(value: unknown) {
  return typeof value === "string" ? value : "";
}

function applicationToAdminRow(application: Application): AdminApplicationRow {
  const payment = application.payments?.[0];
  const invoice = application.invoices?.[0];
  const documents = application.documents ?? [];

  return {
    id: `application-${application.id}`,
    source: "application",
    application_id: application.id,
    customer_name: readText(application.form_data.name) || application.users?.full_name || "Customer",
    mobile: readText(application.form_data.mobile),
    service: application.service_name,
    message: readText(application.form_data.message),
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
      supabase
        .from("applications")
        .select("*, users(*), documents:application_documents(*), payments(*), invoices(*)")
        .order("created_at", { ascending: false }),
      supabase
        .from("leads")
        .select("id, name, mobile, service, message, status, file_name, file_url, file_type, storage_path, created_at")
        .order("created_at", { ascending: false }),
    ]);

    rows = [
      ...((applicationData ?? []) as Application[]).map(applicationToAdminRow),
      ...((leadData ?? []) as Lead[]).map(leadToAdminRow),
    ].sort((first, second) => new Date(second.created_at).getTime() - new Date(first.created_at).getTime());
  }

  return <AdminApplications rows={rows} />;
}
