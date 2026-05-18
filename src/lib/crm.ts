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

function groupInvoicesByApplication(applications: Application[], invoices: Invoice[]) {
  const applicationByInvoiceId = new Map(applications.filter((application) => application.invoice_id).map((application) => [String(application.invoice_id), application.id]));
  const applicationIds = new Set(applications.map((application) => application.id));

  return invoices.reduce<Record<string, Invoice[]>>((grouped, invoice) => {
    const candidates = [
      invoice.application_id,
      invoice.application_short_id,
      applicationByInvoiceId.get(invoice.id),
    ].filter(Boolean) as string[];
    const applicationId = candidates.find((candidate) => applicationIds.has(candidate)) ?? candidates.find((candidate) => applicationIds.has(String(candidate)));
    if (!applicationId) return grouped;
    grouped[applicationId] = [...(grouped[applicationId] ?? []), invoice];
    return grouped;
  }, {});
}

export async function fetchInvoicesForApplications(applications: Application[]) {
  const supabase = getSupabaseAdmin();

  if (!supabase || applications.length === 0) {
    return [] as Invoice[];
  }

  const applicationIds = applications.map((application) => application.id);
  const invoiceIds = applications.map((application) => application.invoice_id).filter(Boolean) as string[];
  const shortIds = applicationIds.map((id) => id.slice(0, 8));
  const baseSelect = "id, application_id, user_id, customer_id, invoice_number, customer_name, customer_email, customer_mobile, service_name, amount, wallet_used_amount, real_payment_amount, payment_status, created_at";
  const fullSelect = `${baseSelect}, application_short_id`;
  const filters = [`application_id.in.(${applicationIds.join(",")})`];
  if (invoiceIds.length) filters.push(`id.in.(${invoiceIds.join(",")})`);
  if (shortIds.length) filters.push(`application_short_id.in.(${shortIds.join(",")})`);

  const fullResult = await supabase
    .from("invoices")
    .select(fullSelect)
    .or(filters.join(","));

  if (!fullResult.error) {
    return (fullResult.data ?? []) as Invoice[];
  }

  const fallbackFilters = [`application_id.in.(${applicationIds.join(",")})`];
  if (invoiceIds.length) fallbackFilters.push(`id.in.(${invoiceIds.join(",")})`);
  const fallbackResult = await supabase
    .from("invoices")
    .select(baseSelect)
    .or(fallbackFilters.join(","));

  return (fallbackResult.data ?? []) as Invoice[];
}

export async function resolveDocumentUrls(documents: ApplicationDocument[]) {
  const supabase = getSupabaseAdmin();

  if (!supabase || !documents.length) {
    return documents;
  }

  return Promise.all(
    documents.map(async (document) => {
      if (!document.storage_path) {
        return document;
      }

      try {
        const bucket = document.storage_path.startsWith("applications/") || document.storage_path.startsWith("final-documents/")
          ? "documents"
          : "application-documents";
        const { data, error } = await supabase.storage.from(bucket).createSignedUrl(document.storage_path, 60 * 60);
        if (!error && data?.signedUrl) {
          return { ...document, file_url: data.signedUrl };
        }
        const fallback = await supabase.storage.from(bucket === "documents" ? "application-documents" : "documents").createSignedUrl(document.storage_path, 60 * 60);
        if (!fallback.error && fallback.data?.signedUrl) {
          return { ...document, file_url: fallback.data.signedUrl };
        }
      } catch {
        // Fall back to the stored URL below.
      }

      if (document.file_url) {
        return document;
      }

      return document;
    }),
  );
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
    .eq("role", "agent")
    .eq("active", true)
    .eq("kyc_status", "approved")
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
    await supabase.from("applications").update({ invoice_id: existing.id, updated_at: new Date().toISOString() }).eq("id", applicationId);
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

  if (data?.id) {
    await supabase.from("applications").update({ invoice_id: data.id, updated_at: new Date().toISOString() }).eq("id", applicationId);
  }

  return data as Invoice | null;
}

export async function hydrateApplications(applications: Application[]) {
  const supabase = getSupabaseAdmin();

  if (!supabase || applications.length === 0) {
    return applications;
  }

  const applicationIds = applications.map((application) => application.id);
  const customerIds = applications.map((application) => application.customer_id).filter(Boolean) as string[];
  const [documentsResult, paymentsResult, invoices, commissionsResult, customersResult] = await Promise.all([
    supabase
      .from("application_documents")
      .select("id, application_id, user_id, customer_id, document_type, document_name, file_name, file_url, file_type, storage_path, status, review_status, rejection_reason, reviewed_by, reviewed_at, uploaded_by, uploaded_by_role, is_final, metadata, uploaded_at, created_at")
      .in("application_id", applicationIds),
    supabase
      .from("payments")
      .select("id, application_id, amount, wallet_used_amount, real_payment_amount, status, screenshot_url, storage_path, razorpay_order_id, razorpay_payment_id, razorpay_status, payment_method, paid_at, created_at")
      .in("application_id", applicationIds),
    fetchInvoicesForApplications(applications),
    supabase.from("commissions").select("*").in("application_id", applicationIds),
    customerIds.length
      ? supabase.from("customers").select("*").in("id", customerIds)
      : Promise.resolve({ data: [] }),
  ]);

  const resolvedDocuments = await resolveDocumentUrls((documentsResult.data ?? []) as ApplicationDocument[]);
  const documentsByApplicationId = groupByApplicationId(resolvedDocuments);
  const paymentsByApplicationId = groupByApplicationId((paymentsResult.data ?? []) as Payment[]);
  const invoicesByApplicationId = groupInvoicesByApplication(applications, invoices);
  const commissionsByApplicationId = groupByApplicationId((commissionsResult.data ?? []) as Commission[]);
  const customersById = ((customersResult.data ?? []) as Customer[]).reduce<Record<string, Customer>>((grouped, customer) => {
    grouped[customer.id] = customer;
    return grouped;
  }, {});

  return applications.map((application) => {
    const documents = documentsByApplicationId[application.id] ?? [];
    const finalDocument = documents.find((document) => document.is_final || document.document_type === "final_document");

    return {
      ...application,
      final_document_url: application.final_document_url || finalDocument?.file_url || null,
      final_document_name: application.final_document_name || finalDocument?.file_name || null,
      customers: application.customer_id ? customersById[application.customer_id] ?? null : null,
      documents,
      payments: paymentsByApplicationId[application.id] ?? [],
      invoices: invoicesByApplicationId[application.id] ?? [],
      commissions: commissionsByApplicationId[application.id] ?? [],
    };
  });
}
