/**
 * Admin dashboard real-data loader (Phase C).
 * Financial totals: prefer service_role RPCs; fallback to paginated sums (never .limit(10000)).
 */

/* eslint-disable @typescript-eslint/no-explicit-any -- Supabase filter builders are chained dynamically */

import { formatDelta, formatInr, formatIstDayLabel, istParts, istMidnightUtcIso, type AdminDateRange } from "@/lib/admin/date-range";
import { resolveCrmNotificationDeliveryModeDetailed } from "@/lib/automation/delivery-mode";
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

export type DashboardInsight = {
  id: string;
  title: string;
  detail: string;
  href?: string;
  kind: "deterministic" | "config";
};

export type AdminDashboardPayload = {
  range: AdminDateRange;
  metrics: DashboardMetric[];
  today: {
    walkIns: number;
    newLeads: number;
    applicationsCreated: number;
    followUpsDue: number;
    documentsPending: number;
    paymentsDue: number;
  };
  actionRequired: {
    unassignedApplications: number;
    overdueFollowUps: number;
    failedOrConfigMessages: number;
    pendingDocuments: number;
    paymentsDue: number;
    items: DashboardWidgetItem[];
  };
  /** True when crm_ops_alerts could not be read — UI shows a safe non-technical notice. */
  alertsSourceError: boolean;
  charts: {
    applicationsTrend: { label: string; applications: number }[];
    revenueTrend: { label: string; revenue: number }[];
    statusDistribution: { name: string; value: number }[];
    funnel: { name: string; short: string; value: number }[];
    topServices: { service: string; count: number }[];
    partnerPerformance: { partner: string; applications: number }[] | null;
  };
  workload: {
    partnersActive: number;
    partnerAppsInRange: number;
    unassignedApplications: number;
    pendingPartnerApprovals: number;
  };
  health: {
    messagingModeLabel: string;
    messagingModeDetail: string;
    openOpsAlerts: number;
    queuedMessages: number;
    configRequiredMessages: number;
    automationPending: number;
    summariesStatus: string;
  };
  insights: DashboardInsight[];
  widgets: {
    recentApplications: DashboardWidgetItem[];
    needingAttention: DashboardWidgetItem[];
    failedPayments: DashboardWidgetItem[];
    pendingPartnerApprovals: DashboardWidgetItem[];
    recentCustomers: DashboardWidgetItem[];
    recentNotifications: DashboardWidgetItem[];
    recentActivity: DashboardWidgetItem[];
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
      today: {
        walkIns: 0,
        newLeads: 0,
        applicationsCreated: 0,
        followUpsDue: 0,
        documentsPending: 0,
        paymentsDue: 0,
      },
      actionRequired: {
        unassignedApplications: 0,
        overdueFollowUps: 0,
        failedOrConfigMessages: 0,
        pendingDocuments: 0,
        paymentsDue: 0,
        items: [],
      },
      alertsSourceError: false,
      charts: {
        applicationsTrend: [],
        revenueTrend: [],
        statusDistribution: [],
        funnel: [],
        topServices: [],
        partnerPerformance: null,
      },
      workload: {
        partnersActive: 0,
        partnerAppsInRange: 0,
        unassignedApplications: 0,
        pendingPartnerApprovals: 0,
      },
      health: {
        messagingModeLabel: "Disabled",
        messagingModeDetail: "CRM messaging fail-closed until configured.",
        openOpsAlerts: 0,
        queuedMessages: 0,
        configRequiredMessages: 0,
        automationPending: 0,
        summariesStatus: "unavailable",
      },
      insights: [],
      widgets: {
        recentApplications: [],
        needingAttention: [],
        failedPayments: [],
        pendingPartnerApprovals: [],
        recentCustomers: [],
        recentNotifications: [],
        recentActivity: [],
      },
      notes: ["Supabase admin client is not configured."],
      generatedAt: new Date().toISOString(),
    };
  }

  const nowParts = istParts();
  const todayFromIso = istMidnightUtcIso(nowParts.year, nowParts.month, nowParts.day);
  const tomorrow = (() => {
    const utc = Date.UTC(nowParts.year, nowParts.month - 1, nowParts.day) + 86400000;
    const d = new Date(utc);
    return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
  })();
  const todayToIso = istMidnightUtcIso(tomorrow.year, tomorrow.month, tomorrow.day);
  const delivery = resolveCrmNotificationDeliveryModeDetailed();

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
    opsAlertsResult,
    periodAppsForCharts,
    partnerAppsResult,
    todayWalkIns,
    todayLeads,
    todayApps,
    followUpsDueToday,
    overdueFollowUps,
    documentsPending,
    paymentsDue,
    unassignedApplications,
    queuedMessages,
    configRequiredMessages,
    failedMessages,
    automationPending,
    dailySummaryResult,
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
      .select("id, service_name, customer_name, customer_details, form_data, status, payment_status, created_at")
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
    supabase.from("customers").select("id, name, created_at").order("created_at", { ascending: false }).limit(8),
    supabase
      .from("crm_ops_alerts")
      .select("id, title, severity, status, created_at, safe_summary")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(8),
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
    headCount(
      supabase
        .from("customers")
        .select("id", { count: "exact", head: true })
        .eq("source", "admin_walk_in")
        .gte("created_at", todayFromIso)
        .lt("created_at", todayToIso),
      "today.walkins",
    ),
    headCount(
      supabase.from("leads").select("id", { count: "exact", head: true }).gte("created_at", todayFromIso).lt("created_at", todayToIso),
      "today.leads",
    ),
    headCount(
      supabase.from("applications").select("id", { count: "exact", head: true }).gte("created_at", todayFromIso).lt("created_at", todayToIso),
      "today.apps",
    ),
    headCount(
      supabase
        .from("lead_follow_ups")
        .select("id", { count: "exact", head: true })
        .eq("status", "scheduled")
        .gte("scheduled_at", todayFromIso)
        .lt("scheduled_at", todayToIso),
      "today.followups",
    ),
    headCount(
      supabase
        .from("lead_follow_ups")
        .select("id", { count: "exact", head: true })
        .eq("status", "scheduled")
        .lt("scheduled_at", todayFromIso),
      "followups.overdue",
    ),
    headCount(
      supabase.from("applications").select("id", { count: "exact", head: true }).in("status", ["documents_required", "document_pending"]),
      "docs.pending",
    ),
    headCount(
      supabase.from("applications").select("id", { count: "exact", head: true }).in("status", ["payment_pending", "pending"]),
      "payments.due",
    ),
    headCount(
      supabase
        .from("applications")
        .select("id", { count: "exact", head: true })
        .is("assigned_agent_id", null)
        .is("agent_id", null)
        .not("status", "in", '("completed","approved","cancelled","canceled")'),
      "apps.unassigned",
    ),
    headCount(supabase.from("whatsapp_messages").select("id", { count: "exact", head: true }).in("status", ["queued", "retryable"]), "wa.queued"),
    headCount(
      supabase.from("whatsapp_messages").select("id", { count: "exact", head: true }).eq("status", "configuration_required"),
      "wa.config",
    ),
    headCount(supabase.from("whatsapp_messages").select("id", { count: "exact", head: true }).eq("status", "failed"), "wa.failed"),
    headCount(supabase.from("crm_automation_events").select("id", { count: "exact", head: true }).eq("status", "pending"), "auto.pending"),
    supabase
      .from("crm_daily_summaries")
      .select("business_date, delivery_status")
      .order("business_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
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

  const funnel = [
    { name: "Leads", short: "Leads", value: todayLeads },
    { name: "Applications", short: "Apps", value: todayApps },
    { name: "In progress", short: "Progress", value: inProgressApplications },
    { name: "Pending", short: "Pending", value: pendingApplications },
    { name: "Done", short: "Done", value: completedApplications },
  ];

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
      // Partner commissions live in ap_commissions and only credit a partner's
      // wallet when approved through /admin/ap-commissions. The legacy
      // /admin/commissions screen drives the separate `commissions` table and
      // never touches a wallet, so pointing this tile there sent admins to
      // approve in a place where the money never moved.
      metric("partner_commission", "Pending Partner Commission", commissionPending.amount, commissionPending.amount, "/admin/ap-commissions", "commission", {
        money: true,
        increaseIsGood: false,
      }),
    );
  }

  const recentApplications: DashboardWidgetItem[] = ((recentAppsResult.data ?? []) as Array<Record<string, unknown>>).map((app) => ({
    id: String(app.id),
    title: String(app.service_name ?? "Application"),
    subtitle: String(app.status ?? ""),
    meta: String(app.payment_status ?? ""),
    href: `/admin/applications/${app.id}`,
  }));

  const needingAttention: DashboardWidgetItem[] = ((attentionAppsResult.data ?? []) as Array<Record<string, unknown>>).map((app) => ({
    id: String(app.id),
    title: String(app.service_name ?? "Application"),
    subtitle: String(app.status ?? app.payment_status ?? ""),
    meta: "Needs attention",
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
    title: String(p.partner_code ?? "Digi Partner"),
    subtitle: `${String(p.status ?? "")} · KYC ${String(p.kyc_status ?? "")}`,
    meta: "Approval queue",
    href: `/admin/agency-partners/${p.id}`,
    tone: "warning",
  }));

  const recentCustomers: DashboardWidgetItem[] = ((recentCustomersResult.data ?? []) as Array<Record<string, unknown>>).map((c) => ({
    id: String(c.id),
    title: "Customer record",
    subtitle: c.created_at ? new Date(String(c.created_at)).toLocaleDateString("en-IN") : "Recent",
    href: `/admin/customers/${c.id}`,
  }));

  // Prefer canonical ops alerts. Do not surface internal admin_notifications schema issues to the owner.
  let recentNotifications: DashboardWidgetItem[] = [];
  let openOpsAlerts = 0;
  let alertsSourceError = false;
  if (opsAlertsResult.error) {
    alertsSourceError = true;
    console.error("[admin-dashboard] crm_ops_alerts unavailable", { error: opsAlertsResult.error.message });
  } else {
    const rows = (opsAlertsResult.data ?? []) as Array<Record<string, unknown>>;
    openOpsAlerts = rows.length;
    recentNotifications = rows.map((n) => ({
      id: String(n.id),
      title: String(n.title ?? "Ops alert"),
      subtitle: String(n.safe_summary ?? n.severity ?? "open").slice(0, 100),
      meta: String(n.severity ?? "open"),
      href: "/admin/automation",
      tone: String(n.severity ?? "").toLowerCase() === "critical" ? "danger" : "warning",
    }));
  }

  const failedOrConfigMessages = configRequiredMessages + failedMessages;
  const actionItems: DashboardWidgetItem[] = [
    {
      id: "unassigned",
      title: "Unassigned applications",
      subtitle: "Assign work queue",
      meta: String(unassignedApplications),
      href: "/admin/applications?agent=unassigned",
      tone: unassignedApplications > 0 ? "warning" : undefined,
    },
    {
      id: "overdue-fu",
      title: "Overdue follow-ups",
      subtitle: "Lead follow-up backlog",
      meta: String(overdueFollowUps),
      href: "/admin/leads",
      tone: overdueFollowUps > 0 ? "danger" : undefined,
    },
    {
      id: "docs",
      title: "Pending documents",
      subtitle: "Customer document queue",
      meta: String(documentsPending),
      href: "/admin/applications",
      tone: documentsPending > 0 ? "warning" : undefined,
    },
    {
      id: "payments-due",
      title: "Payments due",
      subtitle: "Payment follow-up",
      meta: String(paymentsDue),
      href: "/admin/payments",
      tone: paymentsDue > 0 ? "warning" : undefined,
    },
    {
      id: "msg-fail",
      title: "Failed / config-required messages",
      subtitle: "Communications ops",
      meta: String(failedOrConfigMessages),
      href: "/admin/communications",
      tone: failedOrConfigMessages > 0 ? "danger" : undefined,
    },
  ];

  const recentActivity: DashboardWidgetItem[] = [
    ...recentApplications.slice(0, 4).map((item) => ({ ...item, meta: item.meta ? `Application · ${item.meta}` : "Application" })),
    ...pendingPartnerApprovals.slice(0, 2).map((item) => ({ ...item, meta: "Partner" })),
    ...recentNotifications.slice(0, 2).map((item) => ({ ...item, meta: "Alert" })),
  ].slice(0, 8);

  const messagingModeLabel =
    delivery.mode === "disabled" ? "Disabled" : delivery.mode === "queue" ? "Queue" : delivery.mode === "direct" ? "Direct" : "Disabled";
  const messagingModeDetail =
    delivery.reason === "missing" || delivery.reason === "blank" || delivery.reason === "unknown"
      ? "CRM messaging fail-closed (configuration required). OTP path is separate."
      : delivery.mode === "disabled"
        ? "CRM non-OTP messaging is explicitly disabled."
        : `CRM delivery mode: ${delivery.mode}.`;

  const summaryStatus =
    dailySummaryResult.error
      ? "unavailable"
      : String((dailySummaryResult.data as { delivery_status?: string } | null)?.delivery_status ?? "none");

  const insights: DashboardInsight[] = [];
  if (unassignedApplications > 0) {
    insights.push({
      id: "insight-unassigned",
      title: "Assignment backlog",
      detail: `${unassignedApplications.toLocaleString("en-IN")} applications lack an assignee.`,
      href: "/admin/applications?agent=unassigned",
      kind: "deterministic",
    });
  }
  if (overdueFollowUps > 0) {
    insights.push({
      id: "insight-followups",
      title: "Follow-ups overdue",
      detail: `${overdueFollowUps.toLocaleString("en-IN")} scheduled lead follow-ups are past due.`,
      href: "/admin/leads",
      kind: "deterministic",
    });
  }
  if (periodPayments.failedCount > 0) {
    insights.push({
      id: "insight-payments",
      title: "Failed payments in range",
      detail: `${periodPayments.failedCount.toLocaleString("en-IN")} failed payments need reconciliation review.`,
      href: "/admin/payment-reconciliation",
      kind: "deterministic",
    });
  }
  if (topServices[0]) {
    insights.push({
      id: "insight-service",
      title: "Top service this period",
      detail: `${topServices[0].service} leads with ${topServices[0].count.toLocaleString("en-IN")} applications.`,
      href: "/admin/applications",
      kind: "deterministic",
    });
  }
  insights.push({
    id: "insight-ai",
    title: "Generative AI insights",
    detail: "Disabled / configuration required — only deterministic counts are shown until AI is enabled.",
    href: "/admin/automation",
    kind: "config",
  });

  return {
    range,
    metrics,
    today: {
      walkIns: todayWalkIns,
      newLeads: todayLeads,
      applicationsCreated: todayApps,
      followUpsDue: followUpsDueToday,
      documentsPending,
      paymentsDue,
    },
    actionRequired: {
      unassignedApplications,
      overdueFollowUps,
      failedOrConfigMessages,
      pendingDocuments: documentsPending,
      paymentsDue,
      items: actionItems,
    },
    alertsSourceError,
    charts: {
      applicationsTrend,
      revenueTrend,
      statusDistribution,
      funnel,
      topServices,
      partnerPerformance,
    },
    workload: {
      partnersActive: activePartners,
      partnerAppsInRange: partnerIds.length,
      unassignedApplications,
      pendingPartnerApprovals: pendingPartnerApprovals.length,
    },
    health: {
      messagingModeLabel,
      messagingModeDetail,
      openOpsAlerts,
      queuedMessages,
      configRequiredMessages,
      automationPending,
      summariesStatus: summaryStatus,
    },
    insights,
    widgets: {
      recentApplications,
      needingAttention,
      failedPayments,
      pendingPartnerApprovals,
      recentCustomers,
      recentNotifications,
      recentActivity,
    },
    notes,
    generatedAt: new Date().toISOString(),
  };
}
