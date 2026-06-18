// ============================================================================
// Agency Partner Data Fetching
// DigiConnect Dukan — AP Ecosystem
// ============================================================================

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { hydrateApplications } from "@/lib/crm";
import type { Application } from "@/lib/portal-types";
import type {
  AgencyPartner,
  APCommission,
  APDashboardStats,
  APKycDocument,
  APListItem,
  APPayout,
  APWalletEntry,
  PartnerAnnouncement,
} from "@/lib/ap-types";

function safeNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

// ── Get AP by user_id ──────────────────────────────────────────────────────

export async function getAgencyPartnerByUserId(userId: string): Promise<AgencyPartner | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("agency_partners")
    .select("*, agency_partner_tiers(*)")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as Record<string, unknown>;
  const tier = row.agency_partner_tiers as AgencyPartner["tier"] ?? null;

  return { ...row, tier } as unknown as AgencyPartner;
}

// ── Get AP by id ───────────────────────────────────────────────────────────

export async function getAgencyPartnerById(apId: string): Promise<AgencyPartner | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("agency_partners")
    .select("*, agency_partner_tiers(*)")
    .eq("id", apId)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as Record<string, unknown>;
  const tier = row.agency_partner_tiers as AgencyPartner["tier"] ?? null;

  return { ...row, tier } as unknown as AgencyPartner;
}

// ── List all APs (admin) ───────────────────────────────────────────────────

export async function getAdminAgencyPartnerList(): Promise<APListItem[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const [partnersResult, appsResult, commissionsResult] = await Promise.all([
    supabase
      .from("agency_partners")
      .select("*, agency_partner_tiers(*)")
      .order("created_at", { ascending: false }),
    supabase
      .from("applications")
      .select("id, agency_partner_id, status")
      .not("agency_partner_id", "is", null),
    supabase
      .from("ap_commissions")
      .select("agency_partner_id, calculated_amount, status"),
  ]);

  if (partnersResult.error) return [];

  const apps = (appsResult.data ?? []) as { id: string; agency_partner_id: string; status: string }[];
  const commissions = (commissionsResult.data ?? []) as { agency_partner_id: string; calculated_amount: number; status: string }[];

  return ((partnersResult.data ?? []) as Record<string, unknown>[]).map((row) => {
    const apId = String(row.id);
    const partnerApps = apps.filter((a) => a.agency_partner_id === apId);
    const partnerCommissions = commissions.filter((c) => c.agency_partner_id === apId);

    const tier = row.agency_partner_tiers as AgencyPartner["tier"] ?? null;

    return {
      ...row,
      tier,
      totalApplications: partnerApps.length,
      pendingApplications: partnerApps.filter((a) => !["completed", "rejected", "cancelled"].includes(a.status)).length,
      completedApplications: partnerApps.filter((a) => a.status === "completed").length,
      pendingCommission: partnerCommissions
        .filter((c) => ["pending", "earned", "approved"].includes(c.status))
        .reduce((t, c) => t + safeNumber(c.calculated_amount), 0),
      totalPaidCommission: partnerCommissions
        .filter((c) => c.status === "paid")
        .reduce((t, c) => t + safeNumber(c.calculated_amount), 0),
      customerCount: 0, // calculated separately if needed
    } as unknown as APListItem;
  });
}

// ── AP Dashboard Stats ─────────────────────────────────────────────────────

