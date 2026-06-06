import type { ApplicationStatus, PaymentStatus } from "@/lib/portal-data";
import { ensureReferralCodeForUser } from "@/lib/referrals";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const referralRewardTypes = [
  "referrer_bonus",
  "referral_bonus",
  "referrer_signup_bonus",
  "referrer_first_service_bonus",
] as const;

export type CustomerDashboardApplication = {
  id: string;
  service_name: string;
  status: ApplicationStatus;
  payment_status: PaymentStatus | null;
  created_at: string;
  amount: number;
  total_amount: number | null;
  customer_details: Record<string, unknown> | null;
};

export type CustomerReferralStats = {
  code: string;
  link: string;
  totalReferrals: number;
  todayEarning: number;
  lifetimeEarning: number;
};

export type CustomerDashboardStats = CustomerReferralStats & {
  walletBalance: number;
};

export type CustomerDashboardData = {
  applications: CustomerDashboardApplication[];
  stats: CustomerDashboardStats;
};

const emptyStats: CustomerDashboardStats = {
  code: "",
  link: "",
  totalReferrals: 0,
  todayEarning: 0,
  lifetimeEarning: 0,
  walletBalance: 0,
};

function numberValue(value: unknown) {
  const nextValue = Number(value ?? 0);
  return Number.isFinite(nextValue) ? nextValue : 0;
}

function indiaDateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function buildReferralLink(code: string) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://rnos.in";
  return code ? `${baseUrl.replace(/\/$/, "")}/signup?ref=${encodeURIComponent(code)}` : "";
}

async function getReferralCount(userId: string) {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return 0;
  }

  const currentResult = await supabase
    .from("referral_events")
    .select("id", { count: "exact", head: true })
    .eq("referrer_user_id", userId);

  if (!currentResult.error) {
    return numberValue(currentResult.count);
  }

  const legacyResult = await supabase
    .from("referrals")
    .select("id", { count: "exact", head: true })
    .eq("referrer_id", userId);

  if (legacyResult.error) {
    console.error("[customer-dashboard] Referral count failed", legacyResult.error);
    return 0;
  }

  return numberValue(legacyResult.count);
}

export async function getCustomerReferralStats(userId: string): Promise<CustomerReferralStats> {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return emptyStats;
  }

  const [{ data: profile }, referralCode, totalReferrals, { data: rewardRows, error: rewardError }] = await Promise.all([
    supabase.from("profiles").select("referral_code").eq("id", userId).maybeSingle(),
    ensureReferralCodeForUser(userId).catch(() => ""),
    getReferralCount(userId),
    supabase
      .from("wallet_transactions")
      .select("amount, created_at")
      .eq("user_id", userId)
      .eq("direction", "credit")
      .in("type", [...referralRewardTypes])
      .in("status", ["posted", "active"]),
  ]);

  if (rewardError) {
    console.error("[customer-dashboard] Referral earnings failed", rewardError);
  }

  const today = indiaDateKey(new Date());
  const rewardAmounts = (rewardRows ?? []).map((row) => ({
    amount: numberValue(row.amount),
    createdAt: new Date(String(row.created_at)),
  }));
  const code = String(referralCode || profile?.referral_code || "");

  return {
    code,
    link: buildReferralLink(code),
    totalReferrals,
    todayEarning: rewardAmounts
      .filter((reward) => indiaDateKey(reward.createdAt) === today)
      .reduce((total, reward) => total + reward.amount, 0),
    lifetimeEarning: rewardAmounts.reduce((total, reward) => total + reward.amount, 0),
  };
}

async function getCustomerWalletBalance(userId: string) {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return 0;
  }

  const { data, error } = await supabase
    .from("reward_wallets")
    .select("balance")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[customer-dashboard] Wallet balance failed", error);
    return 0;
  }

  return numberValue(data?.balance);
}

async function getCustomerApplications(userId: string) {
  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    return [] as CustomerDashboardApplication[];
  }

  const { data, error } = await supabase
    .from("applications")
    .select("id, service_name, status, payment_status, created_at, amount, total_amount, customer_details")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[customer-dashboard] Applications failed", { userId, error });
    return [];
  }

  return (data ?? []).map((application) => ({
    id: String(application.id),
    service_name: String(application.service_name ?? "Service"),
    status: application.status as ApplicationStatus,
    payment_status: (application.payment_status as PaymentStatus | null) ?? null,
    created_at: String(application.created_at),
    amount: numberValue(application.amount),
    total_amount: application.total_amount === null ? null : numberValue(application.total_amount),
    customer_details: (application.customer_details as Record<string, unknown> | null) ?? null,
  }));
}

export async function getCustomerDashboardData(userId: string): Promise<CustomerDashboardData> {
  const [applications, referralStats, walletBalance] = await Promise.all([
    getCustomerApplications(userId),
    getCustomerReferralStats(userId),
    getCustomerWalletBalance(userId),
  ]);

  return {
    applications,
    stats: {
      ...referralStats,
      walletBalance,
    },
  };
}
