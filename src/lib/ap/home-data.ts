// ============================================================================
// DC Partner home — server data loader
//
// Fetches, then hands everything to the pure builders in home-analytics.ts.
// The arithmetic lives there so it can be tested; this file is plumbing.
// ============================================================================

import { getAgentAssignedApplications } from "@/lib/agent-data";
import { getAPApplications, getAPDashboardStats, getAgencyPartnerByUserId } from "@/lib/ap-data";
import {
  buildAnalytics,
  buildAttention,
  buildKpis,
  isPaid,
  isUnpaid,
  safeAmount,
  statusBucket,
  TREND_RANGE_DAYS,
  type AnalyticsApplication,
} from "@/lib/ap/home-analytics";
import {
  AP_PARTNER_TYPE_LABELS,
  canManagePartnerTeam,
  normalizePartnerType,
  type DigiPartnerType,
} from "@/lib/ap/partner-type";
import { getActivePartnerDashboardBanners } from "@/lib/ap/partner-banners";
import { formatINR } from "@/lib/ap/format";
import type {
  PartnerCollectionCommission,
  PartnerHomeIdentity,
  PartnerHomePayload,
  PartnerOfficeWorkSummary,
  PartnerPendingWorkItem,
  PartnerRecentApplicationItem,
  PartnerTeamSummary,
  PartnerWorkQueueGroup,
} from "@/lib/ap/home-types";
import { getCustomerMobile, getCustomerName } from "@/lib/crm";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * How many applications the analytics read.
 *
 * The trend only needs a fortnight, but the status split and the service
 * ranking describe the whole book of work, so this is wider than the 50 the
 * old dashboard pulled. Capped so a partner with thousands of rows still gets
 * a single bounded query.
 */
const ANALYTICS_APPLICATION_LIMIT = 400;

function startOfDayIso(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString();
}

function startOfMonthIso(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1).toISOString();
}

function isOpenStatus(status: string) {
  const bucket = statusBucket(status);
  return bucket !== "completed" && bucket !== "closed";
}

function needsDocuments(status: string) {
  return statusBucket(status) === "action_needed";
}

/** Narrows an application row to just what the analytics need. */
function toAnalyticsApp(app: {
  id: string;
  amount: number;
  status: string;
  payment_status?: string | null;
  service_name?: string | null;
  created_at: string;
  updated_at?: string | null;
}): AnalyticsApplication {
  return {
    id: app.id,
    amount: app.amount,
    status: app.status,
    payment_status: app.payment_status ?? null,
    service_name: app.service_name ?? null,
    created_at: app.created_at,
    updated_at: app.updated_at ?? null,
  };
}

async function loadTeamPartnerIds(managerUserId: string): Promise<string[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data } = await supabase
    .from("agency_partners")
    .select("id, status")
    .eq("created_by_user_id", managerUserId);

  return ((data ?? []) as { id: string; status: string }[]).map((row) => row.id);
}

async function loadTeamSummary(managerUserId: string): Promise<PartnerTeamSummary> {
  const supabase = getSupabaseAdmin();
  const empty: PartnerTeamSummary = {
    totalMembers: 0,
    activeMembers: 0,
    teamApplications: 0,
    teamCollection: 0,
    teamCommission: 0,
  };
  if (!supabase) return empty;

  const { data: members } = await supabase
    .from("agency_partners")
    .select("id, status")
    .eq("created_by_user_id", managerUserId);

  const team = (members ?? []) as { id: string; status: string }[];
  if (!team.length) return empty;

  const teamIds = team.map((m) => m.id);

  const [appsResult, commissionsResult] = await Promise.all([
    supabase.from("applications").select("id, amount, payment_status, status").in("agency_partner_id", teamIds),
    supabase.from("ap_commissions").select("calculated_amount, status").in("agency_partner_id", teamIds),
  ]);

  const apps = (appsResult.data ?? []) as {
    id: string;
    amount: number;
    payment_status: string | null;
    status: string;
  }[];
  const commissions = (commissionsResult.data ?? []) as { calculated_amount: number; status: string }[];

  return {
    totalMembers: team.length,
    activeMembers: team.filter((m) => m.status === "active").length,
    teamApplications: apps.length,
    teamCollection: apps.filter((a) => isPaid(a.payment_status)).reduce((sum, a) => sum + safeAmount(a.amount), 0),
    teamCommission: commissions.reduce((sum, c) => sum + safeAmount(c.calculated_amount), 0),
  };
}

async function loadTeamFinance(
  managerUserId: string,
): Promise<
  Pick<
    PartnerCollectionCommission,
    "teamCollectedToday" | "teamMonthCollection" | "teamCommissionEarned" | "teamCommissionPending"
  >
