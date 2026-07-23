// ============================================================================
// Digi Partner home — server data loader
// ============================================================================

import { getAgentAssignedApplications } from "@/lib/agent-data";
import { getAPApplications, getAPDashboardStats, getAgencyPartnerByUserId } from "@/lib/ap-data";
import { canManagePartnerTeam, normalizePartnerType, type DigiPartnerType } from "@/lib/ap/partner-type";
import { getActivePartnerDashboardBanners } from "@/lib/ap/partner-banners";
import { formatINR } from "@/lib/ap/format";
import type {
  PartnerCollectionCommission,
  PartnerHomePayload,
  PartnerOfficeWorkSummary,
  PartnerOverviewCard,
  PartnerPendingWorkItem,
  PartnerRecentApplicationItem,
  PartnerTeamSummary,
} from "@/lib/ap/home-types";
import { getCustomerMobile, getCustomerName } from "@/lib/crm";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

function safeNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function isPendingAppStatus(status: string) {
  return !["completed", "rejected", "cancelled"].includes(status);
}

function isUnpaid(paymentStatus: string | null | undefined) {
  const s = String(paymentStatus ?? "pending").toLowerCase();
  return s === "pending" || s === "unpaid" || s === "failed" || s === "";
}

function isPaid(paymentStatus: string | null | undefined) {
  const s = String(paymentStatus ?? "").toLowerCase();
  return s === "paid" || s === "success" || s === "completed" || s === "captured";
}

function startOfDayIso(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString();
}

function startOfMonthIso(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1).toISOString();
}

function needsDocuments(status: string) {
  const s = status.toLowerCase();
  return s.includes("document") || s === "pending" || s === "submitted" || s === "under_review" || s === "resubmit_required";
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
    teamCollection: apps.filter((a) => isPaid(a.payment_status)).reduce((sum, a) => sum + safeNumber(a.amount), 0),
    teamCommission: commissions.reduce((sum, c) => sum + safeNumber(c.calculated_amount), 0),
  };
}

async function loadTeamFinance(
  managerUserId: string,
): Promise<Pick<PartnerCollectionCommission, "teamCollectedToday" | "teamMonthCollection" | "teamCommissionEarned" | "teamCommissionPending">> {
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
      .reduce((sum, a) => sum + safeNumber(a.amount), 0),
    teamMonthCollection: paidApps
      .filter((a) => paidAt(a) >= month)
      .reduce((sum, a) => sum + safeNumber(a.amount), 0),
    teamCommissionEarned: commissions.reduce((sum, c) => sum + safeNumber(c.calculated_amount), 0),
    teamCommissionPending: commissions
      .filter((c) => ["pending", "earned"].includes(c.status))
      .reduce((sum, c) => sum + safeNumber(c.calculated_amount), 0),
  };
}

function buildStandardOverview(stats: Awaited<ReturnType<typeof getAPDashboardStats>>, apps: Awaited<ReturnType<typeof getAPApplications>>): PartnerOverviewCard[] {
  const pendingPayments = apps.filter((a) => isUnpaid(a.payment_status)).length;
  const today = startOfDayIso();
  const todayCollection = apps
    .filter((a) => isPaid(a.payment_status) && (a.updated_at || a.created_at) >= today)
    .reduce((sum, a) => sum + safeNumber(a.amount), 0);

  return [
    { key: "today-apps", label: "Today Applications", value: String(stats.todayApplications), href: "/ap/applications" },
    { key: "pending-apps", label: "Pending Applications", value: String(stats.pendingApplications), href: "/ap/applications", tone: "pending" },
    { key: "completed-apps", label: "Completed Applications", value: String(stats.completedApplications), href: "/ap/applications", tone: "success" },
    { key: "pending-payments", label: "Pending Payments", value: String(pendingPayments), href: "/ap/payments/collect", tone: "pending" },
    { key: "today-collection", label: "Today Collection", value: formatINR(todayCollection), href: "/ap/payments/collect", tone: "success" },
    { key: "total-commission", label: "Total Commission", value: formatINR(stats.commissionEarned), href: "/ap/commissions" },
  ];
}

function buildCompanyOverview(
  stats: Awaited<ReturnType<typeof getAPDashboardStats>>,
  team: PartnerTeamSummary,
): PartnerOverviewCard[] {
  return [
    { key: "own-apps", label: "Own Applications", value: String(stats.totalApplications), href: "/ap/applications" },
    { key: "team-apps", label: "Team Applications", value: String(team.teamApplications), href: "/ap/team" },
    { key: "pending-apps", label: "Pending Applications", value: String(stats.pendingApplications), href: "/ap/applications", tone: "pending" },
    { key: "team-collection", label: "Team Collection", value: formatINR(team.teamCollection), href: "/ap/payments/collect", tone: "success" },
    { key: "own-commission", label: "Own Commission", value: formatINR(stats.commissionEarned), href: "/ap/commissions" },
    { key: "team-commission", label: "Team Commission", value: formatINR(team.teamCommission), href: "/ap/commissions" },
  ];
}

