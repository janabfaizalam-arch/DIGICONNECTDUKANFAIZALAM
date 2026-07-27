import { safeCurrency, safeDate, safeDateTime } from "@/lib/admin-format";
import { getApplicationCustomerIdentity } from "@/lib/admin/customer-resolver";
import { resolveApplicationSourceInfo } from "@/lib/applications/source";
import {
  ADMIN_APPLICATION_SELECT,
  ADMIN_APPLICATION_SELECT_LEGACY,
} from "@/lib/applications/safe-selects";
import { asRecord, getCustomerMobile, getCustomerName, hydrateApplications, resolveDocumentUrls } from "@/lib/crm";
import type { AdminApplicationRow, Application, ApplicationDocument, Customer, Invoice, Payment, PortalUser } from "@/lib/portal-types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isMissingColumnError, isMissingRelationError } from "@/lib/supabase/schema-compat";

export type AdminCrmSummary = {
  totalApplications: number;
  todayApplications: number;
  paymentPending: number;
  paidSubmitted: number;
  inProcess: number;
  completed: number;
  failedPayments: number;
  verifiedRevenue: number;
  walletRedeemed: number;
  cashbackLiability: number;
  newCustomersToday: number;
};

export type AdminRevenueSummary = {
  verifiedRevenue: number;
  walletRedeemed: number;
  paymentCount: number;
  refundedAmount: number;
};

export type AdminCustomerSummary = {
  totalCustomers: number;
  newCustomersToday: number;
  recentCustomers: {
    id: string;
    name: string;
    mobile: string;
    email: string;
    walletBalance: string;
    cashbackBalance: string;
    referralCount: number;
    applicationsCount: number;
    joinedDate: string;
    href: string;
  }[];
};

export type AdminPaymentDiagnostic = {
  id: string;
  issue_type: string;
  severity: "info" | "warning" | "critical";
  application_id: string | null;
  payment_id: string | null;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  message: string;
  created_at: string | null;
};

export type AdminApplicationFilters = {
  query?: string;
  status?: string;
  paymentStatus?: string;
  service?: string;
  agent?: string;
  dateRange?: string;
  unassignedOnly?: boolean;
  documentsMissingOnly?: boolean;
  page?: number;
  pageSize?: number;
};

export type AdminApplicationsResult = {
  rows: AdminApplicationRow[];
  agents: PortalUser[];
  stats: AdminApplicationsCommandStats;
  alerts: AdminApplicationsAlert[];
  filterOptions: AdminApplicationsFilterOptions;
  total: number;
  page: number;
  pageSize: number;
};

export type AdminApplicationsCommandStats = {
  totalApplications: number;
  newToday: number;
  paymentPending: number;
  documentsMissing: number;
  inProgress: number;
  completed: number;
  completedToday: number;
  unassignedApplications: number;
  agentApplications: number;
  revenueToday: number;
  walletUsed: number;
  cashbackLiability: number;
};

export type AdminApplicationsAlert = {
  type: "payment" | "assignment" | "documents" | "verification";
  label: string;
  count: number;
  tone: "orange" | "red" | "blue" | "purple";
};

export type AdminApplicationsFilterOptions = {
  services: string[];
  paymentStatuses: string[];
  statuses: string[];
};

type PaymentRow = Payment & {
  updated_at?: string | null;
};

const EMPTY_COMMAND_STATS: AdminApplicationsCommandStats = {
  totalApplications: 0,
  newToday: 0,
  paymentPending: 0,
  documentsMissing: 0,
  inProgress: 0,
  completed: 0,
  completedToday: 0,
  unassignedApplications: 0,
  agentApplications: 0,
  revenueToday: 0,
  walletUsed: 0,
  cashbackLiability: 0,
};

function startOfTodayIso() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