> {
  const supabase = getSupabaseAdmin();
  const empty = {
    teamCollectedToday: 0,
    teamMonthCollection: 0,
    teamCommissionEarned: 0,
    teamCommissionPending: 0,
  };
  if (!supabase) return empty;

  const teamIds = await loadTeamPartnerIds(managerUserId);
  if (!teamIds.length) return empty;

  const today = startOfDayIso();
  const month = startOfMonthIso();

  const [appsResult, commissionsResult] = await Promise.all([
    supabase
      .from("applications")
      .select("amount, payment_status, updated_at, created_at")
      .in("agency_partner_id", teamIds),
    supabase.from("ap_commissions").select("calculated_amount, status, created_at").in("agency_partner_id", teamIds),
  ]);

  const apps = (appsResult.data ?? []) as {
    amount: number;
    payment_status: string | null;
    updated_at: string | null;
    created_at: string;
  }[];
  const commissions = (commissionsResult.data ?? []) as {
    calculated_amount: number;
    status: string;
    created_at: string;
  }[];

  const paidApps = apps.filter((a) => isPaid(a.payment_status));
  const paidAt = (a: (typeof apps)[number]) => a.updated_at || a.created_at;

  return {
    teamCollectedToday: paidApps
      .filter((a) => paidAt(a) >= today)
      .reduce((sum, a) => sum + safeAmount(a.amount), 0),
    teamMonthCollection: paidApps
      .filter((a) => paidAt(a) >= month)
      .reduce((sum, a) => sum + safeAmount(a.amount), 0),
    teamCommissionEarned: commissions.reduce((sum, c) => sum + safeAmount(c.calculated_amount), 0),
    teamCommissionPending: commissions
      .filter((c) => ["pending", "earned"].includes(c.status))
      .reduce((sum, c) => sum + safeAmount(c.calculated_amount), 0),
  };
}

/**
 * Pending work, split into the three tabs the queue renders.
 *
 * An application lands in exactly one tab — documents first, then payment,
 * then processing — so the same row is never counted twice across the tabs.
 */
function buildWorkQueue(
  partnerType: DigiPartnerType,
  apps: Awaited<ReturnType<typeof getAPApplications>>,
  assignedIds: Set<string>,
): PartnerWorkQueueGroup[] {
  const documents: PartnerPendingWorkItem[] = [];
  const payments: PartnerPendingWorkItem[] = [];
  const processing: PartnerPendingWorkItem[] = [];

  for (const app of apps) {
    if (!isOpenStatus(app.status)) continue;

    const customer = getCustomerName(app) || "Customer";
    const service = app.service_name || "Service";

    if (needsDocuments(app.status)) {
      if (documents.length < 8) {
        documents.push({
          id: `docs-${app.id}`,
          title: customer,
          subtitle: `${service} · documents needed`,
          statusLabel: app.status,
          ctaLabel: "Upload documents",
          href: `/ap/applications/${app.id}`,
        });
      }
      continue;
    }

    if (isUnpaid(app.payment_status)) {
      if (payments.length < 8) {
        payments.push({
          id: `pay-${app.id}`,
          title: customer,
          subtitle: `${service} · ${formatINR(app.amount)} pending`,
          statusLabel: app.payment_status || "pending",
          ctaLabel: "Collect payment",
          href: "/ap/payments/collect",
        });
      }
      continue;
    }

    // Office staff only queue what is actually theirs to work.
    if (partnerType === "office_staff" && !assignedIds.has(app.id)) continue;

    if (processing.length < 8) {
      processing.push({
        id: `work-${app.id}`,
        title: customer,
        subtitle: service,
        statusLabel: app.status,
        ctaLabel: partnerType === "office_staff" ? "Process now" : "Open",
        href: `/ap/applications/${app.id}`,
      });
    }
  }

  return [
    { key: "documents", label: "Documents", items: documents },
    { key: "payments", label: "Payments", items: payments },
    { key: "processing", label: "In progress", items: processing },
  ];
}

function buildRecentApplications(
  apps: Awaited<ReturnType<typeof getAPApplications>>,
  partnerType: DigiPartnerType,
): PartnerRecentApplicationItem[] {
  return apps.slice(0, 8).map((app) => {
    const actions: Array<{ label: string; href: string }> = [
      { label: "View", href: `/ap/applications/${app.id}` },
    ];

    if (partnerType !== "office_staff") {
      if (isOpenStatus(app.status)) {
        actions.push({ label: "Upload document", href: `/ap/applications/${app.id}` });
      }
      if (isUnpaid(app.payment_status)) {
        actions.push({ label: "Collect payment", href: "/ap/payments/collect" });
      }
    } else if (isOpenStatus(app.status)) {
      actions.push({ label: "Process", href: `/ap/applications/${app.id}` });
    }

    return {
      id: app.id,
      customerName: getCustomerName(app) || "Customer",
      serviceName: app.service_name || "Service",
      status: app.status,
      updatedAt: app.updated_at || app.created_at,
      paymentStatus: app.payment_status ?? null,
      actions,
    };
  });
}

