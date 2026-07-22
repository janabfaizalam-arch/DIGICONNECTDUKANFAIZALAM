/**
 * Admin dashboard real-data loader (Phase C).
 * Financial totals: prefer service_role RPCs; fallback to paginated sums (never .limit(10000)).
 */

/* eslint-disable @typescript-eslint/no-explicit-any -- Supabase filter builders are chained dynamically */

import { formatDelta, formatInr, formatIstDayLabel, type AdminDateRange } from "@/lib/admin/date-range";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type MetricDelta = {
  absolute: number;
  percent: number | null;
  label: string;
};

export type DashboardMetric = {
  id: string;
  title: string;
  value: string | number;
  raw: number;
  href: string;
  delta: MetricDelta;
  increaseIsGood: boolean;
  icon:
    | "customers"
    | "partners"
    | "applications"
    | "pending"
    | "progress"
    | "completed"
    | "revenue"
    | "wallet"
    | "failed"
    | "commission";
};

export type DashboardWidgetItem = {
  id: string;
  title: string;
  subtitle: string;
  meta?: string;
  href: string;
  tone?: "default" | "warning" | "danger" | "success";
};

export type AdminDashboardPayload = {
  range: AdminDateRange;
  metrics: DashboardMetric[];
  charts: {
    applicationsTrend: { label: string; applications: number }[];
    revenueTrend: { label: string; revenue: number }[];
    statusDistribution: { name: string; value: number }[];
    topServices: { service: string; count: number }[];
    partnerPerformance: { partner: string; applications: number }[] | null;
  };
  widgets: {
    recentApplications: DashboardWidgetItem[];
    needingAttention: DashboardWidgetItem[];
    failedPayments: DashboardWidgetItem[];
    pendingPartnerApprovals: DashboardWidgetItem[];
    recentCustomers: DashboardWidgetItem[];
    recentNotifications: DashboardWidgetItem[];
  };
  notes: string[];
  generatedAt: string;
};

const PENDING_STATUSES = ["pending", "payment_pending", "document_pending", "documents_required", "submitted", "draft"];
const IN_PROGRESS_STATUSES = [
  "in_process",
  "in_progress",
  "assigned_to_agent",
  "documents_under_review",
  "application_processing",
  "under_review",
  "submitted_to_department",
  "under_government_review",
];
const COMPLETED_STATUSES = ["completed", "approved", "payment_success", "payment_verified"];

function customerNameFromApplication(row: Record<string, unknown>) {
  const details = typeof row.customer_details === "object" && row.customer_details ? (row.customer_details as Record<string, unknown>) : {};
  const form = typeof row.form_data === "object" && row.form_data ? (row.form_data as Record<string, unknown>) : {};
  return String(details.name ?? form.name ?? row.customer_name ?? "Customer").trim() || "Customer";
}

async function headCount(query: PromiseLike<{ count: number | null; error: { message: string } | null }>, label: string) {
  const { count, error } = await query;
  if (error) {
    console.error("[admin-dashboard] count failed", { label, error: error.message });
    return 0;
  }
  return count ?? 0;
}

async function sumPaginated(
  createPage: (from: number, to: number) => PromiseLike<{ data: Record<string, unknown>[] | null; error: { message: string } | null }>,
  amountFromRow: (row: Record<string, unknown>) => number,
  label: string,
) {
  const pageSize = 1000;
  let offset = 0;
  let total = 0;

  for (;;) {
    const { data, error } = await createPage(offset, offset + pageSize - 1);
    if (error) {
      console.error("[admin-dashboard] paginated sum failed", { label, error: error.message });
      return total;
    }
    const rows = data ?? [];
    for (const row of rows) total += amountFromRow(row);
    if (rows.length < pageSize) break;
    offset += pageSize;
    if (offset > 500_000) break;
  }

  return total;
}

