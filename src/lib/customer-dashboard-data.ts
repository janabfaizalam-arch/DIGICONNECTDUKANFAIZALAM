import type { Application, ApplicationDocument, Invoice, NotificationItem, Payment, Rating } from "@/lib/portal-types";
import { resolveDocumentUrls } from "@/lib/crm";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getWalletSnapshot } from "@/lib/wallet";

function groupByApplicationId<T extends { application_id: string }>(items: T[] = []) {
  return items.reduce<Record<string, T[]>>((grouped, item) => {
    grouped[item.application_id] = [...(grouped[item.application_id] ?? []), item];
    return grouped;
  }, {});
}

function groupInvoicesByApplication(applications: Application[], invoices: Invoice[]) {
  const applicationIds = new Set(applications.map((application) => application.id));
  const applicationByInvoiceId = new Map(applications.filter((application) => application.invoice_id).map((application) => [String(application.invoice_id), application.id]));

  return invoices.reduce<Record<string, Invoice[]>>((grouped, invoice) => {
    const candidates = [invoice.application_id, invoice.application_short_id, applicationByInvoiceId.get(invoice.id)].filter(Boolean) as string[];
    const applicationId = candidates.find((candidate) => applicationIds.has(candidate));
    if (!applicationId) return grouped;
    grouped[applicationId] = [...(grouped[applicationId] ?? []), invoice];
    return grouped;
  }, {});
}

export async function getCustomerDashboardData(userId: string) {
  const supabase = await getSupabaseServerClient();
  let applications: Application[] = [];
  let notifications: NotificationItem[] = [];
  const walletSnapshot = await getWalletSnapshot(userId, 12);

  if (!supabase) {
    return { applications, notifications, walletSnapshot };
  }

  const [{ data: applicationData }, { data: notificationData }] = await Promise.all([
    supabase
      .from("applications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const baseApplications = (applicationData ?? []) as Application[];
  const applicationIds = baseApplications.map((application) => application.id);
  notifications = (notificationData ?? []) as NotificationItem[];

  if (applicationIds.length === 0) {
    return { applications: baseApplications, notifications, walletSnapshot };
  }

  const invoiceIds = baseApplications.map((application) => application.invoice_id).filter(Boolean) as string[];
  const shortIds = applicationIds.map((id) => id.slice(0, 8));
  const invoiceBaseSelect = "id, application_id, invoice_number, customer_name, customer_email, service_name, amount, wallet_used_amount, real_payment_amount, payment_status, created_at";
  const invoiceFilters = [`application_id.in.(${applicationIds.join(",")})`];
  if (invoiceIds.length) invoiceFilters.push(`id.in.(${invoiceIds.join(",")})`);
  if (shortIds.length) invoiceFilters.push(`application_short_id.in.(${shortIds.join(",")})`);

  const [documentsResult, paymentsResult, invoicesResult, ratingsResult] = await Promise.all([
    supabase
      .from("application_documents")
      .select("id, application_id, customer_id, document_type, document_name, file_name, file_url, file_type, storage_path, status, review_status, rejection_reason, reviewed_by, reviewed_at, metadata, uploaded_at, created_at")
      .in("application_id", applicationIds),
    supabase
      .from("payments")
      .select("id, application_id, amount, wallet_used_amount, real_payment_amount, status, screenshot_url, storage_path, razorpay_order_id, razorpay_payment_id, razorpay_status, payment_method, paid_at, created_at")
      .in("application_id", applicationIds),
    supabase
      .from("invoices")
      .select(`${invoiceBaseSelect}, application_short_id`)
      .or(invoiceFilters.join(",")),
    supabase.from("ratings").select("id, application_id, user_id, rating, feedback, created_at").in("application_id", applicationIds),
  ]);

  const documentsByApplicationId = groupByApplicationId(await resolveDocumentUrls((documentsResult.data ?? []) as ApplicationDocument[]));
  const paymentsByApplicationId = groupByApplicationId((paymentsResult.data ?? []) as Payment[]);
  let invoiceRows = (invoicesResult.data ?? []) as Invoice[];
  if (invoicesResult.error) {
    const fallbackFilters = [`application_id.in.(${applicationIds.join(",")})`];
    if (invoiceIds.length) fallbackFilters.push(`id.in.(${invoiceIds.join(",")})`);
    const { data } = await supabase.from("invoices").select(invoiceBaseSelect).or(fallbackFilters.join(","));
    invoiceRows = (data ?? []) as Invoice[];
  }
  const invoicesByApplicationId = groupInvoicesByApplication(baseApplications, invoiceRows);
  const ratingsByApplicationId = groupByApplicationId((ratingsResult.data ?? []) as Rating[]);

  applications = baseApplications.map((application) => ({
    ...application,
    final_document_url: application.final_document_url || documentsByApplicationId[application.id]?.find((document) => document.is_final || document.document_type === "final_document")?.file_url || null,
    documents: documentsByApplicationId[application.id] ?? [],
    payments: paymentsByApplicationId[application.id] ?? [],
    invoices: invoicesByApplicationId[application.id] ?? [],
    ratings: ratingsByApplicationId[application.id] ?? [],
  }));

  return { applications, notifications, walletSnapshot };
}