export async function getPartnerHomePayload(userId: string): Promise<PartnerHomePayload | null> {
  const ap = await getAgencyPartnerByUserId(userId);
  if (!ap) return null;

  const partnerType = normalizePartnerType(ap.partner_type) ?? "business_partner";
  const manageTeam = canManagePartnerTeam(partnerType);

  const [stats, apps, banners, assigned] = await Promise.all([
    getAPDashboardStats(ap.id),
    getAPApplications(ap.id, ANALYTICS_APPLICATION_LIMIT),
    getActivePartnerDashboardBanners(partnerType),
    partnerType === "office_staff" ? getAgentAssignedApplications(userId) : Promise.resolve([]),
  ]);

  const now = new Date();
  const today = startOfDayIso(now);
  const month = startOfMonthIso(now);

  const analyticsApps = apps.map(toAnalyticsApp);
  const analytics = buildAnalytics(analyticsApps, { days: TREND_RANGE_DAYS, now });
  const attention = buildAttention(analyticsApps, { now });

  const paidApps = apps.filter((a) => isPaid(a.payment_status));
  const settledAt = (a: (typeof apps)[number]) => a.updated_at || a.created_at;

  const collectedToday = paidApps
    .filter((a) => settledAt(a) >= today)
    .reduce((sum, a) => sum + safeAmount(a.amount), 0);
  const monthCollection = paidApps
    .filter((a) => settledAt(a) >= month)
    .reduce((sum, a) => sum + safeAmount(a.amount), 0);
  const pendingCollection = apps
    .filter((a) => isUnpaid(a.payment_status) && isOpenStatus(a.status))
    .reduce((sum, a) => sum + safeAmount(a.amount), 0);
  const pendingPayments = apps.filter((a) => isUnpaid(a.payment_status) && isOpenStatus(a.status)).length;

  // Yesterday, for the KPI comparison — the trend already holds the day's total.
  const yesterdayCollection = analytics.trend.at(-2)?.collection ?? 0;

  const hasCommissionScheme =
    safeAmount(ap.commission_value) > 0 ||
    safeAmount(ap.commission_rate) > 0 ||
    stats.commissionEarned > 0 ||
    stats.commissionPending > 0;

  let teamSummary: PartnerTeamSummary | null = null;
  let teamFinance: Awaited<ReturnType<typeof loadTeamFinance>> | null = null;
  if (manageTeam) {
    [teamSummary, teamFinance] = await Promise.all([loadTeamSummary(userId), loadTeamFinance(userId)]);
  }

  const collection: PartnerCollectionCommission = {
    collectedToday,
    monthCollection,
    pendingCollection,
    commissionEarned: stats.commissionEarned,
    commissionPending: stats.commissionPending,
    hasCommissionScheme,
    ...(teamFinance ?? {}),
  };

  const kpis = buildKpis({
    trend: analytics.trend,
    todayApplications: stats.todayApplications,
    yesterdayApplications: stats.yesterdayApplications,
    todayCollection: collectedToday,
    yesterdayCollection,
    pendingApplications: stats.pendingApplications,
    pendingPayments,
    pendingCollection,
    commissionEarned: stats.commissionEarned,
    commissionPending: stats.commissionPending,
  });

  const identity: PartnerHomeIdentity = {
    name: ap.business_name?.trim() || ap.full_name?.trim() || "DC Partner",
    partnerCode: ap.partner_code ?? null,
    partnerTypeLabel: AP_PARTNER_TYPE_LABELS[partnerType],
    tierName: ap.tier?.name ?? null,
    heroLabel: "Collected today",
    heroValue: formatINR(collectedToday),
    heroCaption: `${formatINR(monthCollection)} this month`,
  };

  let officeWork: PartnerOfficeWorkSummary | null = null;
  if (partnerType === "office_staff") {
    officeWork = {
      applicationsToProcess: assigned.length,
      // Support is a contact desk, not a ticket table — there is nothing to count yet.
      supportQueueCount: 0,
      recentOfflineInvoices: 0,
      assignedWorkCount: assigned.length,
    };
  }

  const assignedIds = new Set(assigned.map((a) => a.id));
  const workQueue = buildWorkQueue(partnerType, apps, assignedIds);
  const recentApplications = buildRecentApplications(
    partnerType === "office_staff" && assigned.length ? assigned.slice(0, 8) : apps,
    partnerType,
  );

  const recentCustomers = apps.slice(0, 6).map((app) => ({
    id: app.id,
    name: getCustomerName(app) || "Customer",
    mobile: getCustomerMobile(app) || "—",
    href: `/ap/applications/${app.id}`,
  }));

  return {
    partnerType,
    canManageTeam: manageTeam,
    identity,
    banners,
    attention,
    kpis,
    analytics,
    workQueue,
    recentApplications,
    collection,
    teamSummary,
    officeWork,
    recentCustomers,
  };
}