async function paymentTotals(fromIso: string | null, toIso: string | null) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { verifiedSum: 0, pendingCount: 0, failedCount: 0, verifiedCount: 0 };

  const { data, error } = await supabase.rpc("admin_dashboard_payment_totals", {
    p_from: fromIso,
    p_to: toIso,
  });

  if (!error && data) {
    const row = data as Record<string, unknown>;
    return {
      verifiedSum: Number(row.verified_sum_rupees ?? 0),
      pendingCount: Number(row.pending_count ?? 0),
      failedCount: Number(row.failed_count ?? 0),
      verifiedCount: Number(row.verified_count ?? 0),
    };
  }

  if (error) console.warn("[admin-dashboard] payment RPC unavailable; paginated fallback", error.message);

  const applyRange = (q: any) => {
    let next = q;
    if (fromIso) next = next.gte("created_at", fromIso);
    if (toIso) next = next.lt("created_at", toIso);
    return next;
  };

  const verifiedSum = await sumPaginated(
    (from, to) => applyRange(supabase.from("payments").select("real_payment_amount, amount, status").in("status", ["verified", "paid"]).range(from, to)),
    (row) => Number(row.real_payment_amount ?? row.amount ?? 0),
    "payments.verified",
  );

  const pendingCount = await headCount(
    applyRange(supabase.from("payments").select("id", { count: "exact", head: true }).in("status", ["pending", "unpaid"])),
    "payments.pending",
  );
  const failedCount = await headCount(
    applyRange(supabase.from("payments").select("id", { count: "exact", head: true }).in("status", ["failed", "cancelled", "canceled"])),
    "payments.failed",
  );
  const verifiedCount = await headCount(
    applyRange(supabase.from("payments").select("id", { count: "exact", head: true }).in("status", ["verified", "paid"])),
    "payments.verifiedCount",
  );

  return { verifiedSum, pendingCount, failedCount, verifiedCount };
}

async function walletLiability() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return 0;
  const { data, error } = await supabase.rpc("admin_dashboard_wallet_liability");
  if (!error && data != null) return Number(data);
  if (error) console.warn("[admin-dashboard] wallet RPC unavailable; paginated fallback", error.message);
  return sumPaginated(
    (from, to) => supabase.from("reward_wallets").select("balance").range(from, to),
    (row) => Number(row.balance ?? 0),
    "reward_wallets",
  );
}

async function pendingPartnerCommission() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { amount: 0, available: true as const };

  const { data, error } = await supabase.rpc("admin_dashboard_partner_commission_pending");
  if (!error && data != null) return { amount: Number(data), available: true as const };
  if (error) console.warn("[admin-dashboard] commission RPC unavailable; paginated fallback", error.message);

  const apSum = await sumPaginated(
    (from, to) =>
      supabase
        .from("ap_commissions")
        .select("calculated_amount, status")
        .in("status", ["pending", "earned", "approved", "reserved"])
        .range(from, to),
    (row) => Number(row.calculated_amount ?? 0),
    "ap_commissions",
  );
  if (apSum > 0) return { amount: apSum, available: true as const };

  const legacy = await sumPaginated(
    (from, to) => supabase.from("commissions").select("amount, status").range(from, to),
    (row) => {
      const status = String(row.status ?? "").toLowerCase();
      if (["paid", "settled", "reversed", "cancelled"].includes(status)) return 0;
      return Number(row.amount ?? 0);
    },
    "commissions",
  );
  return { amount: legacy, available: true as const };
}

function metric(
  id: string,
  title: string,
  raw: number,
  previous: number,
  href: string,
  icon: DashboardMetric["icon"],
  options: { money?: boolean; increaseIsGood?: boolean } = {},
): DashboardMetric {
  const delta = formatDelta(raw, previous);
  return {
    id,
    title,
    raw,
    value: options.money ? formatInr(raw) : raw.toLocaleString("en-IN"),
    href,
    delta,
    increaseIsGood: options.increaseIsGood ?? true,
    icon,
  };
}

