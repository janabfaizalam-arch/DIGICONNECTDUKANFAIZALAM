import { createInvoiceNumber, portalServices } from "@/lib/portal-data";
import type { Application, ApplicationDocument, Commission, Customer, Invoice, Payment, PortalUser, ServiceCatalogItem } from "@/lib/portal-types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const primaryPhone = "7007595931";

export type ApplicationWithRelations = Application & {
  customers?: Customer | null;
  commissions?: Commission[];
};

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export function textValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

export function cleanFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
}

export function groupByApplicationId<T extends { application_id: string }>(items: T[] = []) {
  return items.reduce<Record<string, T[]>>((grouped, item) => {
    grouped[item.application_id] = [...(grouped[item.application_id] ?? []), item];
    return grouped;
  }, {});
}

export async function getServiceCatalog() {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return portalServices.map((service) => ({
      id: service.slug,
      slug: service.slug,
      name: service.title,
      description: service.description,
      amount: service.amount,
      commission_amount: Math.max(Math.round(service.amount * 0.2), 25),
      commission_rate: null,
      required_documents: service.documents,
      active: true,
    })) satisfies ServiceCatalogItem[];
  }

  const { data } = await supabase
    .from("service_catalog")
    .select("id, slug, name, description, amount, commission_amount, commission_rate, required_documents, active")
    .eq("active", true)
    .order("name", { ascending: true });

  if (data?.length) {
    return data as ServiceCatalogItem[];
  }

  return portalServices.map((service) => ({
    id: service.slug,
    slug: service.slug,
    name: service.title,
    description: service.description,
    amount: service.amount,
    commission_amount: Math.max(Math.round(service.amount * 0.2), 25),
    commission_rate: null,
    required_documents: service.documents,
    active: true,
  })) satisfies ServiceCatalogItem[];
}

export async function getAgents() {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return [] as PortalUser[];
  }

  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url, role, mobile, agent_code, commission_type, commission_value, commission_rate, active, is_active")
    .in("role", ["agent", "admin", "super_admin"])
    .order("full_name", { ascending: true });

  return (data ?? []) as PortalUser[];
}

export function getCustomerName(application: Application) {
  const formData = asRecord(application.form_data);

  return (application.customers?.full_name ?? textValue(formData.name)) || "Customer";
}

export function getCustomerMobile(application: Application) {
  const formData = asRecord(application.form_data);

  return application.customers?.mobile ?? textValue(formData.mobile);
}

export function calculateCommission(service: ServiceCatalogItem, agent?: PortalUser | null) {
  if (agent?.commission_type === "fixed" && typeof agent.commission_value === "number" && agent.commission_value > 0) {
    return agent.commission_value;
  }

  if (agent?.commission_type === "percentage" && typeof agent.commission_value === "number" && agent.commission_value > 0) {
    return Math.round((service.amount * agent.commission_value) / 100);
  }

  if (typeof agent?.commission_rate === "number" && agent.commission_rate > 0) {
    return Math.round((service.amount * agent.commission_rate) / 100);
  }

  if (typeof service.commission_rate === "number" && service.commission_rate > 0) {
    return Math.round((service.amount * service.commission_rate) / 100);
  }

  return service.commission_amount;
}

export async function createInvoiceForApplication({
  applicationId,
  userId,
  customerId,
  customerName,
  customerEmail,
  customerMobile,
  serviceName,
  amount,
  paymentStatus = "pending",
}: {
  applicationId: string;
  userId?: string | null;
  customerId?: string | null;
  customerName: string;
  customerEmail?: string | null;
  customerMobile?: string | null;
  serviceName: string;
  amount: number;
  paymentStatus?: string;
}) {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return null;
  }

  const { data: existing } = await supabase.from("invoices").select("id").eq("application_id", applicationId).maybeSingle();

  if (existing?.id) {
    return existing as Invoice;
  }

  const { data } = await supabase
    .from("invoices")
    .insert({
      application_id: applicationId,
      user_id: userId ?? null,
      customer_id: customerId ?? null,
      invoice_number: createInvoiceNumber(),
      customer_name: customerName,
      customer_email: customerEmail ?? "",
      customer_mobile: customerMobile ?? "",
      service_name: serviceName,
      amount,
      payment_status: paymentStatus,
    })
    .select("id")
    .single();

  return data as Invoice | null;
}

export async function hydrateApplications(applications: Application[]) {
  const supabase = getSupabaseAdmin();

  if (!supabase || applications.length === 0) {
    return applications;
  }

  const applicationIds = applications.map((application) => application.id);
  const customerIds = applications.map((application) => application.customer_id).filter(Boolean) as string[];
  const [documentsResult, paymentsResult, invoicesResult, commissionsResult, customersResult] = await Promise.all([
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
      .select("id, application_id, customer_id, invoice_number, customer_name, customer_email, customer_mobile, service_name, amount, payment_status, created_at")
      .in("application_id", applicationIds),
    supabase.from("commissions").select("*").in("application_id", applicationIds),
    customerIds.length
      ? supabase.from("customers").select("*").in("id", customerIds)
      : Promise.resolve({ data: [] }),
  ]);

  const documentsByApplicationId = groupByApplicationId((documentsResult.data ?? []) as ApplicationDocument[]);
  const paymentsByApplicationId = groupByApplicationId((paymentsResult.data ?? []) as Payment[]);
  const invoicesByApplicationId = groupByApplicationId((invoicesResult.data ?? []) as Invoice[]);
  const commissionsByApplicationId = groupByApplicationId((commissionsResult.data ?? []) as Commission[]);
  const customersById = ((customersResult.data ?? []) as Customer[]).reduce<Record<string, Customer>>((grouped, customer) => {
    grouped[customer.id] = customer;
    return grouped;
  }, {});

  return applications.map((application) => ({
    ...application,
    customers: application.customer_id ? customersById[application.customer_id] ?? null : null,
    documents: documentsByApplicationId[application.id] ?? [],
    payments: paymentsByApplicationId[application.id] ?? [],
    invoices: invoicesByApplicationId[application.id] ?? [],
    commissions: commissionsByApplicationId[application.id] ?? [],
  }));
}