export async function getAPDashboardStats(apId: string): Promise<APDashboardStats & { todayApplications: number; revenueCollected: number; conversionRate: number }> {
  const supabase = getSupabaseAdmin();
  const empty = {
    totalApplications: 0,
    pendingApplications: 0,
    completedApplications: 0,
    rejectedApplications: 0,
    commissionEarned: 0,
    commissionPending: 0,
    commissionApproved: 0,
    totalPaidPayout: 0,
    walletBalance: 0,
    customerCount: 0,
    monthlyApplications: 0,
    todayApplications: 0,
    revenueCollected: 0,
    conversionRate: 0,
  };

  if (!supabase) return empty;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  const [appsResult, commissionsResult, walletResult, payoutsResult, customersResult, monthlyResult] = await Promise.all([
    supabase.from("applications").select("id, status, created_at, amount").eq("agency_partner_id", apId),
    supabase.from("ap_commissions").select("calculated_amount, status").eq("agency_partner_id", apId),
    supabase.from("ap_wallet_ledger").select("amount, entry_type").eq("agency_partner_id", apId),
    supabase.from("ap_payouts").select("amount, status").eq("agency_partner_id", apId),
    supabase.from("applications").select("customer_mobile_normalized").eq("agency_partner_id", apId).not("customer_mobile_normalized", "is", null),
    supabase.from("applications").select("id").eq("agency_partner_id", apId).gte("created_at", monthStart),
  ]);

  const apps = (appsResult.data ?? []) as { id: string; status: string; created_at: string; amount: number }[];
  const commissions = (commissionsResult.data ?? []) as { calculated_amount: number; status: string }[];
  const walletEntries = (walletResult.data ?? []) as { amount: number; entry_type: string }[];
  const payouts = (payoutsResult.data ?? []) as { amount: number; status: string }[];
  const customerMobiles = (customersResult.data ?? []) as { customer_mobile_normalized: string }[];

  const walletBalance = walletEntries.reduce((total, e) => {
    const amt = safeNumber(e.amount);
    if (["commission_credit", "manual_credit", "bonus", "adjustment"].includes(e.entry_type)) return total + amt;
    if (["manual_debit", "payout_deduction", "penalty", "reversal"].includes(e.entry_type)) return total - Math.abs(amt);
    return total;
  }, 0);

  const todayApplications = apps.filter((a) => a.created_at && a.created_at >= startOfToday).length;
  const revenueCollected = apps
    .filter((a) => ["completed", "approved", "submitted", "in_process", "in_progress"].includes(a.status))
    .reduce((sum, a) => sum + safeNumber(a.amount), 0);
  const conversionRate = apps.length > 0
    ? Math.round((apps.filter((a) => a.status === "completed").length / apps.length) * 100)
    : 0;

  return {
    totalApplications: apps.length,
    pendingApplications: apps.filter((a) => !["completed", "rejected", "cancelled"].includes(a.status)).length,
    completedApplications: apps.filter((a) => a.status === "completed").length,
    rejectedApplications: apps.filter((a) => a.status === "rejected").length,
    commissionEarned: commissions.reduce((t, c) => t + safeNumber(c.calculated_amount), 0),
    commissionPending: commissions
      .filter((c) => ["pending", "earned"].includes(c.status))
      .reduce((t, c) => t + safeNumber(c.calculated_amount), 0),
    commissionApproved: commissions
      .filter((c) => c.status === "approved")
      .reduce((t, c) => t + safeNumber(c.calculated_amount), 0),
    totalPaidPayout: payouts
      .filter((p) => p.status === "paid")
      .reduce((t, p) => t + safeNumber(p.amount), 0),
    walletBalance,
    customerCount: new Set(customerMobiles.map((c) => c.customer_mobile_normalized)).size,
    monthlyApplications: (monthlyResult.data ?? []).length,
    todayApplications,
    revenueCollected,
    conversionRate,
  };
}

// ── AP Applications ────────────────────────────────────────────────────────

export async function getAPApplications(apId: string, limit = 200): Promise<Application[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data } = await supabase
    .from("applications")
    .select("*")
    .eq("agency_partner_id", apId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (await hydrateApplications((data ?? []) as Application[])) as Application[];
}

// ── AP Commissions ─────────────────────────────────────────────────────────