function buildOfficeOverview(
  assignedCount: number,
  docsPending: number,
  supportCount: number,
  offlineInvoiceCount: number,
  todayCollection: number,
  commissionLabel: string,
): PartnerOverviewCard[] {
  return [
    { key: "process", label: "Applications to Process", value: String(assignedCount), href: "/ap/assigned-work", tone: "pending" },
    { key: "docs", label: "Documents Pending", value: String(docsPending), href: "/ap/applications", tone: "pending" },
    { key: "support", label: "Support Requests", value: String(supportCount), href: "/ap/support" },
    { key: "offline", label: "Offline Invoices", value: String(offlineInvoiceCount), href: "/ap/invoices/offline" },
    { key: "today-collection", label: "Today Collection", value: formatINR(todayCollection), href: "/ap/payments/collect", tone: "success" },
    { key: "commission", label: "Commission or Bonus", value: commissionLabel, href: "/ap/commissions" },
  ];
}

function buildPendingWork(
  partnerType: DigiPartnerType,
  apps: Awaited<ReturnType<typeof getAPApplications>>,
  assignedIds: Set<string>,
): PartnerPendingWorkItem[] {
  const items: PartnerPendingWorkItem[] = [];

  for (const app of apps) {
    if (items.length >= 6) break;
    const customer = getCustomerName(app) || "Customer";
    const paymentStatus = app.payment_status ?? null;

    if (partnerType === "office_staff") {
      if (!assignedIds.has(app.id) && !isPendingAppStatus(app.status)) continue;
      if (assignedIds.has(app.id) || needsDocuments(app.status)) {
        items.push({
          id: `process-${app.id}`,
          title: customer,
          subtitle: app.service_name || "Application",
          statusLabel: app.status,
          ctaLabel: "Process Now",
          href: `/ap/applications/${app.id}`,
        });
      }
      continue;
    }

    if (needsDocuments(app.status) && isPendingAppStatus(app.status)) {
      items.push({
        id: `docs-${app.id}`,
        title: customer,
        subtitle: `${app.service_name || "Service"} · documents needed`,
        statusLabel: app.status,
        ctaLabel: "Upload Documents",
        href: `/ap/applications/${app.id}`,
      });
      continue;
    }

    if (isUnpaid(paymentStatus) && isPendingAppStatus(app.status)) {
      items.push({
        id: `pay-${app.id}`,
        title: customer,
        subtitle: `${app.service_name || "Service"} · payment pending`,
        statusLabel: paymentStatus || "pending",
        ctaLabel: "Collect Payment",
        href: `/ap/payments/collect`,
      });
    }
  }

  return items;
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
      if (isPendingAppStatus(app.status)) {
        actions.push({ label: "Upload Document", href: `/ap/applications/${app.id}` });
      }
      if (isUnpaid(app.payment_status)) {
        actions.push({ label: "Collect Payment", href: "/ap/payments/collect" });
      }
    } else if (isPendingAppStatus(app.status)) {
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
    getAPApplications(ap.id, 50),
    getActivePartnerDashboardBanners(partnerType),
    partnerType === "office_staff" ? getAgentAssignedApplications(userId) : Promise.resolve([]),
  ]);

  const today = startOfDayIso();
  const month = startOfMonthIso();
  const paidApps = apps.filter((a) => isPaid(a.payment_status));
  const collectedToday = paidApps
    .filter((a) => (a.updated_at || a.created_at) >= today)
    .reduce((sum, a) => sum + safeNumber(a.amount), 0);
  const monthCollection = paidApps
    .filter((a) => (a.updated_at || a.created_at) >= month)
    .reduce((sum, a) => sum + safeNumber(a.amount), 0);
  const pendingCollection = apps
    .filter((a) => isUnpaid(a.payment_status))
    .reduce((sum, a) => sum + safeNumber(a.amount), 0);

  const hasCommissionScheme = safeNumber(ap.commission_value) > 0 || safeNumber(ap.commission_rate) > 0 || stats.commissionEarned > 0 || stats.commissionPending > 0;

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

  let overview: PartnerOverviewCard[];
  let officeWork: PartnerOfficeWorkSummary | null = null;

  if (partnerType === "company_partner" && teamSummary) {
    overview = buildCompanyOverview(stats, teamSummary);
  } else if (partnerType === "office_staff") {
    const docsPending = apps.filter((a) => needsDocuments(a.status) && isPendingAppStatus(a.status)).length;
    officeWork = {
      applicationsToProcess: assigned.length,
      supportQueueCount: 0, // support is contact desk; no partner ticket table in AP scope
      recentOfflineInvoices: 0,
      assignedWorkCount: assigned.length,
    };
    overview = buildOfficeOverview(
      assigned.length,
      docsPending,
      officeWork.supportQueueCount,
      officeWork.recentOfflineInvoices,
      collectedToday,
      hasCommissionScheme ? formatINR(stats.commissionEarned) : "No commission assigned",
    );
  } else {
    overview = buildStandardOverview(stats, apps);
  }

  const assignedIds = new Set(assigned.map((a) => a.id));
  const pendingWork = buildPendingWork(partnerType, apps, assignedIds);
  const recentApplications = buildRecentApplications(
    partnerType === "office_staff" && assigned.length ? assigned.slice(0, 8) : apps,
    partnerType,
  );

  const recentCustomers = apps.slice(0, 5).map((app) => ({
    id: app.id,
    name: getCustomerName(app) || "Customer",
    mobile: getCustomerMobile(app) || "—",
    href: `/ap/applications/${app.id}`,
  }));

  return {
    partnerType,
    canManageTeam: manageTeam,
    banners,
    overview,
    pendingWork,
    recentApplications,
    collection,
    teamSummary,
    officeWork,
    recentCustomers,
  };
}
