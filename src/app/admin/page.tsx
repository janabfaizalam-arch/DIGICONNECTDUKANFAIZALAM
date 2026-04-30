import { redirect } from "next/navigation";

import { AdminApplications } from "@/components/portal/admin-applications";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { getCustomerMobile, getCustomerName, hydrateApplications } from "@/lib/crm";
import type { AdminApplicationRow, Application, Lead, PortalUser } from "@/lib/portal-types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

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

function applicationToAdminRow(application: Application, agentsById: Record<string, PortalUser>): AdminApplicationRow {
  const payment = application.payments?.[0];
  const invoice = application.invoices?.[0];
  const commission = application.commissions?.[0];
  const agentId = application.assigned_agent_id ?? application.created_by ?? null;
  const agent = agentId ? agentsById[agentId] : null;

  return {
    id: `application-${application.id}`,
    source: "application",
    application_id: application.id,
    customer_name: getCustomerName(application),
    mobile: getCustomerMobile(application),
    service: application.service_name,
    message: String(application.form_data && typeof application.form_data === "object" ? (application.form_data as Record<string, unknown>).message ?? "" : ""),
    uploaded_files:
      application.documents?.map((document) => ({
        id: document.id,
        file_name: document.file_name,
        file_url: document.file_url,
        file_type: document.file_type,
        storage_path: document.storage_path ?? null,
        document_type: document.document_type,
      })) ?? [],
    payment_status: application.payment_status ?? payment?.status ?? null,
    invoice_status: invoice?.payment_status ?? null,
    application_status: application.status,
    agent_id: agentId,
    agent_name: agent?.full_name || agent?.email || null,
    payment_proof_url: application.payment_screenshot_url ?? payment?.screenshot_url ?? null,
    commission_amount: commission?.amount ?? application.commission_amount ?? null,
    commission_status: commission?.status ?? null,
    created_at: application.created_at,
  };
}

export default async function AdminPage() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) {
    redirect("/login");
  }

  if (!isAdminRole(role)) {
    redirect("/dashboard");
  }

  const supabase = getSupabaseAdmin();
  let rows: AdminApplicationRow[] = [];
  let agents: PortalUser[] = [];

  if (supabase) {
    const [{ data: applicationData }, { data: leadData }, { data: agentData }] = await Promise.all([
      supabase.from("applications").select("*").order("created_at", { ascending: false }),
      supabase
        .from("leads")
        .select("id, name, mobile, service, message, status, file_name, file_url, file_type, storage_path, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url, role, mobile, commission_rate, active")
        .in("role", ["agent", "admin", "super_admin"]),
    ]);

    agents = (agentData ?? []) as PortalUser[];
    const agentsById = agents.reduce<Record<string, PortalUser>>((grouped, agent) => {
      grouped[agent.id] = agent;
      return grouped;
    }, {});
    const applications = (await hydrateApplications((applicationData ?? []) as Application[])) as Application[];

    rows = [
      ...applications.map((application) => applicationToAdminRow(application, agentsById)),
      ...((leadData ?? []) as Lead[]).map(leadToAdminRow),
    ].sort((first, second) => new Date(second.created_at).getTime() - new Date(first.created_at).getTime());
  }

  return <AdminApplications rows={rows} agents={agents} />;
}
