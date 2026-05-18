import { safeCurrency, safeDate, safeDateTime } from "@/lib/admin-format";
import { asRecord, getCustomerMobile, getCustomerName, hydrateApplications, resolveDocumentUrls } from "@/lib/crm";
import type { AdminApplicationRow, Application, ApplicationDocument, Customer, Invoice, Payment, PortalUser } from "@/lib/portal-types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

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
  page?: number;
  pageSize?: number;
};

export type AdminApplicationsResult = {
  rows: AdminApplicationRow[];
  staff: PortalUser[];
  total: number;
  page: number;
  pageSize: number;
};

type PaymentRow = Payment & {
  updated_at?: string | null;
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
  const formData = asRecord(application.form_data);
  const customerDetails = asRecord(application.customer_details);

  return {
    name: String(customerDetails.name ?? getCustomerName(application)),
    mobile: String(customerDetails.mobile ?? getCustomerMobile(application)),
    email: String(customerDetails.email ?? formData.email ?? application.customers?.email ?? ""),
    address: String(customerDetails.address ?? formData.address ?? application.customers?.address ?? ""),
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
    assigned_staff_id: assignedAgentId,
    assigned_staff_name: assignedAgent?.full_name || assignedAgent?.email || null,
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
  };
}

async function getAgentsById() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return {};

  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url, role, mobile, agent_code, commission_type, commission_value, commission_rate, active, is_active")
    .eq("role", "agent");

  return ((data ?? []) as PortalUser[]).reduce<Record<string, PortalUser>>((grouped, agent) => {
    grouped[agent.id] = agent;
    return grouped;
  }, {});
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

  if (!supabase) return { rows: [], staff: [], total: 0, page, pageSize };

  let query = supabase
    .from("applications")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  const status = normalizeStatus(filters.status);
  if (status === "payment_pending") {
    query = query.eq("status", "payment_pending");
  } else if (status === "paid_submitted") {
    query = query.eq("payment_status", "verified").eq("status", "submitted");
  } else if (status === "in_process") {
    query = query.in("status", ["in_process", "in_progress"]);
  } else if (status === "completed") {
    query = query.eq("status", "completed");
  } else if (status === "failed_payment") {
    query = query.or("status.eq.payment_failed,payment_status.eq.failed");
  } else if (status === "cancelled_refunded") {
    query = query.or("status.eq.cancelled,payment_status.eq.refunded");
  }

  const search = String(filters.query ?? "").trim();
  if (search) {
    const escaped = search.replace(/[%_]/g, "\\$&");
    query = query.or(`id.ilike.%${escaped}%,service_name.ilike.%${escaped}%,service_slug.ilike.%${escaped}%,razorpay_payment_id.ilike.%${escaped}%,razorpay_order_id.ilike.%${escaped}%,form_data->>name.ilike.%${escaped}%,form_data->>mobile.ilike.%${escaped}%,form_data->>email.ilike.%${escaped}%`);
  }

  const [applicationResult, agentById] = await Promise.all([query, getAgentsById()]);
  const baseApplications = (applicationResult.data ?? []) as Application[];
  let applications = baseApplications;

  try {
    applications = (await hydrateApplications(baseApplications)) as Application[];
  } catch (error) {
    console.error("[admin-crm] Failed to hydrate admin applications", error);
  }

  return {
    rows: applications.map((application) => applicationToAdminRow(application, agentById)),
    staff: Object.values(agentById),
    total: applicationResult.count ?? applications.length,
    page,
    pageSize,
  };
}

