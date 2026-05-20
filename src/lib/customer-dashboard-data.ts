import type { Application, ApplicationDocument, Invoice, NotificationItem, Payment, Rating } from "@/lib/portal-types";
import { resolveDocumentUrls } from "@/lib/crm";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getWalletSnapshot, type WalletSnapshot } from "@/lib/wallet";

const emptyWalletSnapshot: WalletSnapshot = {
  wallet: null,
  transactions: [],
  cashbackEarned: 0,
  cashbackUsed: 0,
  expiringSoonAmount: 0,
  referralSummary: null,
};

function logDashboardApplicationError(step: string, userId: string, error: unknown) {
  const supabaseError = error as { message?: string; code?: string; details?: string; hint?: string } | null;
  console.error("CUSTOMER_DASHBOARD_APPLICATIONS_FETCH_FAILED", {
    step,
    userId,
    errorMessage: error instanceof Error ? error.message : supabaseError?.message ?? String(error),
    errorCode: supabaseError?.code ?? null,
    errorDetails: supabaseError?.details ?? null,
    errorHint: supabaseError?.hint ?? null,
  });
}

async function safeWalletSnapshot(userId: string) {
  try {
    return await getWalletSnapshot(userId, 12);
  } catch (error) {
    console.error("CUSTOMER_DASHBOARD_LOAD_FAILED", {
      step: "wallet_snapshot",
      userId,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return emptyWalletSnapshot;
  }
}

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
  const walletSnapshot = await safeWalletSnapshot(userId);

  if (!supabase) {
    return { applications, notifications, walletSnapshot };
  }

  const [applicationsResult, notificationsResult] = await Promise.allSettled([
    supabase.from("applications").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
  ]);

  if (applicationsResult.status === "rejected") {
    logDashboardApplicationError("applications_query_rejected", userId, applicationsResult.reason);
  }

  if (notificationsResult.status === "rejected") {
    console.error("CUSTOMER_DASHBOARD_LOAD_FAILED", {
      step: "notifications_query_rejected",
      userId,
      errorMessage: notificationsResult.reason instanceof Error ? notificationsResult.reason.message : String(notificationsResult.reason),
    });
  }

  const applicationData = applicationsResult.status === "fulfilled" && !applicationsResult.value.error
    ? applicationsResult.value.data
    : [];
  const notificationData = notificationsResult.status === "fulfilled" && !notificationsResult.value.error
    ? notificationsResult.value.data
    : [];

  if (applicationsResult.status === "fulfilled" && applicationsResult.value.error) {
    logDashboardApplicationError("applications_query", userId, applicationsResult.value.error);
  }

  if (notificationsResult.status === "fulfilled" && notificationsResult.value.error) {
    console.error("CUSTOMER_DASHBOARD_LOAD_FAILED", {
      step: "notifications_query",
      userId,
      errorMessage: notificationsResult.value.error.message,
      errorCode: notificationsResult.value.error.code,
    });
  }

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

  const [documentsResult, paymentsResult, invoicesResult, ratingsResult] = await Promise.allSettled([
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

  const documentRows =
    documentsResult.status === "fulfilled" && !documentsResult.value.error
      ? ((documentsResult.value.data ?? []) as ApplicationDocument[])
      : [];
  const paymentRows =
    paymentsResult.status === "fulfilled" && !paymentsResult.value.error
      ? ((paymentsResult.value.data ?? []) as Payment[])
      : [];
  let invoiceRows =
    invoicesResult.status === "fulfilled" && !invoicesResult.value.error
      ? ((invoicesResult.value.data ?? []) as Invoice[])
      : [];
  const ratingRows =
    ratingsResult.status === "fulfilled" && !ratingsResult.value.error
      ? ((ratingsResult.value.data ?? []) as Rating[])
      : [];

  if (documentsResult.status === "rejected") logDashboardApplicationError("documents_query_rejected", userId, documentsResult.reason);
  if (paymentsResult.status === "rejected") logDashboardApplicationError("payments_query_rejected", userId, paymentsResult.reason);
  if (invoicesResult.status === "rejected") logDashboardApplicationError("invoices_query_rejected", userId, invoicesResult.reason);
  if (ratingsResult.status === "rejected") logDashboardApplicationError("ratings_query_rejected", userId, ratingsResult.reason);

  if (documentsResult.status === "fulfilled" && documentsResult.value.error) logDashboardApplicationError("documents_query", userId, documentsResult.value.error);
  if (paymentsResult.status === "fulfilled" && paymentsResult.value.error) logDashboardApplicationError("payments_query", userId, paymentsResult.value.error);
  if (invoicesResult.status === "fulfilled" && invoicesResult.value.error) logDashboardApplicationError("invoices_query", userId, invoicesResult.value.error);
  if (ratingsResult.status === "fulfilled" && ratingsResult.value.error) logDashboardApplicationError("ratings_query", userId, ratingsResult.value.error);

  const resolvedDocuments = await resolveDocumentUrls(documentRows).catch((error) => {
    logDashboardApplicationError("resolve_document_urls", userId, error);
    return documentRows;
  });

  const documentsByApplicationId = groupByApplicationId(resolvedDocuments);
  const paymentsByApplicationId = groupByApplicationId(paymentRows);

  if (invoicesResult.status !== "fulfilled" || invoicesResult.value.error) {
    const fallbackFilters = [`application_id.in.(${applicationIds.join(",")})`];
    if (invoiceIds.length) fallbackFilters.push(`id.in.(${invoiceIds.join(",")})`);
    const { data, error } = await supabase.from("invoices").select(invoiceBaseSelect).or(fallbackFilters.join(","));
    if (error) {
      logDashboardApplicationError("invoices_fallback_query", userId, error);
    } else {
      invoiceRows = (data ?? []) as Invoice[];
    }
  }
  const invoicesByApplicationId = groupInvoicesByApplication(baseApplications, invoiceRows);
  const ratingsByApplicationId = groupByApplicationId(ratingRows);

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
