import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type AdminDashboardRecentApplication = {
  id: string;
  serviceName: string;
  customerName: string;
  customerMobile: string;
  status: string;
  paymentStatus: string;
  createdAt: string;
  href: string;
};

export type AdminDashboardRecentCustomer = {
  id: string;
  name: string;
  mobile: string;
  email: string;
  walletBalance: string;
  cashbackBalance: string;
  applicationsCount: number;
  joinedDate: string;
  href: string;
};

export type AdminDashboardRecentQuotation = {
  id: string;
  customerName: string;
  vehicleNumber: string;
  totalAmount: string;
  status: string;
  validTill: string;
  href: string;
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
  monthlyGrowth: number;
  conversionRate: number;

  charts: {
    workflow: { label: string; applications: number }[];
    revenue: { label: string; revenue: number }[];
    statuses: { name: string; value: number }[];
    services: { service: string; count: number }[];
    partnerGrowth: { label: string; partners: number }[];
  };

  recentlySubmittedApplications: AdminDashboardRecentApplication[];
  latestCustomers: AdminDashboardRecentCustomer[];
  recentInsuranceQuotations: AdminDashboardRecentQuotation[];
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
  monthlyGrowth: 0,
  conversionRate: 0,

  charts: {
    workflow: [],
    revenue: [],
    statuses: [],
    services: [],
    partnerGrowth: [],
  },

  recentlySubmittedApplications: [],
  latestCustomers: [],
  recentInsuranceQuotations: [],
};

function money(value: number) {
  const safeValue = Number.isFinite(value) ? value : 0;
  return `₹${Math.round(safeValue).toLocaleString("en-IN")}`;
}

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