export async function getAdminApplicationDetail(id: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data, error } = await supabase.from("applications").select("*").eq("id", id).maybeSingle();
  if (error || !data) return null;

  let application = data as Application;
  try {
    [application] = (await hydrateApplications([application])) as Application[];
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

  const documentSelect = "id, application_id, user_id, customer_id, document_type, document_name, file_name, file_url, file_type, storage_path, status, review_status, rejection_reason, reviewed_by, reviewed_at, uploaded_by, uploaded_by_role, is_final, metadata, uploaded_at, created_at";
  const possibleDocumentQueries = [];
  if (application.user_id) {
    possibleDocumentQueries.push(
      supabase
        .from("application_documents")
        .select(documentSelect)
        .eq("user_id", application.user_id)
        .neq("application_id", id)
        .order("uploaded_at", { ascending: false, nullsFirst: false })
        .limit(10),
    );
  }
  if (application.customer_id) {
    possibleDocumentQueries.push(
      supabase
        .from("application_documents")
        .select(documentSelect)
        .eq("customer_id", application.customer_id)
        .neq("application_id", id)
        .order("uploaded_at", { ascending: false, nullsFirst: false })
        .limit(10),
    );
  }

  const [notesResult, agentResult, statusLogsResult, referralResult, diagnosticsResult, directDocumentsResult, profileResult, customerProfileResult, possibleDocumentResults] = await Promise.all([
    supabase.from("admin_notes").select("id, application_id, note, assigned_to, created_at").eq("application_id", id).order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, full_name, email, avatar_url, role, mobile, agent_code, commission_type, commission_value, commission_rate, active, is_active").eq("role", "agent"),
    supabase.from("status_logs").select("id, old_status, new_status, note, created_at").eq("application_id", id).order("created_at", { ascending: false }),
    application.user_id ? supabase.from("profiles").select("referral_code_used, referred_by_user_id").eq("id", application.user_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
    supabase.from("admin_crm_diagnostics").select("issue_type, severity, message").eq("application_id", id).limit(10),
    supabase.from("application_documents").select(documentSelect).eq("application_id", id).order("uploaded_at", { ascending: false, nullsFirst: false }),
    application.user_id ? supabase.from("profiles").select("id, full_name, email, mobile, address, city, state, pincode").eq("id", application.user_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
    application.user_id ? supabase.from("customer_profiles").select("id, full_name, email, mobile, address, city, state, pincode").eq("id", application.user_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
    Promise.all(possibleDocumentQueries),
  ]);
  const directDocuments = await resolveDocumentUrls((directDocumentsResult.data ?? []) as ApplicationDocument[]);
  const documents = directDocuments.length ? directDocuments : ((application.documents ?? []) as ApplicationDocument[]);
  const possibleDocuments = documents.length
    ? []
    : await resolveDocumentUrls(
        Array.from(
          new Map(
            possibleDocumentResults.flatMap((result) => (result.error ? [] : ((result.data ?? []) as ApplicationDocument[]))).map((document) => [document.id, document]),
          ).values(),
        ),
      );

  return {
    application,
    payment,
    invoice: application.invoices?.[0] ?? null,
    customer: {
      name: firstText(profileResult.data?.full_name, customerProfileResult.data?.full_name, fallbackCustomer.name),
      mobile: firstText(profileResult.data?.mobile, customerProfileResult.data?.mobile, fallbackCustomer.mobile, application.customer_mobile),
      email: firstText(profileResult.data?.email, customerProfileResult.data?.email, fallbackCustomer.email, application.customer_email),
      address: firstText(profileResult.data?.address, customerProfileResult.data?.address, fallbackCustomer.address),
    },
    documents,
    possibleDocuments,
    invoices: (application.invoices ?? []) as Invoice[],
    payments: allPayments,
    notes: notesResult.error ? [] : notesResult.data ?? [],
    staff: agentResult.error ? [] : (agentResult.data ?? []) as PortalUser[],
    statusLogs: statusLogsResult.error ? [] : statusLogsResult.data ?? [],
    referralDebug: referralResult.error ? null : referralResult.data,
    diagnostics: diagnosticsResult.error ? [] : diagnosticsResult.data ?? [],
    documentDiagnostics: {
      applicationId: id,
      userId: application.user_id ?? null,
      customerId: application.customer_id ?? null,
      expectedQuery: `application_documents.application_id = ${id}`,
    },
    warnings,
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