export async function getAPCommissions(apId: string, limit = 200): Promise<APCommission[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("ap_commissions")
    .select("*")
    .eq("agency_partner_id", apId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return [];
  return (data ?? []) as APCommission[];
}

// ── AP Wallet Ledger ───────────────────────────────────────────────────────

export async function getAPWalletLedger(apId: string, limit = 200): Promise<APWalletEntry[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("ap_wallet_ledger")
    .select("*")
    .eq("agency_partner_id", apId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return [];
  return (data ?? []) as APWalletEntry[];
}

// ── AP Wallet Balance ──────────────────────────────────────────────────────

export async function getAPWalletBalance(apId: string): Promise<number> {
  const ledger = await getAPWalletLedger(apId, 10000);

  return ledger.reduce((total, e) => {
    const amt = safeNumber(e.amount);
    if (["commission_credit", "manual_credit", "bonus", "adjustment"].includes(e.entry_type)) return total + amt;
    if (["manual_debit", "payout_deduction", "penalty", "reversal"].includes(e.entry_type)) return total - Math.abs(amt);
    return total;
  }, 0);
}

// ── AP Payouts ─────────────────────────────────────────────────────────────

export async function getAPPayouts(apId: string, limit = 100): Promise<APPayout[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("ap_payouts")
    .select("*")
    .eq("agency_partner_id", apId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return [];
  return (data ?? []) as APPayout[];
}

// ── AP KYC Documents ───────────────────────────────────────────────────────

export async function getAPKycDocuments(apId: string): Promise<APKycDocument[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("agency_partner_kyc_documents")
    .select("*")
    .eq("agency_partner_id", apId)
    .order("created_at", { ascending: false });

  if (error) return [];
  return (data ?? []) as APKycDocument[];
}

// ── AP Announcements ───────────────────────────────────────────────────────

export async function getActiveAnnouncements(apId: string, tierId: string | null): Promise<PartnerAnnouncement[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const now = new Date().toISOString();

  const query = supabase
    .from("partner_announcements")
    .select("*")
    .eq("is_active", true)
    .or(`published_at.is.null,published_at.lte.${now}`)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order("published_at", { ascending: false })
    .limit(10);

  const { data, error } = await query;

  if (error) return [];

  // Filter by target in JS (complex array filtering not well supported in PostgREST)
  return ((data ?? []) as PartnerAnnouncement[]).filter((a) => {
    if (a.target_type === "all") return true;
    if (a.target_type === "tier" && tierId && a.target_tier_id === tierId) return true;
    if (a.target_type === "specific" && a.target_partner_ids?.includes(apId)) return true;
    return false;
  });
}

// ── Admin: All Commissions ─────────────────────────────────────────────────

export async function getAdminAPCommissions(limit = 500): Promise<APCommission[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("ap_commissions")
    .select("*, agency_partners(full_name, email, mobile, partner_code)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return [];

  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    ...row,
    agency_partner: row.agency_partners ?? null,
  })) as unknown as APCommission[];
}

// ── Admin: All Payouts ─────────────────────────────────────────────────────

export async function getAdminAPPayouts(limit = 500): Promise<APPayout[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("ap_payouts")
    .select("*, agency_partners(full_name, email, mobile, partner_code)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return [];

  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    ...row,
    agency_partner: row.agency_partners ?? null,
  })) as unknown as APPayout[];
}

// ── AP Tiers (admin) ───────────────────────────────────────────────────────

export async function getAPTiers() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("agency_partner_tiers")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) return [];
  return (data ?? []) as import("@/lib/ap-types").APTier[];
}

// ── Get next partner code ──────────────────────────────────────────────────

export async function getNextPartnerCode(): Promise<string> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return "DCD-AP-0001";

  const { data } = await supabase
    .from("agency_partners")
    .select("partner_code")
    .order("created_at", { ascending: false });

  const codes = (data ?? []).map((r) => String((r as { partner_code: string }).partner_code ?? ""));
  const usedNumbers = new Set(
    codes
      .map((code) => Number(String(code).match(/DCD-AP-(\d+)/i)?.[1] ?? 0))
      .filter((v) => Number.isFinite(v) && v > 0),
  );

  let next = 1;
  while (usedNumbers.has(next)) next += 1;

  return `DCD-AP-${String(next).padStart(4, "0")}`;
}

// ── Partner Analytics Aggregation ──────────────────────────────────────────

export interface PartnerAnalytics {
  walletBalance: number | null;
  totalApplications: number | null;
  pendingApplications: number | null;
  completedApplications: number | null;
  todayCommission: number | null;
  monthlyCommission: number | null;
  activeTickets: number | null;
}