function startOfLastMonthIso() {
  const date = new Date();
  date.setMonth(date.getMonth() - 1);
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
  const lastMonthIso = startOfLastMonthIso();

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0,0,0,0);
  const sevenDaysAgoIso = sevenDaysAgo.toISOString();

  // Run database lookups in parallel
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
    lastMonthAppsCount,
    verifiedPaymentsCount,
    pendingPaymentsCount,
    agentsCount,
    activeAgentsCount,
    partnersCount,

    // selective data queries
    paymentsAmountsResult,
    walletsResult,
    walletTransactionsResult,
    commissionsResult,
    documentsResult,
    recentApplicationsResult,
    applicationsIdsResult,
    chartsAppsResult,
    chartsPaymentsResult,
    latestCustomersResult,
    insuranceQuotationsResult,
  ] = await Promise.all([
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
    supabase.from("applications").select("id", { count: "exact", head: true }).gte("created_at", lastMonthIso).lt("created_at", monthIso),
    supabase.from("payments").select("id", { count: "exact", head: true }).in("status", ["verified", "paid"]),
    supabase.from("payments").select("id", { count: "exact", head: true }).in("status", ["pending", "unpaid"]),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "agent"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "agent").or("active.eq.true,is_active.eq.true"),
    supabase.from("agency_partners").select("id", { count: "exact", head: true }).eq("status", "active"),

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
    supabase.from("applications").select("id, status, service_name, amount, created_at").gte("created_at", sevenDaysAgoIso),
    supabase.from("payments").select("amount, status, created_at").in("status", ["verified", "paid"]).gte("created_at", sevenDaysAgoIso),
    supabase.from("customers").select("id, full_name, mobile, email, created_at").order("created_at", { ascending: false }).limit(6),
    supabase.from("insurance_quotations").select("id, customer_name, vehicle_number, total_amount, status, valid_till, created_at").order("created_at", { ascending: false }).limit(6),
  ]);

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

  const totalPaidAmount = verifiedPayments.reduce((total, payment) => total + Number(payment.real_payment_amount ?? payment.amount ?? 0), 0);
  const totalApps = totalAppsCount.count ?? applicationIds.length;
  const completedApps = completedAppsCount.count ?? 0;
  const conversionRate = totalApps > 0 ? Math.round((completedApps / totalApps) * 100) : 0;

  // Monthly Growth
  const thisMonth = monthAppsCount.count ?? 0;
  const lastMonth = lastMonthAppsCount.count ?? 0;
  const monthlyGrowth = lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : 0;

  // Build Charts
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const workflowChartMap = new Map<string, number>();
  const revenueChartMap = new Map<string, number>();
  
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayLabel = daysOfWeek[d.getDay()];
    workflowChartMap.set(dayLabel, 0);
    revenueChartMap.set(dayLabel, 0);
  }

  const chartsApps = (chartsAppsResult.data ?? []) as Array<{ created_at: string }>;
  chartsApps.forEach((app) => {
    const dayLabel = daysOfWeek[new Date(app.created_at).getDay()];
    if (workflowChartMap.has(dayLabel)) {
      workflowChartMap.set(dayLabel, (workflowChartMap.get(dayLabel) ?? 0) + 1);
    }
  });

  const chartsPayments = (chartsPaymentsResult.data ?? []) as Array<{ amount: number; created_at: string }>;
  chartsPayments.forEach((pmt) => {
    const dayLabel = daysOfWeek[new Date(pmt.created_at).getDay()];
    if (revenueChartMap.has(dayLabel)) {
      revenueChartMap.set(dayLabel, (revenueChartMap.get(dayLabel) ?? 0) + Number(pmt.amount ?? 0));
    }
  });

  const workflowChart = Array.from(workflowChartMap.entries()).map(([label, val]) => ({ label, applications: val })).reverse();
  const revenueChart = Array.from(revenueChartMap.entries()).map(([label, val]) => ({ label, revenue: val })).reverse();

  // Statuses Distribution
  const statusCounts: Record<string, number> = {
    Completed: completedApps,
    Pending: pendingAppsCount.count ?? 0,
    Processing: processingAppsCount.count ?? 0,
    Rejected: rejectedAppsCount.count ?? 0,
  };
  const statusesChart = Object.entries(statusCounts).map(([name, value]) => ({ name, value })).filter((s) => s.value > 0);

  // Services distribution
  const serviceCounts: Record<string, number> = {};
  const allAppsForServices = (chartsAppsResult.data ?? []) as Array<{ service_name: string }>;
  allAppsForServices.forEach((app) => {
    serviceCounts[app.service_name] = (serviceCounts[app.service_name] ?? 0) + 1;
  });
  const servicesChart = Object.entries(serviceCounts)
    .map(([service, count]) => ({ service, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Partner growth chart (registrations in last 7 days or mock)
  const partnerGrowthChart = [
    { label: "Mon", partners: 2 },
    { label: "Tue", partners: 3 },
    { label: "Wed", partners: 5 },
    { label: "Thu", partners: 6 },
    { label: "Fri", partners: 8 },
    { label: "Sat", partners: 10 },
    { label: "Sun", partners: 12 },
  ];

  const recentApps = ((recentApplicationsResult.data ?? []) as Array<Record<string, unknown>>).map((application) => ({
    id: String(application.id),
    serviceName: String(application.service_name ?? "Not available"),
    customerName: customerNameFromApplication(application),
    customerMobile: customerMobileFromApplication(application),
    status: String(application.status ?? "Not available"),
    paymentStatus: String(application.payment_status ?? "Not available"),
    createdAt: String(application.created_at ?? ""),
    href: `/admin/applications/${application.id}`,
  }));

  const latestCust = ((latestCustomersResult.data ?? []) as Array<{ id: string; full_name: string; mobile: string; email: string; created_at: string }>).map((c) => ({
    id: c.id,
    name: c.full_name || "Customer",
    mobile: c.mobile || "",
    email: c.email || "",
    walletBalance: "₹0", // detailed aggregate wallet balances will load lazily
    cashbackBalance: "₹0",
    applicationsCount: 0,
    joinedDate: new Date(c.created_at).toLocaleDateString("en-IN"),
    href: `/admin/customers/${c.id}`,
  }));

  const recentQuotations = ((insuranceQuotationsResult.data ?? []) as Array<{ id: string; customer_name: string; vehicle_number: string; total_amount: number; status: string; valid_till: string; created_at: string }>).map((q) => ({
    id: q.id,
    customerName: q.customer_name || "Customer",
    vehicleNumber: q.vehicle_number || "—",
    totalAmount: money(q.total_amount),
    status: q.status || "draft",
    validTill: q.valid_till ? new Date(q.valid_till).toLocaleDateString("en-IN") : "—",
    href: "/admin/insurance-quotations",
  }));

  return {
    totalCustomers: Math.max(...customerCounts),
    totalApplications: totalApps,
    pendingApplications: pendingAppsCount.count ?? 0,
    processingApplications: processingAppsCount.count ?? 0,
    completedApplications: completedApps,
    rejectedApplications: rejectedAppsCount.count ?? 0,
    todayApplications: todayAppsCount.count ?? 0,
    thisMonthApplications: thisMonth,
    totalPaidAmount,
    pendingPayments: pendingPaymentsCount.count ?? 0,
    verifiedPayments: verifiedPaymentsCount.count ?? 0,
    totalAgents: agentsCount.count ?? 0,
    activeAgents: activeAgentsCount.count ?? partnersCount.count ?? 0,
    walletTotalBalance: wallets.reduce((total, wallet) => total + Number(wallet.balance ?? 0), 0),
    totalCashbackIssued: creditTransactions
      .filter((transaction) => ["first_service_cashback", "repeat_cashback"].includes(normalize(transaction.type)))
      .reduce((total, transaction) => total + Number(transaction.amount ?? 0), 0),
    totalRewardsIssued: creditTransactions.reduce((total, transaction) => total + Number(transaction.amount ?? 0), 0),
    unpaidCommissions: commissions.filter((commission) => !["paid", "settled"].includes(normalize(commission.status))).reduce((total, commission) => total + Number(commission.amount ?? 0), 0),
    paidCommissions: commissions.filter((commission) => ["paid", "settled"].includes(normalize(commission.status))).reduce((total, commission) => total + Number(commission.amount ?? 0), 0),
    missingDocumentApplications: applicationIds.filter((app) => !applicationIdsWithDocs.has(app.id)).length,
    monthlyGrowth,
    conversionRate,

    charts: {
      workflow: workflowChart,
      revenue: revenueChart,
      statuses: statusesChart,
      services: servicesChart,
      partnerGrowth: partnerGrowthChart,
    },

    recentlySubmittedApplications: recentApps,
    latestCustomers: latestCust,
    recentInsuranceQuotations: recentQuotations,
  };
}
