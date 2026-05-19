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

function sum(rows: Array<Record<string, unknown>>, key: string) {
  return rows.reduce((total, row) => total + Number(row[key] ?? 0), 0);
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
  const [
    profilesResult,
    customersResult,
    customerProfilesResult,
    applicationsResult,
    paymentsResult,
    agentsResult,
    walletsResult,
    walletTransactionsResult,
    commissionsResult,
    documentsResult,
    recentApplicationsResult,
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "customer"),
    supabase.from("customers").select("id", { count: "exact", head: true }),
    supabase.from("customer_profiles").select("id", { count: "exact", head: true }),
    supabase
      .from("applications")
      .select("id, status, payment_status, created_at, total_amount, amount, fresh_payable_amount, real_payment_amount, wallet_redeemed_amount, wallet_used_amount")
      .limit(10000),
    supabase.from("payments").select("id, status, amount, real_payment_amount, created_at, razorpay_payment_id").limit(10000),
    supabase.from("profiles").select("id, active, is_active", { count: "exact" }).eq("role", "agent"),
    supabase.from("reward_wallets").select("user_id, balance, lifetime_earned, lifetime_redeemed").limit(10000),
    supabase.from("wallet_transactions").select("id, type, direction, amount, status").limit(10000),
    supabase.from("commissions").select("id, amount, status").limit(10000),
    supabase.from("application_documents").select("application_id, is_final, status, review_status").limit(10000),
    supabase
      .from("applications")
      .select("id, service_name, customer_name, customer_mobile, customer_details, form_data, status, payment_status, created_at")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  for (const [label, result] of Object.entries({
    profilesResult,
    customersResult,
    customerProfilesResult,
    applicationsResult,
    paymentsResult,
    agentsResult,
    walletsResult,
    walletTransactionsResult,
    commissionsResult,
    documentsResult,
    recentApplicationsResult,
  })) {
    if ("error" in result && result.error) {
      console.error(`[admin-dashboard] ${label} failed`, result.error);
    }
  }

  const applications = (applicationsResult.data ?? []) as Array<Record<string, unknown>>;
  const payments = (paymentsResult.data ?? []) as Array<Record<string, unknown>>;
  const agents = (agentsResult.data ?? []) as Array<Record<string, unknown>>;
  const wallets = (walletsResult.data ?? []) as Array<Record<string, unknown>>;
  const walletTransactions = (walletTransactionsResult.data ?? []) as Array<Record<string, unknown>>;
  const commissions = (commissionsResult.data ?? []) as Array<Record<string, unknown>>;
  const documents = (documentsResult.data ?? []) as Array<Record<string, unknown>>;
  const applicationIdsWithDocs = new Set(documents.map((document) => String(document.application_id ?? "")).filter(Boolean));
  const customerCounts = [profilesResult.count ?? 0, customersResult.count ?? 0, customerProfilesResult.count ?? 0];
  const verifiedPayments = payments.filter((payment) => ["verified", "paid"].includes(normalize(payment.status)));
  const pendingPayments = payments.filter((payment) => ["pending", "unpaid"].includes(normalize(payment.status)));
  const creditTransactions = walletTransactions.filter((transaction) => normalize(transaction.direction) === "credit" && normalize(transaction.status) !== "reversed");

  return {
    totalCustomers: Math.max(...customerCounts),
    totalApplications: applications.length,
    pendingApplications: applications.filter((application) => ["pending", "payment_pending", "document_pending", "documents_required", "submitted"].includes(normalize(application.status))).length,
    processingApplications: applications.filter((application) => ["in_process", "in_progress", "assigned_to_agent"].includes(normalize(application.status))).length,
    completedApplications: applications.filter((application) => normalize(application.status) === "completed").length,
    rejectedApplications: applications.filter((application) => ["rejected", "cancelled"].includes(normalize(application.status))).length,
    todayApplications: applications.filter((application) => String(application.created_at ?? "") >= todayIso).length,
    thisMonthApplications: applications.filter((application) => String(application.created_at ?? "") >= monthIso).length,
    totalPaidAmount: verifiedPayments.reduce((total, payment) => total + Number(payment.real_payment_amount ?? payment.amount ?? 0), 0),
    pendingPayments: pendingPayments.length,
    verifiedPayments: verifiedPayments.length,
    totalAgents: agentsResult.count ?? agents.length,
    activeAgents: agents.filter((agent) => agent.active === true || agent.is_active === true).length,
    walletTotalBalance: sum(wallets, "balance"),
    totalCashbackIssued: creditTransactions
      .filter((transaction) => ["first_service_cashback", "repeat_cashback"].includes(normalize(transaction.type)))
      .reduce((total, transaction) => total + Number(transaction.amount ?? 0), 0),
    totalRewardsIssued: creditTransactions.reduce((total, transaction) => total + Number(transaction.amount ?? 0), 0),
    unpaidCommissions: commissions.filter((commission) => !["paid", "settled"].includes(normalize(commission.status))).reduce((total, commission) => total + Number(commission.amount ?? 0), 0),
    paidCommissions: commissions.filter((commission) => ["paid", "settled"].includes(normalize(commission.status))).reduce((total, commission) => total + Number(commission.amount ?? 0), 0),
    missingDocumentApplications: applications.filter((application) => !applicationIdsWithDocs.has(String(application.id))).length,
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