function normalizeStatus(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function isVerifiedPayment(payment?: Pick<Payment, "status"> | null) {
  return ["verified", "paid"].includes(normalizeStatus(payment?.status));
}

function isPaidApplication(application: Pick<Application, "payment_status" | "status">) {
  return ["verified", "paid"].includes(normalizeStatus(application.payment_status)) || ["submitted", "in_process", "in_progress", "completed"].includes(normalizeStatus(application.status));
}

function paymentAmount(payment?: Pick<Payment, "amount" | "real_payment_amount"> | null) {
  return Number(payment?.real_payment_amount ?? payment?.amount ?? 0);
}

function walletRedeemed(application: Pick<Application, "wallet_redeemed_amount" | "wallet_used_amount" | "payment_status" | "status">) {
  if (!isPaidApplication(application)) return 0;
  return Number(application.wallet_redeemed_amount ?? application.wallet_used_amount ?? 0);
}

function dedupePayments(payments: PaymentRow[]) {
  const seen = new Set<string>();
  const result: PaymentRow[] = [];

  for (const payment of payments) {
    const key = payment.razorpay_payment_id ? `rzp:${payment.razorpay_payment_id}` : `id:${payment.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(payment);
  }

  return result;
}

function customerFromApplication(application: Application) {
  const identity = getApplicationCustomerIdentity(application);

  return {
    name: identity.name || getCustomerName(application) || "Not available",
    mobile: identity.mobile || getCustomerMobile(application) || "",
    email: identity.email || "",
    address: identity.address || "",
  };
}

function firstText(...values: unknown[]) {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }

  return "";
}

function pickPrimaryPayment(application: Application) {
  const payments = dedupePayments((application.payments ?? []) as PaymentRow[]);
  return payments.find(isVerifiedPayment) ?? payments[0] ?? null;
}

function applicationToAdminRow(application: Application, agentById: Record<string, PortalUser>): AdminApplicationRow {
  const payment = pickPrimaryPayment(application);
  const invoice = application.invoices?.[0];
  const assignedAgentId = application.assigned_agent_id ?? application.agent_id ?? null;
  const assignedAgent = assignedAgentId ? agentById[assignedAgentId] : null;
  const customer = customerFromApplication(application);
  const documents = application.documents ?? [];
  const rejectedDocuments = documents.filter((document) => ["rejected", "reupload_required"].includes(normalizeStatus(document.review_status ?? document.status))).length;
  const finalDocuments = documents.filter((document) => document.is_final || document.document_type === "final_document").length;
  const sourceInfo = resolveApplicationSourceInfo(application);
  const sourceLabel = sourceInfo.label;

  return {
    id: application.id,
    source: "application",
    application_id: application.id,
    customer_name: customer.name,
    mobile: customer.mobile,
    service: application.service_name,
    message: String(asRecord(application.form_data).message ?? ""),
    uploaded_files: (application.documents ?? []).map((document) => ({
      id: document.id,
      file_name: document.file_name,
      file_url: document.file_url,
      file_type: document.file_type,
      storage_path: document.storage_path ?? null,
      document_type: document.document_type,
    })),
    payment_status: application.payment_status ?? payment?.status ?? "pending",
    invoice_status: invoice?.payment_status ?? null,
    application_status: application.status,
    agent_id: assignedAgentId,
    agent_name: assignedAgent?.full_name || assignedAgent?.email || null,
    agent_code: assignedAgent?.agent_code ?? null,
    razorpay_order_id: application.razorpay_order_id ?? payment?.razorpay_order_id ?? null,
    razorpay_payment_id: application.razorpay_payment_id ?? payment?.razorpay_payment_id ?? null,
    payment_amount: paymentAmount(payment) || Number(application.fresh_payable_amount ?? application.real_payment_amount ?? application.amount ?? 0),
    payment_method: payment?.payment_method ?? null,
    paid_at: application.paid_at ?? payment?.paid_at ?? null,
    created_at: application.created_at,
    total_amount: Number(application.total_amount ?? application.amount ?? 0),
    fresh_paid_amount: Number(application.fresh_payable_amount ?? application.real_payment_amount ?? paymentAmount(payment)),
    wallet_redeemed_amount: Number(application.wallet_redeemed_amount ?? application.wallet_used_amount ?? 0),
    customer_email: customer.email,
    service_slug: application.service_slug,
    source_label: sourceLabel,
    source_badge_class: sourceInfo.badgeClass,
    document_count: documents.length,
    rejected_document_count: rejectedDocuments,
    final_document_count: finalDocuments,
    invoice_id: invoice?.id ?? null,
    invoice_number: invoice?.invoice_number ?? null,
    commission_amount: application.commissions?.[0]?.amount ?? application.commission_amount ?? null,
    commission_status: application.commissions?.[0]?.status ?? null,
    updated_at: application.updated_at,
    latest_note: application.customer_message ?? application.admin_note ?? application.internal_notes ?? null,
  };
}



async function getUsersByRole(role: "agent") {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [] as PortalUser[];

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url, role, mobile, agent_code, commission_type, commission_value, commission_rate, active, is_active")
    .eq("role", role)
    .order("full_name", { ascending: true });

  if (error) {
    console.error(`[admin-crm] ${role} lookup failed`, error.message);
    return [] as PortalUser[];
  }

  return (data ?? []) as PortalUser[];
}

function getDateRangeStart(range?: string) {
  const now = new Date();
  if (range === "today") {
    now.setHours(0, 0, 0, 0);
    return now.toISOString();
  }
  if (range === "7d") {
    now.setDate(now.getDate() - 7);
    return now.toISOString();
  }
  if (range === "30d") {
    now.setDate(now.getDate() - 30);
    return now.toISOString();
  }
  return null;
}

function isPaymentPending(application: Pick<Application, "status" | "payment_status">) {
  return normalizeStatus(application.status) === "payment_pending" || ["pending", "unpaid"].includes(normalizeStatus(application.payment_status));
}

function isDocumentsMissing(application: Application) {
  const documents = application.documents ?? [];
  const rejected = documents.some((document) => ["rejected", "reupload_required"].includes(normalizeStatus(document.review_status ?? document.status)));
  return normalizeStatus(application.status) === "documents_required" || normalizeStatus(application.status) === "document_pending" || rejected;
}

async function getApplicationCommandMeta(): Promise<{
  stats: AdminApplicationsCommandStats;
  alerts: AdminApplicationsAlert[];
  filterOptions: AdminApplicationsFilterOptions;
}> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return {
      stats: EMPTY_COMMAND_STATS,
      alerts: [],
      filterOptions: { services: [], paymentStatuses: [], statuses: [] },
    };
  }

  const todayIso = startOfTodayIso();
  const yesterdayIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [applicationsResult, documentsResult, walletsResult] = await Promise.all([
    supabase
      .from("applications")
      .select("id, status, payment_status, service_name, source, submitted_by_role, agent_id, assigned_agent_id, created_at, updated_at, total_amount, amount, fresh_payable_amount, real_payment_amount, wallet_redeemed_amount, wallet_used_amount")
      .limit(5000),
    supabase
      .from("application_documents")
      .select("application_id, status, review_status, is_final, document_type")
      .limit(5000),
    supabase.from("reward_wallets").select("balance").limit(5000),
  ]);
  const applications = (applicationsResult.data ?? []) as Application[];
  const documentsByApplication = ((documentsResult.data ?? []) as ApplicationDocument[]).reduce<Record<string, ApplicationDocument[]>>((grouped, document) => {
    grouped[document.application_id] = grouped[document.application_id] ?? [];
    grouped[document.application_id].push(document);
    return grouped;
  }, {});
  const withDocuments = applications.map((application) => ({
    ...application,
    documents: documentsByApplication[application.id] ?? [],
  }));
  const paymentPendingOld = withDocuments.filter((application) => isPaymentPending(application) && application.created_at < yesterdayIso).length;
  const unassignedApplications = withDocuments.filter((application) => !(application.assigned_agent_id ?? application.agent_id) && normalizeStatus(application.status) !== "completed").length;
  const documentsMissing = withDocuments.filter(isDocumentsMissing).length;
  const verificationIssues = withDocuments.filter((application) => ["verified", "paid"].includes(normalizeStatus(application.payment_status)) && normalizeStatus(application.status) === "payment_pending").length;
  const wallets = (walletsResult.data ?? []) as { balance?: number | null }[];
  const revenueToday = withDocuments
    .filter((application) => application.created_at >= todayIso && ["verified", "paid"].includes(normalizeStatus(application.payment_status)))
    .reduce((total, application) => total + Number(application.fresh_payable_amount ?? application.real_payment_amount ?? application.total_amount ?? application.amount ?? 0), 0);

  return {
    stats: {
      totalApplications: withDocuments.length,
      newToday: withDocuments.filter((application) => application.created_at >= todayIso).length,
      paymentPending: withDocuments.filter(isPaymentPending).length,
      documentsMissing,
      inProgress: withDocuments.filter((application) => ["in_process", "in_progress", "submitted", "assigned_to_agent"].includes(normalizeStatus(application.status))).length,
      completed: withDocuments.filter((application) => normalizeStatus(application.status) === "completed").length,
      completedToday: withDocuments.filter((application) => normalizeStatus(application.status) === "completed" && (application.updated_at ?? application.created_at) >= todayIso).length,
      unassignedApplications,
      agentApplications: withDocuments.filter((application) => application.agent_id || application.assigned_agent_id || normalizeStatus(application.submitted_by_role) === "agent" || normalizeStatus(application.source) === "agent_pos").length,
      revenueToday,
      walletUsed: withDocuments.reduce((total, application) => total + Number(application.wallet_redeemed_amount ?? application.wallet_used_amount ?? 0), 0),
      cashbackLiability: wallets.reduce((total, wallet) => total + Number(wallet.balance ?? 0), 0),
    },
    alerts: [
      { type: "payment", label: "Payment pending older than 24h", count: paymentPendingOld, tone: "orange" },
      { type: "assignment", label: "Applications without agent assignment", count: unassignedApplications, tone: "blue" },
      { type: "documents", label: "Documents missing or rejected", count: documentsMissing, tone: "red" },
      { type: "verification", label: "Payment verification needs review", count: verificationIssues, tone: "purple" },
    ].filter((alert) => alert.count > 0) as AdminApplicationsAlert[],
    filterOptions: {
      services: [...new Set(withDocuments.map((application) => application.service_name).filter(Boolean))].sort(),
      paymentStatuses: [...new Set(withDocuments.map((application) => normalizeStatus(application.payment_status)).filter(Boolean))].sort(),
      statuses: [...new Set(withDocuments.map((application) => normalizeStatus(application.status)).filter(Boolean))].sort(),
    },
  };
}

export async function getAdminRevenueSummary(): Promise<AdminRevenueSummary> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { verifiedRevenue: 0, walletRedeemed: 0, paymentCount: 0, refundedAmount: 0 };

  const [{ data: paymentData }, { data: applicationData }] = await Promise.all([
    supabase
      .from("payments")
      .select("id, application_id, amount, real_payment_amount, status, razorpay_payment_id, created_at")
      .in("status", ["verified", "paid"]),
    supabase
      .from("applications")
      .select("id, status, payment_status, wallet_redeemed_amount, wallet_used_amount")
      .in("payment_status", ["verified", "paid"]),
  ]);
  const verifiedPayments = dedupePayments((paymentData ?? []) as PaymentRow[]).filter(isVerifiedPayment);
  const applications = (applicationData ?? []) as Application[];

  return {
    verifiedRevenue: verifiedPayments.reduce((total, payment) => total + paymentAmount(payment), 0),
    walletRedeemed: applications.reduce((total, application) => total + walletRedeemed(application), 0),
    paymentCount: verifiedPayments.length,
    refundedAmount: 0,
  };
}

export async function getAdminCrmSummary(): Promise<AdminCrmSummary> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return {
      totalApplications: 0,
      todayApplications: 0,
      paymentPending: 0,
      paidSubmitted: 0,
      inProcess: 0,
      completed: 0,
      failedPayments: 0,
      verifiedRevenue: 0,
      walletRedeemed: 0,
      cashbackLiability: 0,
      newCustomersToday: 0,
    };
  }

  const todayIso = startOfTodayIso();
  const [applicationsResult, paymentsResult, walletsResult, customersTodayResult] = await Promise.all([
    supabase
      .from("applications")
      .select("id, status, payment_status, created_at, wallet_redeemed_amount, wallet_used_amount, cashback_eligible_amount, real_payment_amount, cashback_awarded"),
    supabase
      .from("payments")
      .select("id, application_id, amount, real_payment_amount, status, razorpay_payment_id, created_at")
      .in("status", ["verified", "paid"]),
    supabase.from("reward_wallets").select("balance"),
    supabase.from("customers").select("id", { count: "exact", head: true }).gte("created_at", todayIso),
  ]);
  const applications = (applicationsResult.data ?? []) as Application[];
  const verifiedPayments = dedupePayments((paymentsResult.data ?? []) as PaymentRow[]).filter(isVerifiedPayment);
  const wallets = (walletsResult.data ?? []) as { balance?: number | null }[];

  return {
    totalApplications: new Set(applications.map((application) => application.id)).size,
    todayApplications: applications.filter((application) => application.created_at >= todayIso).length,
    paymentPending: applications.filter((application) => normalizeStatus(application.status) === "payment_pending" || normalizeStatus(application.payment_status) === "pending").length,
    paidSubmitted: applications.filter((application) => isPaidApplication(application) && ["submitted", "paid"].includes(normalizeStatus(application.status))).length,
    inProcess: applications.filter((application) => ["in_process", "in_progress"].includes(normalizeStatus(application.status))).length,
    completed: applications.filter((application) => normalizeStatus(application.status) === "completed").length,
    failedPayments: applications.filter((application) => normalizeStatus(application.status) === "payment_failed" || normalizeStatus(application.payment_status) === "failed").length,
    verifiedRevenue: verifiedPayments.reduce((total, payment) => total + paymentAmount(payment), 0),
    walletRedeemed: applications.reduce((total, application) => total + walletRedeemed(application), 0),
    cashbackLiability: wallets.reduce((total, wallet) => total + Number(wallet.balance ?? 0), 0),
    newCustomersToday: customersTodayResult.count ?? 0,
  };
}

export async function getAdminCustomerSummary(): Promise<AdminCustomerSummary> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { totalCustomers: 0, newCustomersToday: 0, recentCustomers: [] };

  const todayIso = startOfTodayIso();
  const [customersResult, profilesResult, applicationsResult, walletsResult, referralsResult, totalResult, todayResult] = await Promise.all([
    supabase.from("customers").select("*").order("created_at", { ascending: false }).limit(10),
    supabase.from("profiles").select("id, email, full_name, mobile, role, created_at").eq("role", "customer").limit(1000),
    supabase.from("applications").select("id, user_id, customer_id").limit(5000),
    supabase.from("reward_wallets").select("user_id, balance, lifetime_earned").limit(1000),
    supabase.from("referral_events").select("referrer_user_id, referred_user_id").limit(1000),
    supabase.from("customers").select("id", { count: "exact", head: true }),
    supabase.from("customers").select("id", { count: "exact", head: true }).gte("created_at", todayIso),
  ]);
  const profilesById = new Map(((profilesResult.data ?? []) as Array<{ id: string; full_name: string | null; email: string | null; mobile: string | null }>).map((profile) => [profile.id, profile]));
  const walletByUserId = new Map(((walletsResult.data ?? []) as Array<{ user_id: string | null; balance?: number | null; lifetime_earned?: number | null }>).filter((wallet) => wallet.user_id).map((wallet) => [String(wallet.user_id), wallet]));
  const applications = (applicationsResult.data ?? []) as Array<{ id: string; user_id: string | null; customer_id: string | null }>;
  const applicationCounts = applications.reduce<Record<string, number>>((grouped, application) => {
    if (application.user_id) grouped[application.user_id] = (grouped[application.user_id] ?? 0) + 1;
    if (application.customer_id) grouped[application.customer_id] = (grouped[application.customer_id] ?? 0) + 1;
    return grouped;
  }, {});
  const referralCounts = ((referralsResult.data ?? []) as Array<{ referrer_user_id: string | null }>).reduce<Record<string, number>>((grouped, referral) => {
    if (referral.referrer_user_id) grouped[referral.referrer_user_id] = (grouped[referral.referrer_user_id] ?? 0) + 1;
    return grouped;
  }, {});
  const recentCustomers = ((customersResult.data ?? []) as Customer[]).map((customer) => {
    const profile = customer.user_id ? profilesById.get(customer.user_id) : null;
    const wallet = customer.user_id ? walletByUserId.get(customer.user_id) : null;

    return {
      id: customer.id,
      name: customer.full_name || profile?.full_name || "Customer",
      mobile: customer.mobile || profile?.mobile || "",
      email: customer.email || profile?.email || "",
      walletBalance: safeCurrency(wallet?.balance),
      cashbackBalance: safeCurrency(wallet?.lifetime_earned),
      referralCount: customer.user_id ? referralCounts[customer.user_id] ?? 0 : 0,
      applicationsCount: (customer.user_id ? applicationCounts[customer.user_id] ?? 0 : 0) + (applicationCounts[customer.id] ?? 0),
      joinedDate: safeDate(customer.created_at),
      href: `/admin/customers/${customer.id}`,
    };
  });

  return {
    totalCustomers: totalResult.count ?? recentCustomers.length,
    newCustomersToday: todayResult.count ?? 0,
    recentCustomers,
  };
}

export async function getAdminPaymentDiagnostics(limit = 50): Promise<AdminPaymentDiagnostic[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("admin_crm_diagnostics")
    .select("id, issue_type, severity, application_id, payment_id, razorpay_order_id, razorpay_payment_id, message, created_at")
    .order("created_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (!error) {
    return (data ?? []) as AdminPaymentDiagnostic[];
  }

  console.error("[admin-crm] Diagnostics view unavailable", error);
  return [];
}

export async function getAdminApplications(filters: AdminApplicationFilters = {}): Promise<AdminApplicationsResult> {
  const supabase = getSupabaseAdmin();
  const page = Math.max(1, Number(filters.page ?? 1));
  const pageSize = Math.min(100, Math.max(10, Number(filters.pageSize ?? 25)));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  if (!supabase) return { rows: [], agents: [], stats: EMPTY_COMMAND_STATS, alerts: [], filterOptions: { services: [], paymentStatuses: [], statuses: [] }, total: 0, page, pageSize };

  let query = supabase
    .from("applications")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  const status = normalizeStatus(filters.status);
  if (status === "today") {
    query = query.gte("created_at", startOfTodayIso());
  } else if (status === "payment_pending") {
    query = query.eq("status", "payment_pending");
  } else if (status === "need_docs") {
    query = query.in("status", ["documents_required", "document_pending"]);
  } else if (status === "unassigned") {
    query = query.is("assigned_agent_id", null).is("agent_id", null);
  } else if (status === "agent_apps") {
    query = query.or("submitted_by_role.eq.agent,source.eq.agent_pos,agent_id.not.is.null,assigned_agent_id.not.is.null");
  } else if (status === "paid_submitted") {
    query = query.eq("payment_status", "verified").eq("status", "submitted");
  } else if (status === "in_process" || status === "in_progress") {
    query = query.in("status", ["in_process", "in_progress"]);
  } else if (status === "completed") {
    query = query.eq("status", "completed");
  } else if (status === "failed_payment") {
    query = query.or("status.eq.payment_failed,payment_status.eq.failed");
  } else if (status === "cancelled_refunded") {
    query = query.or("status.eq.cancelled,payment_status.eq.refunded");
  } else if (status && status !== "all") {
    query = query.eq("status", status);
  }

  if (filters.paymentStatus && filters.paymentStatus !== "all") {
    query = query.eq("payment_status", filters.paymentStatus);
  }

  if (filters.service && filters.service !== "all") {
    query = query.eq("service_name", filters.service);
  }

  if (filters.agent && filters.agent !== "all") {
    if (filters.agent === "agent") {
      query = query.or("submitted_by_role.eq.agent,source.eq.agent_pos,agent_id.not.is.null,assigned_agent_id.not.is.null");
    } else if (filters.agent === "unassigned") {
      query = query.is("assigned_agent_id", null).is("agent_id", null);
    } else if (filters.agent === "website") {
      query = query.or("submitted_by_role.eq.customer,source.eq.online");
    } else if (filters.agent === "admin") {
      query = query.eq("submitted_by_role", "admin");
    } else if (filters.agent.startsWith("agent:")) {
      const agentId = filters.agent.slice("agent:".length);
      query = query.or(`agent_id.eq.${agentId},assigned_agent_id.eq.${agentId}`);
    }
  }

  const rangeStart = getDateRangeStart(filters.dateRange);
  if (rangeStart) {
    query = query.gte("created_at", rangeStart);
  }

  if (filters.unassignedOnly) {
    query = query.is("assigned_agent_id", null).is("agent_id", null);
  }

  if (filters.documentsMissingOnly) {
    query = query.in("status", ["documents_required", "document_pending"]);
  }

  const search = String(filters.query ?? "").trim();
  if (search) {
    const escaped = search.replace(/[%_]/g, "\\$&");
    query = query.or(`id.ilike.%${escaped}%,service_name.ilike.%${escaped}%,service_slug.ilike.%${escaped}%,razorpay_payment_id.ilike.%${escaped}%,razorpay_order_id.ilike.%${escaped}%,form_data->>name.ilike.%${escaped}%,form_data->>mobile.ilike.%${escaped}%,form_data->>email.ilike.%${escaped}%`);
  }

  const [applicationResult, agents, meta] = await Promise.all([
    query,
    getUsersByRole("agent"),
    getApplicationCommandMeta(),
  ]);
  const agentById = agents.reduce<Record<string, PortalUser>>((grouped, agent) => {
    grouped[agent.id] = agent;
    return grouped;
  }, {});
  const baseApplications = (applicationResult.data ?? []) as Application[];
  let applications = baseApplications;

  try {
    applications = (await hydrateApplications(baseApplications)) as Application[];
  } catch (error) {
    console.error("[admin-crm] Failed to hydrate admin applications", error);
  }

  return {
    rows: applications.map((application) => applicationToAdminRow(application, agentById)),
    agents,
    stats: meta.stats,
    alerts: meta.alerts,
    filterOptions: meta.filterOptions,
    total: applicationResult.count ?? applications.length,
    page,
    pageSize,
  };
}

export async function getAdminApplicationDetail(id: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  let { data, error } = await supabase
    .from("applications")
    .select(ADMIN_APPLICATION_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error && isMissingColumnError(error)) {
    ({ data, error } = await supabase
      .from("applications")
      .select(ADMIN_APPLICATION_SELECT_LEGACY)
      .eq("id", id)
      .maybeSingle());
  }

  if (error || !data) return null;

  let application = data as unknown as Application;
  // Never expose persisted signed/public final URLs into admin detail payloads.
  application = {
    ...application,
    final_document_url: null,
    completed_document_url: null,
  } as Application;

  try {
    [application] = (await hydrateApplications([application])) as Application[];
    application = {
      ...application,
      final_document_url: null,
      completed_document_url: null,
    } as Application;
  } catch (caught) {
    console.error("[admin-crm] Failed to hydrate application detail", caught);
  }

  const payment = pickPrimaryPayment(application);
  const allPayments = dedupePayments((application.payments ?? []) as PaymentRow[]);
  const fallbackCustomer = customerFromApplication(application);
  const warnings: string[] = [];
  const amountMismatch = payment && Math.round(paymentAmount(payment)) !== Math.round(Number(application.fresh_payable_amount ?? application.real_payment_amount ?? paymentAmount(payment)));

  if (isVerifiedPayment(payment) && normalizeStatus(application.status) === "payment_pending") warnings.push("Payment verified but application is still payment pending.");
  if (isPaidApplication(application) && !payment) warnings.push("Application is paid/submitted but payment row is missing.");
  if (allPayments.length > 1) warnings.push("Multiple payment rows exist for this application.");
  if (!application.user_id && !application.customer_id) warnings.push("Customer/user mapping is missing.");
  if (amountMismatch) warnings.push("Payment amount does not match application fresh payable amount.");
  if (!application.service_slug) warnings.push("Service slug is missing.");

  const documentSelect = "id, application_id, user_id, customer_id, document_type, document_name, file_name, file_url, file_type, file_size, storage_path, storage_bucket, status, review_status, rejection_reason, reviewed_by, reviewed_at, uploaded_by, uploaded_by_role, is_final, customer_visible, partner_visible, delivery_channel, delivery_status, delivered_at, metadata, uploaded_at, created_at";
  const legacyDocumentSelect = "id, application_id, user_id, document_type, file_name, file_url, file_type, storage_path, is_final, created_at";
  console.info("[admin-crm] ADMIN_APPLICATION_ID", { applicationId: id });

  const agencyPartnerId = (application as Application & { agency_partner_id?: string | null }).agency_partner_id;

  const [notesResult, agentsResult, statusLogsResult, referralResult, diagnosticsResult, initialDocumentsResult, profileResult, customerProfileResult, customerResult, partnerResult, whatsappResult] = await Promise.all([
    supabase.from("admin_notes").select("id, application_id, note, assigned_to, created_at").eq("application_id", id).order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, full_name, email, avatar_url, role, mobile, agent_code, commission_type, commission_value, commission_rate, active, is_active").eq("role", "agent"),
    supabase.from("status_logs").select("id, old_status, new_status, note, created_at").eq("application_id", id).order("created_at", { ascending: false }),
    application.user_id ? supabase.from("profiles").select("referral_code_used, referred_by_user_id").eq("id", application.user_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
    supabase.from("admin_crm_diagnostics").select("issue_type, severity, message").eq("application_id", id).limit(10),
    supabase.from("application_documents").select(documentSelect).eq("application_id", id).order("created_at", { ascending: false, nullsFirst: false }),
    application.user_id ? supabase.from("profiles").select("id, full_name, email, mobile, address, city, state, pincode").eq("id", application.user_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
    application.user_id ? supabase.from("customer_profiles").select("id, full_name, email, mobile, address, city, state, pincode").eq("id", application.user_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
    application.customer_id ? supabase.from("customers").select("id, user_id, full_name, email, mobile, address, city, state, pincode").eq("id", application.customer_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
    agencyPartnerId
      ? supabase.from("agency_partners").select("id, partner_code, full_name, mobile, partner_type, email").eq("id", agencyPartnerId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from("whatsapp_messages")
      .select("id, event_type, status, attempt_count, error_message, created_at, sent_at, failed_at, last_attempt_at")
      .eq("application_id", id)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  let directDocumentsRaw: ApplicationDocument[] = [];
  if (initialDocumentsResult.error) {
    console.warn("[admin-crm] ADMIN_DOCUMENTS_FETCH_ERROR", {
      applicationId: id,
      message: initialDocumentsResult.error.message,
      code: initialDocumentsResult.error.code,
      retry: "legacy_columns",
    });
    const legacyDocumentsResult = await supabase
      .from("application_documents")
      .select(legacyDocumentSelect)
      .eq("application_id", id)
      .order("created_at", { ascending: false, nullsFirst: false });
    if (legacyDocumentsResult.error) {
      console.error("[admin-crm] ADMIN_DOCUMENTS_FETCH_ERROR", {
        applicationId: id,
        message: legacyDocumentsResult.error.message,
        code: legacyDocumentsResult.error.code,
      });
    } else {
      directDocumentsRaw = (legacyDocumentsResult.data ?? []) as ApplicationDocument[];
    }
  } else {
    directDocumentsRaw = (initialDocumentsResult.data ?? []) as ApplicationDocument[];
  }
  console.info("[admin-crm] ADMIN_DOCUMENTS_FETCH_COUNT", {
    applicationId: id,
    directCount: directDocumentsRaw.length,
  });
  console.info("[admin-crm] ADMIN_DOCUMENTS_RAW_ROWS", {
    applicationId: id,
    rows: directDocumentsRaw,
  });

  const normalizedDocs: ApplicationDocument[] = [];
  directDocumentsRaw.forEach((doc) => {
    normalizedDocs.push({
      id: doc.id,
      application_id: doc.application_id,
      customer_id: doc.customer_id ?? null,
      uploaded_by: doc.uploaded_by ?? null,
      uploaded_by_role: doc.uploaded_by_role ?? null,
      document_type: doc.document_type || "customer_document",
      document_name: doc.document_name || doc.document_type || doc.file_name,
      file_name: doc.file_name,
      file_url: doc.file_url || "",
      file_type: doc.file_type || null,
      file_size: doc.file_size || null,
      storage_path: doc.storage_path || null,
      review_status: doc.review_status ?? doc.status ?? "pending",
      status: doc.status ?? doc.review_status ?? "pending",
      is_final: doc.is_final ?? false,
      customer_visible: doc.customer_visible ?? null,
      partner_visible: doc.partner_visible ?? null,
      delivery_channel: doc.delivery_channel ?? null,
      delivery_status: doc.delivery_status ?? null,
      delivered_at: doc.delivered_at ?? null,
      rejection_reason: doc.rejection_reason ?? null,
      metadata: doc.metadata ?? {},
      uploaded_at: doc.uploaded_at ?? doc.created_at ?? new Date().toISOString(),
      created_at: doc.created_at ?? doc.uploaded_at ?? new Date().toISOString(),
      source: "application_documents",
    });
  });

  const applicationRecord = application as Application & { documents?: unknown };
  const legacyDocumentSources = [
    {
      items: Array.isArray(applicationRecord.documents) ? applicationRecord.documents : [],
      source: "legacy_applications_documents" as const,
      prefix: "legacy-application",
    },
    {
      items: Array.isArray(asRecord(application.form_data).documents) ? asRecord(application.form_data).documents as unknown[] : [],
      source: "legacy_form_data_documents" as const,
      prefix: "legacy-form-data",
    },
  ];

  legacyDocumentSources.forEach(({ items, source, prefix }) => {
    items.forEach((item, idx) => {
      const doc = asRecord(item);
      if (!Object.keys(doc).length) return;
      const fileName = firstText(doc.file_name, doc.name, doc.document_name, "Document");
      const storagePath = firstText(doc.storage_path, doc.path) || null;
      const exists = normalizedDocs.some((normalized) => normalized.file_name === fileName || Boolean(storagePath && normalized.storage_path === storagePath));
      if (exists) return;

      normalizedDocs.push({
        id: `${prefix}-${idx}`,
        application_id: id,
        customer_id: application.customer_id ?? null,
        uploaded_by: application.user_id ?? null,
        uploaded_by_role: "customer",
        document_type: firstText(doc.document_type, "customer_document"),
        document_name: firstText(doc.document_name, doc.document_type, fileName),
        file_name: fileName,
        file_url: firstText(doc.file_url, doc.url),
        file_type: firstText(doc.file_type, doc.type) || null,
        file_size: typeof doc.file_size === "number" ? doc.file_size : null,
        storage_path: storagePath,
        review_status: (typeof doc.review_status === "string" ? doc.review_status : typeof doc.status === "string" ? doc.status : "pending") as "pending" | "accepted" | "rejected" | "reupload_required",
        status: (typeof doc.status === "string" ? doc.status : typeof doc.review_status === "string" ? doc.review_status : "pending") as "pending" | "accepted" | "rejected" | "reupload_required",
        is_final: typeof doc.is_final === "boolean" ? doc.is_final : false,
        rejection_reason: typeof doc.rejection_reason === "string" ? doc.rejection_reason : null,
        metadata: doc.metadata && typeof doc.metadata === "object" ? (doc.metadata as Record<string, unknown>) : {},
        uploaded_at: typeof doc.uploaded_at === "string" ? doc.uploaded_at : application.created_at,
        created_at: typeof doc.created_at === "string" ? doc.created_at : application.created_at,
        source,
      });
    });
  });

  const documents = await resolveDocumentUrls(normalizedDocs);
  // Admin preview uses signed-URL API — strip file_url from final docs to avoid accidental exposure.
  const documentsForAdmin = documents.map((document) => {
    if (document.is_final || document.document_type === "final_document") {
      return { ...document, file_url: "", signed_url: undefined };
    }
    return document;
  });
  console.info("[admin-crm] ADMIN_DOCUMENTS_RESOLVED_URLS", {
    applicationId: id,
    documents: documentsForAdmin.map((document) => ({
      fileName: document.file_name,
      storagePath: document.storage_path,
      hasUrl: Boolean(document.signed_url || document.file_url),
      source: document.source,
      isFinal: Boolean(document.is_final),
    })),
  });

  const whatsappMessages =
    whatsappResult.error && (isMissingRelationError(whatsappResult.error) || isMissingColumnError(whatsappResult.error))
      ? []
      : whatsappResult.error
        ? []
        : whatsappResult.data ?? [];

  return {
    application,
    payment,
    invoice: application.invoices?.[0] ?? null,
    customer: {
      name: firstText(profileResult.data?.full_name, customerProfileResult.data?.full_name, fallbackCustomer.name),
      mobile: firstText(profileResult.data?.mobile, customerProfileResult.data?.mobile, customerResult.data?.mobile, fallbackCustomer.mobile, application.customer_mobile),
      email: firstText(profileResult.data?.email, customerProfileResult.data?.email, customerResult.data?.email, fallbackCustomer.email, application.customer_email),
      address: firstText(profileResult.data?.address, customerProfileResult.data?.address, customerResult.data?.address, fallbackCustomer.address),
      city: firstText(profileResult.data?.city, customerProfileResult.data?.city, customerResult.data?.city),
      state: firstText(profileResult.data?.state, customerProfileResult.data?.state, customerResult.data?.state),
      pincode: firstText(profileResult.data?.pincode, customerProfileResult.data?.pincode, customerResult.data?.pincode),
    },
    documents: documentsForAdmin,
    possibleDocuments: [] as ApplicationDocument[],
    invoices: (application.invoices ?? []) as Invoice[],
    payments: allPayments,
    notes: notesResult.error ? [] : notesResult.data ?? [],
    agents: agentsResult.error ? [] : (agentsResult.data ?? []) as PortalUser[],
    statusLogs: statusLogsResult.error ? [] : statusLogsResult.data ?? [],
    whatsappMessages,
    referralDebug: referralResult.error ? null : referralResult.data,
    diagnostics: diagnosticsResult.error ? [] : diagnosticsResult.data ?? [],
    documentDiagnostics: {
      applicationId: id,
      userId: application.user_id ?? null,
      customerId: application.customer_id ?? null,
      expectedQuery: `application_documents.application_id = ${id}`,
    },
    warnings,
    partner: partnerResult.error ? null : partnerResult.data,
    facts: {
      totalAmount: Number(application.total_amount ?? application.amount ?? 0),
      verifiedPaidAmount: isVerifiedPayment(payment) ? paymentAmount(payment) : 0,
      walletRedeemed: Number(application.wallet_redeemed_amount ?? application.wallet_used_amount ?? 0),
      cashbackEligible: Number(application.cashback_eligible_amount ?? application.real_payment_amount ?? 0),
      createdAt: safeDateTime(application.created_at),
      submittedAt: safeDateTime(application.submitted_at),
      paidAt: safeDateTime(application.paid_at ?? payment?.paid_at),
      completedAt: normalizeStatus(application.status) === "completed" ? safeDateTime(application.updated_at) : "-",
    },
  };
}
