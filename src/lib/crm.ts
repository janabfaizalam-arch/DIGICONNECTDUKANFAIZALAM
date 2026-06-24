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
      applicationByInvoiceId.get(invoice.id),
      invoice.invoice_number,
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
  const baseSelect = "id, application_id, user_id, customer_id, invoice_number, customer_name, customer_email, customer_mobile, service_name, amount, wallet_used_amount, real_payment_amount, payment_status, created_at";
  const filters = [`application_id.in.(${applicationIds.join(",")})`];
  if (invoiceIds.length) filters.push(`id.in.(${invoiceIds.join(",")})`);

  const fullResult = await supabase
    .from("invoices")
    .select(baseSelect)
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
        const bucket = document.storage_path.startsWith("applications/") ||
                       document.storage_path.startsWith("application-documents/") ||
                       document.storage_path.startsWith("final-documents/")
          ? "documents"
          : "application-documents";
        const { data, error } = await supabase.storage.from(bucket).createSignedUrl(document.storage_path, 60 * 60);
        if (!error && data?.signedUrl) {
          return { ...document, file_url: data.signedUrl, signed_url: data.signedUrl };
        }
        const fallback = await supabase.storage.from(bucket === "documents" ? "application-documents" : "documents").createSignedUrl(document.storage_path, 60 * 60);
        if (!fallback.error && fallback.data?.signedUrl) {
          return { ...document, file_url: fallback.data.signedUrl, signed_url: fallback.data.signedUrl };
        }
        console.error("[crm] ADMIN_DOC_SIGNED_URL_ERROR", {
          documentId: document.id,
          applicationId: document.application_id,
          storagePath: document.storage_path,
          primaryError: error?.message,
          fallbackError: fallback.error?.message,
        });
      } catch {
        console.error("[crm] ADMIN_DOC_SIGNED_URL_ERROR", {
          documentId: document.id,
          applicationId: document.application_id,
          storagePath: document.storage_path,
        });
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

  const { data: existing, error: existingError } = await supabase
    .from("invoices")
    .select("id, application_id, user_id, customer_id, invoice_number, service_name, amount, payment_status, created_at")
    .eq("application_id", applicationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) {
    console.error("[crm] Invoice lookup failed", {
      applicationId,
      message: existingError.message,
      code: existingError.code,
    });
  }

  if (existing?.id) {
    await supabase.from("applications").update({ invoice_id: existing.id, updated_at: new Date().toISOString() }).eq("id", applicationId);
    return existing as Invoice;
  }

  const { data, error } = await supabase
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
    .select("id, application_id, user_id, customer_id, invoice_number, service_name, amount, payment_status, created_at")
    .single();

  if (error) {
    console.error("[crm] Invoice insert failed", {
      applicationId,
      userId,
      customerId,
      message: error.message,
      code: error.code,
    });
    return null;
  }

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

/**
 * CRM Lead Event Tracker & Lead Scoring client utility
 */
export async function trackCrmEvent(
  event:
    | "page_visit"
    | "calculator_usage"
    | "expert_talk_click"
    | "apply_click"
    | "application_started"
    | "payment_success"
    | "smart_chat_interaction",
  service: "gst-registration" | "gst-return-filing" | "itr-filing" | "food-license" | "food-license-doc-checker",
  customMobile?: string,
  customName?: string
) {
  try {
    let mobile = customMobile || "";
    let name = customName || "";

    // 1. If not provided, try to read from Apply draft local storage
    if (typeof window !== "undefined") {
      const gstDraft = localStorage.getItem("gst_apply_draft");
      const itrDraft = localStorage.getItem("itr_apply_draft");
      const draft = gstDraft || itrDraft;
      if (draft) {
        try {
          const parsed = JSON.parse(draft);
          if (!mobile && parsed.mobile) mobile = parsed.mobile;
          if (!name && parsed.name) name = parsed.name;
        } catch {
          // Ignored
        }
      }

      // 2. Try callback local storage keys
      if (!mobile) mobile = localStorage.getItem("crm_lead_mobile") || "";
      if (!name) name = localStorage.getItem("crm_lead_name") || "";

      // 3. Save contact details if provided this time
      if (customMobile) localStorage.setItem("crm_lead_mobile", customMobile);
      if (customName) localStorage.setItem("crm_lead_name", customName);
    }

    if (!mobile) {
      // Cannot send event if mobile is not collected yet.
      // We will cache events in local storage and batch upload them once contact details are provided.
      interface PendingCrmEvent {
        event: string;
        service: string;
        timestamp: number;
      }
      if (typeof window !== "undefined") {
        const queue: PendingCrmEvent[] = JSON.parse(localStorage.getItem("crm_pending_events") || "[]");
        if (!queue.some((item: PendingCrmEvent) => item.event === event && item.service === service)) {
          queue.push({ event, service, timestamp: Date.now() });
          localStorage.setItem("crm_pending_events", JSON.stringify(queue));
        }
      }
      return;
    }

    // 4. Send background fetch to the CRM API
    const response = await fetch("/api/crm/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mobile, name, service, event }),
    });

    if (response.ok) {
      // If success, clear matched pending events from queue
      if (typeof window !== "undefined") {
        interface PendingCrmEvent {
          event: string;
          service: string;
          timestamp: number;
        }
        const queue: PendingCrmEvent[] = JSON.parse(localStorage.getItem("crm_pending_events") || "[]");
        const remaining = queue.filter((item: PendingCrmEvent) => !(item.service === service));
        localStorage.setItem("crm_pending_events", JSON.stringify(remaining));

        // Flush any other pending events under this mobile
        for (const pending of queue) {
          if (pending.event !== event) {
            await fetch("/api/crm/event", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ mobile, name, service: pending.service, event: pending.event }),
            });
          }
        }
      }
    }
  } catch (err) {
    console.error("CRM Event tracking failed background error", err);
  }
}
