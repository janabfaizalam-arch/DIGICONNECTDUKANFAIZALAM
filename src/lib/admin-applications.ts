import { getCustomerMobile, getCustomerName, hydrateApplications } from "@/lib/crm";
import type { AdminApplicationRow, Application, PortalUser } from "@/lib/portal-types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

function applicationToAdminRow(application: Application, agentsById: Record<string, PortalUser>, staffById: Record<string, PortalUser>): AdminApplicationRow {
  const payment = application.payments?.[0];
  const invoice = application.invoices?.[0];
  const commission = application.commissions?.[0];
  const agentId = application.assigned_agent_id ?? application.created_by ?? null;
  const agent = agentId ? agentsById[agentId] : null;
  const staff = application.assigned_staff_id ? staffById[application.assigned_staff_id] : null;

  return {
    id: `application-${application.id}`,
    source: "application",
    application_id: application.id,
    customer_name: getCustomerName(application),
    mobile: getCustomerMobile(application),
    service: application.service_name,
    message: "",
    uploaded_files: [],
    payment_status: application.payment_status ?? payment?.status ?? null,
    invoice_status: invoice?.payment_status ?? null,
    application_status: application.status,
    agent_id: agentId,
    agent_name: agent?.full_name || agent?.email || null,
    assigned_staff_id: application.assigned_staff_id ?? null,
    assigned_staff_name: staff?.full_name || staff?.email || null,
    payment_proof_url: application.payment_screenshot_url ?? payment?.screenshot_url ?? null,
    razorpay_order_id: payment?.razorpay_order_id ?? null,
    razorpay_payment_id: payment?.razorpay_payment_id ?? null,
    payment_amount: payment?.amount ?? application.real_payment_amount ?? application.amount ?? null,
    payment_method: payment?.payment_method ?? null,
    paid_at: payment?.paid_at ?? null,
    commission_amount: commission?.amount ?? application.commission_amount ?? null,
    commission_status: commission?.status ?? null,
    created_at: application.created_at,
  };
}

export async function getAdminApplicationRows() {
  const supabase = getSupabaseAdmin();
  let rows: AdminApplicationRow[] = [];
  let agents: PortalUser[] = [];
  let staff: PortalUser[] = [];

  if (!supabase) {
    return { rows, agents, staff };
  }

  const [{ data: applicationData }, { data: agentData }, { data: staffData }] = await Promise.all([
    supabase.from("applications").select("*").order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("id, full_name, email, avatar_url, role, mobile, agent_code, commission_type, commission_value, commission_rate, active, is_active")
      .in("role", ["agent", "admin", "super_admin"]),
    supabase
      .from("profiles")
      .select("id, full_name, email, avatar_url, role, mobile, agent_code, commission_type, commission_value, commission_rate, active, is_active")
      .eq("role", "staff"),
  ]);

  agents = (agentData ?? []) as PortalUser[];
  staff = (staffData ?? []) as PortalUser[];
  const agentsById = agents.reduce<Record<string, PortalUser>>((grouped, agent) => {
    grouped[agent.id] = agent;
    return grouped;
  }, {});
  const staffById = staff.reduce<Record<string, PortalUser>>((grouped, item) => {
    grouped[item.id] = item;
    return grouped;
  }, {});
  const applications = (await hydrateApplications((applicationData ?? []) as Application[])) as Application[];

  rows = applications
    .map((application) => applicationToAdminRow(application, agentsById, staffById))
    .sort((first, second) => Date.parse(second.created_at || "") - Date.parse(first.created_at || ""));

  return { rows, agents, staff };
}
