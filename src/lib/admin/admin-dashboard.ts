import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type AdminDashboardRecentApplication = {
  id: string;
  serviceName: string;
  customerName: string;
  customerMobile: string;
  status: string;
  paymentStatus: string;
  createdAt: string;
};

export type AdminDashboardStats = {
  totalCustomers: number;
  totalApplications: number;
  pendingApplications: number;
  processingApplications: number;
  completedApplications: number;
  rejectedApplications: number;
  todayApplications: number;
  thisMonthApplications: number;
  totalPaidAmount: number;
  pendingPayments: number;
  verifiedPayments: number;
  totalAgents: number;
  activeAgents: number;
  walletTotalBalance: number;
  totalCashbackIssued: number;
  totalRewardsIssued: number;
  unpaidCommissions: number;
  paidCommissions: number;
  missingDocumentApplications: number;
  recentlySubmittedApplications: AdminDashboardRecentApplication[];
};

const EMPTY_STATS: AdminDashboardStats = {
  totalCustomers: 0,
  totalApplications: 0,
  pendingApplications: 0,
  processingApplications: 0,
  completedApplications: 0,
  rejectedApplications: 0,
  todayApplications: 0,
  thisMonthApplications: 0,
  totalPaidAmount: 0,
  pendingPayments: 0,
  verifiedPayments: 0,
  totalAgents: 0,
  activeAgents: 0,
  walletTotalBalance: 0,
  totalCashbackIssued: 0,
  totalRewardsIssued: 0,
  unpaidCommissions: 0,
  paidCommissions: 0,
  missingDocumentApplications: 0,
  recentlySubmittedApplications: [],
};

function startOfTodayIso() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