export async function getAdminDashboardPayload(range: AdminDateRange): Promise<AdminDashboardPayload> {
  const supabase = getSupabaseAdmin();
  const notes: string[] = [];

  if (!supabase) {
    return {
      range,
      metrics: [],
      charts: {
        applicationsTrend: [],
        revenueTrend: [],
        statusDistribution: [],
        topServices: [],
        partnerPerformance: null,
      },
      widgets: {
        recentApplications: [],
        needingAttention: [],
        failedPayments: [],
        pendingPartnerApprovals: [],
        recentCustomers: [],
        recentNotifications: [],
      },
      notes: ["Supabase admin client is not configured."],
      generatedAt: new Date().toISOString(),
    };
  }

  const [
    totalCustomers,
    newCustomers,
    prevCustomers,
    totalPartners,
    activePartners,
    totalApplications,
    periodApplications,
    prevPeriodApplications,
    pendingApplications,
    inProgressApplications,
    completedApplications,
    periodPayments,
    prevPeriodPayments,
    allTimePayments,
    walletOutstanding,
    commissionPending,
    recentAppsResult,
    attentionAppsResult,
    failedPaymentsResult,
    pendingPartnersResult,
    recentCustomersResult,
    notificationsResult,
    periodAppsForCharts,
    partnerAppsResult,
  ] = await Promise.all([
    headCount(supabase.from("customers").select("id", { count: "exact", head: true }), "customers.total"),
    headCount(
      supabase.from("customers").select("id", { count: "exact", head: true }).gte("created_at", range.fromIso).lt("created_at", range.toIso),
      "customers.period",
    ),
    headCount(
      supabase
        .from("customers")
        .select("id", { count: "exact", head: true })
        .gte("created_at", range.previousFromIso)
        .lt("created_at", range.previousToIso),
      "customers.prev",
    ),
    headCount(supabase.from("agency_partners").select("id", { count: "exact", head: true }), "partners.total"),
    headCount(supabase.from("agency_partners").select("id", { count: "exact", head: true }).eq("status", "active"), "partners.active"),
    headCount(supabase.from("applications").select("id", { count: "exact", head: true }), "apps.total"),
    headCount(
      supabase.from("applications").select("id", { count: "exact", head: true }).gte("created_at", range.fromIso).lt("created_at", range.toIso),
      "apps.period",
    ),
    headCount(
      supabase
        .from("applications")
        .select("id", { count: "exact", head: true })
        .gte("created_at", range.previousFromIso)
        .lt("created_at", range.previousToIso),
      "apps.prev",
    ),
    headCount(supabase.from("applications").select("id", { count: "exact", head: true }).in("status", PENDING_STATUSES), "apps.pending"),
    headCount(supabase.from("applications").select("id", { count: "exact", head: true }).in("status", IN_PROGRESS_STATUSES), "apps.progress"),
    headCount(supabase.from("applications").select("id", { count: "exact", head: true }).in("status", COMPLETED_STATUSES), "apps.completed"),
    paymentTotals(range.fromIso, range.toIso),
    paymentTotals(range.previousFromIso, range.previousToIso),
    paymentTotals(null, null),
    walletLiability(),
    pendingPartnerCommission(),
    supabase
      .from("applications")
      .select("id, service_name, customer_name, customer_mobile, customer_details, form_data, status, payment_status, created_at")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("applications")
      .select("id, service_name, status, payment_status, created_at, customer_details, form_data, customer_name")
      .in("status", [...PENDING_STATUSES, "documents_required", "payment_failed"])
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("payments")
      .select("id, application_id, amount, status, created_at")
      .in("status", ["failed", "cancelled", "canceled"])
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("agency_partners")
      .select("id, full_name, partner_code, status, kyc_status, created_at")
      .in("status", ["submitted", "under_review", "kyc_pending", "verified"])
      .order("created_at", { ascending: false })
      .limit(8),
    supabase.from("customers").select("id, name, mobile, email, created_at").order("created_at", { ascending: false }).limit(8),
    supabase.from("admin_notifications").select("id, title, body, created_at, href, read").order("created_at", { ascending: false }).limit(8),
    supabase
      .from("applications")
      .select("id, status, service_name, agency_partner_id, created_at")
      .gte("created_at", range.fromIso)
      .lt("created_at", range.toIso)
      .limit(5000),
    supabase
      .from("applications")
      .select("agency_partner_id")
      .not("agency_partner_id", "is", null)
      .gte("created_at", range.fromIso)
      .lt("created_at", range.toIso)
      .limit(5000),
  ]);

  let applicationsTrend: { label: string; applications: number }[] = [];
  let revenueTrend: { label: string; revenue: number }[] = [];

  const { data: appSeries, error: appSeriesError } = await supabase.rpc("admin_dashboard_application_series", {
    p_from: range.fromIso,
    p_to: range.toIso,
  });
  const { data: revSeries, error: revSeriesError } = await supabase.rpc("admin_dashboard_revenue_series", {
    p_from: range.fromIso,
    p_to: range.toIso,
  });

  if (!appSeriesError && Array.isArray(appSeries)) {
    applicationsTrend = appSeries.map((row: { day: string; applications: number }) => ({
      label: formatIstDayLabel(String(row.day)),
      applications: Number(row.applications ?? 0),
    }));
  } else {
    if (appSeriesError) notes.push("Application trend uses in-memory buckets until dashboard RPC migration is applied.");
    const buckets = new Map<string, number>();
    for (const row of (periodAppsForCharts.data ?? []) as Array<{ created_at: string }>) {
      const label = formatIstDayLabel(row.created_at);
      buckets.set(label, (buckets.get(label) ?? 0) + 1);
    }
    applicationsTrend = Array.from(buckets.entries()).map(([label, applications]) => ({ label, applications }));
  }

  if (!revSeriesError && Array.isArray(revSeries)) {
    revenueTrend = revSeries.map((row: { day: string; revenue: number }) => ({
      label: formatIstDayLabel(String(row.day)),
      revenue: Number(row.revenue ?? 0),
    }));
  } else if (revSeriesError) {
    notes.push("Revenue trend chart empty until dashboard RPC migration is applied (PostgREST aggregates are disabled).");
  }

  const statusDistribution = [
    { name: "Pending", value: pendingApplications },
    { name: "In progress", value: inProgressApplications },
    { name: "Completed", value: completedApplications },
  ].filter((s) => s.value > 0);

  const serviceCounts: Record<string, number> = {};
  for (const row of (periodAppsForCharts.data ?? []) as Array<{ service_name?: string }>) {
    const name = String(row.service_name ?? "Unknown").trim() || "Unknown";
    serviceCounts[name] = (serviceCounts[name] ?? 0) + 1;
  }
  const topServices = Object.entries(serviceCounts)
    .map(([service, count]) => ({ service, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  let partnerPerformance: { partner: string; applications: number }[] | null = null;
  const partnerIds = (partnerAppsResult.data ?? [])
    .map((row) => String((row as { agency_partner_id?: string }).agency_partner_id ?? ""))
    .filter(Boolean);
  if (partnerIds.length) {
    const counts: Record<string, number> = {};
    for (const id of partnerIds) counts[id] = (counts[id] ?? 0) + 1;
    const topIds = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    const { data: partners } = await supabase
      .from("agency_partners")
      .select("id, full_name, partner_code")
      .in(
        "id",
        topIds.map(([id]) => id),
      );
    const nameById = new Map(
      ((partners ?? []) as Array<{ id: string; full_name?: string; partner_code?: string }>).map((p) => [
        p.id,
        p.full_name || p.partner_code || p.id.slice(0, 8),
      ]),
    );
    partnerPerformance = topIds.map(([id, applications]) => ({
      partner: nameById.get(id) ?? id.slice(0, 8),
      applications,
    }));
  } else {
    notes.push("Digi Partner performance chart omitted — no agency_partner_id applications in this range.");
  }

  const metrics: DashboardMetric[] = [
    metric("total_customers", "Total Customers", totalCustomers, totalCustomers, "/admin/customers", "customers"),
    metric("new_customers", "New Customers", newCustomers, prevCustomers, "/admin/customers", "customers"),
    metric("total_partners", "Total Digi Partners", totalPartners, totalPartners, "/admin/agency-partners", "partners"),
    metric("active_partners", "Active Digi Partners", activePartners, activePartners, "/admin/agency-partners", "partners"),
    metric("total_applications", "Total Applications", totalApplications, totalApplications, "/admin/applications", "applications"),
    metric("period_applications", "Applications (period)", periodApplications, prevPeriodApplications, "/admin/applications", "applications"),
    metric("pending_applications", "Pending Applications", pendingApplications, pendingApplications, "/admin/applications", "pending", {
      increaseIsGood: false,
    }),
    metric("in_progress", "In-Progress Applications", inProgressApplications, inProgressApplications, "/admin/applications", "progress"),
    metric("completed", "Completed Applications", completedApplications, completedApplications, "/admin/applications", "completed"),
    metric("revenue_all", "Total Collected Revenue", allTimePayments.verifiedSum, allTimePayments.verifiedSum, "/admin/payments", "revenue", {
      money: true,
    }),
    metric("revenue_period", "Revenue (period)", periodPayments.verifiedSum, prevPeriodPayments.verifiedSum, "/admin/payments", "revenue", {
      money: true,
    }),
    metric("pending_payments", "Pending Payments", periodPayments.pendingCount, prevPeriodPayments.pendingCount, "/admin/payments", "pending", {
      increaseIsGood: false,
    }),
    metric("failed_payments", "Failed Payments", periodPayments.failedCount, prevPeriodPayments.failedCount, "/admin/payment-reconciliation", "failed", {
      increaseIsGood: false,
    }),
    metric("wallet", "Wallet Outstanding Liability", walletOutstanding, walletOutstanding, "/admin/wallet", "wallet", {
      money: true,
      increaseIsGood: false,
    }),
  ];

  if (commissionPending.available) {
    metrics.push(
      metric("partner_commission", "Pending Partner Commission", commissionPending.amount, commissionPending.amount, "/admin/commissions", "commission", {
        money: true,
        increaseIsGood: false,
      }),
    );
  }

  const recentApplications: DashboardWidgetItem[] = ((recentAppsResult.data ?? []) as Array<Record<string, unknown>>).map((app) => ({
    id: String(app.id),
    title: String(app.service_name ?? "Application"),
    subtitle: customerNameFromApplication(app),
    meta: `${String(app.status ?? "")} · ${String(app.payment_status ?? "")}`,
    href: `/admin/applications/${app.id}`,
  }));

  const needingAttention: DashboardWidgetItem[] = ((attentionAppsResult.data ?? []) as Array<Record<string, unknown>>).map((app) => ({
    id: String(app.id),
    title: String(app.service_name ?? "Application"),
    subtitle: customerNameFromApplication(app),
    meta: String(app.status ?? app.payment_status ?? ""),
    href: `/admin/applications/${app.id}`,
    tone: "warning",
  }));

  const failedPayments: DashboardWidgetItem[] = ((failedPaymentsResult.data ?? []) as Array<Record<string, unknown>>).map((pay) => ({
    id: String(pay.id),
    title: formatInr(Number(pay.amount ?? 0)),
    subtitle: pay.application_id ? `Application ${String(pay.application_id).slice(0, 8)}` : "Unlinked payment",
    meta: String(pay.status ?? "failed"),
    href: pay.application_id ? `/admin/applications/${String(pay.application_id)}` : "/admin/payment-reconciliation",
    tone: "danger",
  }));

  const pendingPartnerApprovals: DashboardWidgetItem[] = ((pendingPartnersResult.data ?? []) as Array<Record<string, unknown>>).map((p) => ({
    id: String(p.id),
    title: String(p.full_name ?? "Digi Partner"),
    subtitle: String(p.partner_code ?? ""),
    meta: `${String(p.status ?? "")} · KYC ${String(p.kyc_status ?? "")}`,
    href: `/admin/agency-partners/${p.id}`,
    tone: "warning",
  }));

  const recentCustomers: DashboardWidgetItem[] = ((recentCustomersResult.data ?? []) as Array<Record<string, unknown>>).map((c) => ({
    id: String(c.id),
    title: String(c.name ?? "Customer"),
    subtitle: String(c.mobile ?? c.email ?? ""),
    meta: c.created_at ? new Date(String(c.created_at)).toLocaleDateString("en-IN") : undefined,
    href: `/admin/customers/${c.id}`,
  }));

  let recentNotifications: DashboardWidgetItem[] = [];
  if (notificationsResult.error) {
    notes.push("Admin notifications widget empty — admin_notifications unavailable.");
  } else {
    recentNotifications = ((notificationsResult.data ?? []) as Array<Record<string, unknown>>).map((n) => ({
      id: String(n.id),
      title: String(n.title ?? "Notification"),
      subtitle: String(n.body ?? "").slice(0, 80),
      href: String(n.href ?? "/admin/notifications"),
      tone: n.read ? "default" : "warning",
    }));
  }

  return {
    range,
    metrics,
    charts: {
      applicationsTrend,
      revenueTrend,
      statusDistribution,
      topServices,
      partnerPerformance,
    },
    widgets: {
      recentApplications,
      needingAttention,
      failedPayments,
      pendingPartnerApprovals,
      recentCustomers,
      recentNotifications,
    },
    notes,
    generatedAt: new Date().toISOString(),
  };
}