export async function getPartnerAnalytics(apId: string): Promise<PartnerAnalytics> {
  const supabase = getSupabaseAdmin();
  const empty: PartnerAnalytics = {
    walletBalance: null,
    totalApplications: null,
    pendingApplications: null,
    completedApplications: null,
    todayCommission: null,
    monthlyCommission: null,
    activeTickets: null,
  };

  if (!supabase) return empty;

  const now = new Date();
  
  // start of today (local date boundaries)
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  
  // start of current calendar month
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // Run database queries safely catching error rejections
  const [apps, commissions, walletBalance, activeTickets] = await Promise.all([
    (async () => {
      try {
        const { data, error } = await supabase
          .from("applications")
          .select("id, status")
          .eq("agency_partner_id", apId);
        if (error) return null;
        return data;
      } catch {
        return null;
      }
    })(),
    (async () => {
      try {
        const { data, error } = await supabase
          .from("ap_commissions")
          .select("calculated_amount, created_at, status")
          .eq("agency_partner_id", apId);
        if (error) return null;
        return data;
      } catch {
        return null;
      }
    })(),
    (async () => {
      try {
        return await getAPWalletBalance(apId);
      } catch {
        return null;
      }
    })(),
    (async () => {
      try {
        const { count, error } = await supabase
          .from("support_tickets")
          .select("id", { count: "exact", head: true })
          .eq("agency_partner_id", apId)
          .not("status", "eq", "Closed");
        if (error) return null;
        return count;
      } catch {
        return null;
      }
    })(),
  ]);

  return {
    walletBalance,
    totalApplications: apps !== null ? apps.length : null,
    pendingApplications: apps !== null 
      ? apps.filter((a) => !["completed", "rejected", "cancelled"].includes(a.status)).length 
      : null,
    completedApplications: apps !== null 
      ? apps.filter((a) => a.status === "completed").length 
      : null,
    todayCommission: commissions !== null
      ? commissions
          .filter((c) => ["earned", "approved", "paid"].includes(c.status) && c.created_at >= startOfToday)
          .reduce((sum, c) => sum + safeNumber(c.calculated_amount), 0)
      : null,
    monthlyCommission: commissions !== null
      ? commissions
          .filter((c) => ["earned", "approved", "paid"].includes(c.status) && c.created_at >= startOfMonth)
          .reduce((sum, c) => sum + safeNumber(c.calculated_amount), 0)
      : null,
    activeTickets,
  };
}

export interface MonthlyChartPoint {
  name: string;
  earnings: number;
  filings: number;
}

export async function getMonthlyChartData(apId: string): Promise<MonthlyChartPoint[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const now = new Date();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(now.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const [commissionsRes, appsRes] = await Promise.all([
    (async () => {
      try {
        return await supabase
          .from("ap_commissions")
          .select("calculated_amount, created_at, status")
          .eq("agency_partner_id", apId)
          .gte("created_at", sixMonthsAgo.toISOString());
      } catch {
        return { data: null };
      }
    })(),
    (async () => {
      try {
        return await supabase
          .from("applications")
          .select("id, created_at")
          .eq("agency_partner_id", apId)
          .gte("created_at", sixMonthsAgo.toISOString());
      } catch {
        return { data: null };
      }
    })(),
  ]);

  const commissions = commissionsRes.data ?? [];
  const apps = appsRes.data ?? [];

  const chartData: MonthlyChartPoint[] = [];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(now.getMonth() - i);
    const monthIndex = d.getMonth();
    const year = d.getFullYear();
    const monthName = months[monthIndex];

    // Filter commissions for this month & year
    const monthCommissions = commissions.filter((c) => {
      const cDate = new Date(c.created_at);
      return cDate.getMonth() === monthIndex && cDate.getFullYear() === year && ["earned", "approved", "paid"].includes(c.status);
    });

    // Filter apps for this month & year
    const monthApps = apps.filter((a) => {
      const aDate = new Date(a.created_at);
      return aDate.getMonth() === monthIndex && aDate.getFullYear() === year;
    });

    const earnings = monthCommissions.reduce((sum, c) => sum + Number(c.calculated_amount || 0), 0);
    const filings = monthApps.length;

    chartData.push({
      name: monthName,
      earnings,
      filings,
    });
  }

  return chartData;
}