function startOfMonthIso() {
  const date = new Date();
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

function normalize(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function customerNameFromApplication(row: Record<string, unknown>) {
  const details = typeof row.customer_details === "object" && row.customer_details ? row.customer_details as Record<string, unknown> : {};
  const form = typeof row.form_data === "object" && row.form_data ? row.form_data as Record<string, unknown> : {};
  return String(details.name ?? form.name ?? row.customer_name ?? "Not available").trim() || "Not available";
}

function customerMobileFromApplication(row: Record<string, unknown>) {
  const details = typeof row.customer_details === "object" && row.customer_details ? row.customer_details as Record<string, unknown> : {};
  const form = typeof row.form_data === "object" && row.form_data ? row.form_data as Record<string, unknown> : {};
  const digits = String(details.mobile ?? row.customer_mobile ?? form.mobile ?? "").replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return EMPTY_STATS;

  const todayIso = startOfTodayIso();
  const monthIso = startOfMonthIso();

  // Run optimized database count headers and selective column lookups in parallel
  const [
    profilesCount,
    customersCount,
    customerProfilesCount,
    totalAppsCount,
    pendingAppsCount,
    processingAppsCount,
    completedAppsCount,
    rejectedAppsCount,
    todayAppsCount,
    monthAppsCount,
    verifiedPaymentsCount,
    pendingPaymentsCount,
    agentsCount,
    activeAgentsCount,

    // selective data queries (minimizing columns/row payload size)
    paymentsAmountsResult,
    walletsResult,
    walletTransactionsResult,
    commissionsResult,
    documentsResult,
    recentApplicationsResult,
    applicationsIdsResult,
  ] = await Promise.all([
    // Exact count headers (head: true fetches 0 row data bytes)
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "customer"),
    supabase.from("customers").select("id", { count: "exact", head: true }),
    supabase.from("customer_profiles").select("id", { count: "exact", head: true }),
    supabase.from("applications").select("id", { count: "exact", head: true }),
    supabase.from("applications").select("id", { count: "exact", head: true }).in("status", ["pending", "payment_pending", "document_pending", "documents_required", "submitted"]),
    supabase.from("applications").select("id", { count: "exact", head: true }).in("status", ["in_process", "in_progress", "assigned_to_agent"]),
    supabase.from("applications").select("id", { count: "exact", head: true }).eq("status", "completed"),
    supabase.from("applications").select("id", { count: "exact", head: true }).in("status", ["rejected", "cancelled"]),
    supabase.from("applications").select("id", { count: "exact", head: true }).gte("created_at", todayIso),
    supabase.from("applications").select("id", { count: "exact", head: true }).gte("created_at", monthIso),
    supabase.from("payments").select("id", { count: "exact", head: true }).in("status", ["verified", "paid"]),
    supabase.from("payments").select("id", { count: "exact", head: true }).in("status", ["pending", "unpaid"]),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "agent"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "agent").or("active.eq.true,is_active.eq.true"),

    // Sum queries (only query numeric and status columns needed)
    supabase.from("payments").select("real_payment_amount, amount, status").in("status", ["verified", "paid", "pending", "unpaid"]).limit(10000),
    supabase.from("reward_wallets").select("balance").limit(10000),
    supabase.from("wallet_transactions").select("amount, type, direction, status").limit(10000),
    supabase.from("commissions").select("amount, status").limit(10000),
    supabase.from("application_documents").select("application_id").limit(10000),
    supabase.from("applications")
      .select("id, service_name, customer_name, customer_mobile, customer_details, form_data, status, payment_status, created_at")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase.from("applications").select("id").limit(10000),
  ]);

  for (const [label, result] of Object.entries({
    profilesCount,
    customersCount,
    customerProfilesCount,
    totalAppsCount,
    pendingAppsCount,
    processingAppsCount,
    completedAppsCount,
    rejectedAppsCount,
    todayAppsCount,
    monthAppsCount,
    verifiedPaymentsCount,
    pendingPaymentsCount,
    agentsCount,
    activeAgentsCount,
    paymentsAmountsResult,
    walletsResult,
    walletTransactionsResult,
    commissionsResult,
    documentsResult,
    recentApplicationsResult,
    applicationsIdsResult,
  })) {
    if ("error" in result && result.error) {
      console.error(`[admin-dashboard] ${label} failed`, result.error);
    }
  }

  const customerCounts = [profilesCount.count ?? 0, customersCount.count ?? 0, customerProfilesCount.count ?? 0];
  const payments = (paymentsAmountsResult.data ?? []) as Array<{ real_payment_amount?: number; amount?: number; status: string }>;
  const wallets = (walletsResult.data ?? []) as Array<{ balance?: number }>;
  const walletTransactions = (walletTransactionsResult.data ?? []) as Array<{ amount?: number; type: string; direction: string; status: string }>;
  const commissions = (commissionsResult.data ?? []) as Array<{ amount?: number; status: string }>;
  const documentIds = (documentsResult.data ?? []) as Array<{ application_id?: string }>;
  const applicationIds = (applicationsIdsResult.data ?? []) as Array<{ id: string }>;

  const verifiedPayments = payments.filter((payment) => ["verified", "paid"].includes(normalize(payment.status)));
  const creditTransactions = walletTransactions.filter((transaction) => normalize(transaction.direction) === "credit" && normalize(transaction.status) !== "reversed");
  const applicationIdsWithDocs = new Set(documentIds.map((document) => String(document.application_id ?? "")).filter(Boolean));

  return {
    totalCustomers: Math.max(...customerCounts),
    totalApplications: totalAppsCount.count ?? applicationIds.length,
    pendingApplications: pendingAppsCount.count ?? 0,
    processingApplications: processingAppsCount.count ?? 0,
    completedApplications: completedAppsCount.count ?? 0,
    rejectedApplications: rejectedAppsCount.count ?? 0,
    todayApplications: todayAppsCount.count ?? 0,
    thisMonthApplications: monthAppsCount.count ?? 0,
    totalPaidAmount: verifiedPayments.reduce((total, payment) => total + Number(payment.real_payment_amount ?? payment.amount ?? 0), 0),
    pendingPayments: pendingPaymentsCount.count ?? 0,
    verifiedPayments: verifiedPaymentsCount.count ?? 0,
    totalAgents: agentsCount.count ?? 0,
    activeAgents: activeAgentsCount.count ?? 0,
    walletTotalBalance: wallets.reduce((total, wallet) => total + Number(wallet.balance ?? 0), 0),
    totalCashbackIssued: creditTransactions
      .filter((transaction) => ["first_service_cashback", "repeat_cashback"].includes(normalize(transaction.type)))
      .reduce((total, transaction) => total + Number(transaction.amount ?? 0), 0),
    totalRewardsIssued: creditTransactions.reduce((total, transaction) => total + Number(transaction.amount ?? 0), 0),
    unpaidCommissions: commissions.filter((commission) => !["paid", "settled"].includes(normalize(commission.status))).reduce((total, commission) => total + Number(commission.amount ?? 0), 0),
    paidCommissions: commissions.filter((commission) => ["paid", "settled"].includes(normalize(commission.status))).reduce((total, commission) => total + Number(commission.amount ?? 0), 0),
    missingDocumentApplications: applicationIds.filter((app) => !applicationIdsWithDocs.has(app.id)).length,
    recentlySubmittedApplications: ((recentApplicationsResult.data ?? []) as Array<Record<string, unknown>>).map((application) => ({
      id: String(application.id),
      serviceName: String(application.service_name ?? "Not available"),
      customerName: customerNameFromApplication(application),
      customerMobile: customerMobileFromApplication(application),
      status: String(application.status ?? "Not available"),
      paymentStatus: String(application.payment_status ?? "Not available"),
      createdAt: String(application.created_at ?? ""),
    })),
  };
}
