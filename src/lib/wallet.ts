import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { attachReferralOnSignup, ensureReferralCodeForUser } from "@/lib/referrals";
import { MAX_WALLET_REDEEM_PERCENT, REPEAT_CASHBACK_PERCENT } from "@/lib/reward-rules";
import {
  calculateMaxRedeem,
  processRewardsOnApplicationCompleted,
  redeemWalletForApplication as redeemRewardWalletForApplication,
} from "@/lib/rewards-wallet";

export type RewardTransactionType =
  | "signup_referral_bonus"
  | "referrer_bonus"
  | "signup_bonus"
  | "referrer_signup_bonus"
  | "referrer_first_service_bonus"
  | "legacy_wallet_migration"
  | "first_service_cashback"
  | "repeat_cashback"
  | "redeem"
  | "reversal"
  | "referral_bonus"
  | "cashback"
  | "redemption"
  | "expiry"
  | "admin_adjustment";
export type RewardTransactionStatus = "active" | "used" | "expired" | "reversed";

export type Wallet = {
  id: string;
  user_id: string;
  balance?: number;
  balance_points: number;
  total_reward_earned: number;
  total_reward_redeemed: number;
  total_cashback_earned?: number;
  total_cashback_used?: number;
  nearest_expiry_at: string | null;
  frozen?: boolean;
  suspicious?: boolean;
  admin_note?: string | null;
  created_at: string;
  updated_at: string;
};

export type RewardTransaction = {
  id: string;
  user_id: string;
  type: RewardTransactionType;
  amount: number;
  remaining_amount: number;
  description: string;
  note?: string | null;
  status: RewardTransactionStatus;
  expires_at: string | null;
  reference_type: string | null;
  reference_id: string | null;
  created_at: string;
};

export type WalletTransactionType = "cashback_credit" | "wallet_usage" | "refund_adjustment" | "admin_bonus";
export type WalletTransactionDirection = "credit" | "debit";
export type WalletTransactionStatus = "active" | "used" | "expired" | "reversed";

export type WalletTransaction = {
  id: string;
  wallet_id?: string;
  user_id: string;
  application_id?: string | null;
  campaign_id?: string | null;
  transaction_type: WalletTransactionType;
  direction: WalletTransactionDirection;
  amount: number;
  remaining_amount: number;
  service_name: string | null;
  note: string | null;
  status: WalletTransactionStatus;
  expires_at: string | null;
  created_at: string;
};

export type ServiceRewardRule = {
  id: string;
  service_slug: string;
  cashback_type: "percentage" | "fixed";
  cashback_value: number;
  max_redemption_percent: number;
  active: boolean;
};

export type Referral = {
  id: string;
  referrer_id: string;
  referred_user_id: string;
  referral_code: string;
  status: "pending" | "completed" | "rejected";
  reward_amount: number;
  created_at: string;
  completed_at: string | null;
  referred_profile?: { full_name: string | null; email: string | null } | null;
};

export type ReferralSummary = {
  code: string;
  link: string;
  referrals: Referral[];
  total: number;
  pending: number;
  completed: number;
  rewardEarned: number;
};

export type WalletSnapshot = {
  wallet: Wallet | null;
  transactions: RewardTransaction[];
  cashbackEarned: number;
  cashbackUsed: number;
  expiringSoonAmount: number;
  referralSummary: ReferralSummary | null;
};

export const walletMaxRedemptionPercent = MAX_WALLET_REDEEM_PERCENT;
export const defaultRewardValidityMonths = 6;

function toNumber(value: unknown) {
  return Number(value ?? 0);
}

export function getWalletMaxUsable(orderAmount: number, walletBalance: number, maxPercent = walletMaxRedemptionPercent) {
  const percent = Math.min(Math.max(maxPercent, 0), walletMaxRedemptionPercent);
  const maxByService = Math.floor(Math.max(0, orderAmount) * (percent / 100));
  const maxByWallet = Math.floor(Math.max(0, walletBalance) * (percent / 100));
  return Math.min(maxByService, maxByWallet);
}

export function getRealPayableAmount(orderAmount: number, walletAmount: number) {
  return Math.max(0, orderAmount - walletAmount);
}

export function getRewardDirection(type: RewardTransactionType): WalletTransactionDirection {
  return type === "redemption" || type === "redeem" || type === "expiry" ? "debit" : "credit";
}

export function rewardTransactionToWalletTransaction(transaction: RewardTransaction): WalletTransaction {
  const direction = getRewardDirection(transaction.type);

  return {
    id: transaction.id,
    user_id: transaction.user_id,
    application_id: transaction.reference_type === "application" ? transaction.reference_id : null,
    transaction_type:
      transaction.type === "cashback"
        ? "cashback_credit"
        : transaction.type === "redemption"
          ? "wallet_usage"
          : transaction.type === "admin_adjustment"
            ? "admin_bonus"
            : "admin_bonus",
    direction,
    amount: transaction.amount,
    remaining_amount: transaction.remaining_amount,
    service_name: transaction.description,
    note: transaction.description,
    status: transaction.status === "active" ? "active" : transaction.status === "expired" ? "expired" : transaction.status === "reversed" ? "reversed" : "used",
    expires_at: transaction.expires_at,
    created_at: transaction.created_at,
  };
}

export function getRewardExpiryDate(date = new Date()) {
  const expiresAt = new Date(date);
  expiresAt.setMonth(expiresAt.getMonth() + defaultRewardValidityMonths);

  return expiresAt.toISOString();
}

export async function getReferralSummary(userId: string): Promise<ReferralSummary | null> {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return null;
  }

  // A referral code that never arrives is invisible to the customer *and* to
  // us if the failure is swallowed — which is how a live account ended up
  // showing "your code is on its way" indefinitely. The empty string still
  // stands so the wallet renders, but the reason is now in the logs.
  const code = await ensureReferralCodeForUser(userId).catch((error: unknown) => {
    console.error("REFERRAL_CODE_UNAVAILABLE", {
      userId,
      source: "getReferralSummary",
      message: error instanceof Error ? error.message : String(error),
    });
    return "";
  });
  const [{ data: profile }, { data: referralEventRows }, { data: legacyReferralRows }, { data: referrerRewardRows }] = await Promise.all([
    supabase.from("profiles").select("referral_code").eq("id", userId).maybeSingle(),
    supabase
      .from("referral_events")
      .select("id, referrer_user_id, referred_user_id, referral_code, signup_reward_status, referrer_reward_status, referred_first_completed_at, created_at")
      .eq("referrer_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("referrals")
      .select("id, referrer_id, referred_user_id, referral_code, status, reward_amount, created_at, completed_at")
      .eq("referrer_id", userId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("wallet_transactions")
      .select("referred_user_id, amount")
      .eq("user_id", userId)
      .in("type", ["referrer_signup_bonus", "referrer_first_service_bonus"])
      .neq("status", "reversed"),
  ]);

  const rewardByReferredUserId = ((referrerRewardRows ?? []) as Array<{ referred_user_id: string | null; amount: number | null }>).reduce<Record<string, number>>((grouped, row) => {
    if (row.referred_user_id) {
      grouped[row.referred_user_id] = (grouped[row.referred_user_id] ?? 0) + Number(row.amount ?? 0);
    }
    return grouped;
  }, {});

  const uniqueReferralEvents = Array.from(
    new Map((referralEventRows ?? []).map((event) => [String(event.referred_user_id), event])).values(),
  );
  const referrals: Referral[] = uniqueReferralEvents.length
    ? uniqueReferralEvents.map((event) => ({
        id: String(event.id),
        referrer_id: String(event.referrer_user_id),
        referred_user_id: String(event.referred_user_id),
        referral_code: String(event.referral_code),
        status: event.referrer_reward_status === "credited" ? "completed" as const : "pending" as const,
        reward_amount: rewardByReferredUserId[String(event.referred_user_id)] ?? 0,
        created_at: String(event.created_at),
        completed_at: event.referred_first_completed_at ? String(event.referred_first_completed_at) : null,
        referred_profile: null,
      }))
    : ((legacyReferralRows ?? []) as Referral[]).map((referral) => ({ ...referral, referred_profile: null }));
  const referralCode = code || String(profile?.referral_code ?? "");
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://rnos.in";

  return {
    code: referralCode,
    link: referralCode ? `${baseUrl.replace(/\/$/, "")}/signup?ref=${encodeURIComponent(referralCode)}` : "",
    referrals,
    total: referrals.length,
    pending: referrals.filter((referral) => referral.status === "pending").length,
    completed: referrals.filter((referral) => referral.status === "completed").length,
    rewardEarned: referrals
      .filter((referral) => referral.status === "completed")
      .reduce((total, referral) => total + Number(referral.reward_amount ?? 0), 0),
  };
}

export async function getWalletSnapshot(userId: string, limit = 20): Promise<WalletSnapshot> {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return { wallet: null, transactions: [], cashbackEarned: 0, cashbackUsed: 0, expiringSoonAmount: 0, referralSummary: null };
  }

  const [{ data: walletData, error: walletError }, { data: transactionData }, referralSummary] = await Promise.all([
    supabase.rpc("create_reward_wallet_if_missing", { p_user_id: userId }),
    supabase
      .from("wallet_transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit),
    getReferralSummary(userId),
  ]);

  if (walletError) {
    throw walletError;
  }

  const walletDataRow = walletData as {
    id: string;
    user_id: string;
    balance: number;
    lifetime_earned: number;
    lifetime_redeemed: number;
    created_at: string;
    updated_at: string;
    frozen?: boolean;
    suspicious?: boolean;
    admin_note?: string | null;
  } | null;
  const transactions = ((transactionData ?? []) as {
    id: string;
    user_id: string;
    type: RewardTransactionType;
    direction: WalletTransactionDirection;
    amount: number;
    status: string;
    note?: string | null;
    application_id?: string | null;
    created_at: string;
  }[]).map((transaction) => ({
    id: transaction.id,
    user_id: transaction.user_id,
    type: transaction.type,
    amount: Number(transaction.amount ?? 0),
    remaining_amount: transaction.direction === "credit" && transaction.status === "posted" ? Number(transaction.amount ?? 0) : 0,
    description: transaction.note || transaction.type.replace(/_/g, " "),
    status: transaction.status === "posted" ? "active" : transaction.status === "reversed" ? "reversed" : "used",
    expires_at: null,
    reference_type: transaction.application_id ? "application" : null,
    reference_id: transaction.application_id ?? null,
    created_at: transaction.created_at,
  })) as RewardTransaction[];
  const wallet: Wallet | null = walletDataRow
    ? {
        ...walletDataRow,
        balance_points: Number(walletDataRow.balance ?? 0),
        total_reward_earned: Number(walletDataRow.lifetime_earned ?? 0),
        total_reward_redeemed: Number(walletDataRow.lifetime_redeemed ?? 0),
        total_cashback_earned: Number(walletDataRow.lifetime_earned ?? 0),
        total_cashback_used: Number(walletDataRow.lifetime_redeemed ?? 0),
        nearest_expiry_at: null,
    }
    : null;

  return {
    wallet,
    transactions,
    cashbackEarned: toNumber(wallet?.total_reward_earned),
    cashbackUsed: toNumber(wallet?.total_reward_redeemed),
    expiringSoonAmount: 0,
    referralSummary,
  };
}

export async function getActiveServiceRewardRule(serviceSlug: string) {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return null;
  }

  const { data } = await supabase
    .from("service_reward_rules")
    .select("*")
    .eq("active", true)
    .in("service_slug", [serviceSlug, "default"])
    .order("service_slug", { ascending: serviceSlug === "default" })
    .limit(1)
    .maybeSingle();

  return (data ?? null) as ServiceRewardRule | null;
}

export async function getRewardRuleForOrder(serviceSlugs: string[]) {
  const normalized = new Set(serviceSlugs);

  if (normalized.has("itr-filing") && normalized.has("msme-certificate")) {
    return getActiveServiceRewardRule("itr-msme-combo");
  }

  return getActiveServiceRewardRule(serviceSlugs[0] ?? "default");
}

export function calculateCashbackAmount(orderAmount: number) {
  return Math.floor(Math.max(0, orderAmount) * (REPEAT_CASHBACK_PERCENT / 100));
}

export async function creditCashbackForApplication({
  applicationId,
  createdBy,
}: {
  userId?: string;
  applicationId: string;
  serviceSlug?: string;
  serviceSlugs?: string[];
  serviceName?: string;
  orderAmount?: number;
  cashbackAmount?: number | null;
  expiryDays?: number | null;
  createdBy?: string | null;
}) {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    throw new Error("Supabase service role key is missing.");
  }

  const result = await processRewardsOnApplicationCompleted(applicationId, createdBy ?? null);
  return result.cashback_transaction_id ?? null;
}

export async function creditReferralRewardForSignup({
  referralCode,
  referredUserId,
}: {
  referralCode: string;
  referredUserId: string;
  createdBy?: string | null;
}) {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    throw new Error("Supabase service role key is missing.");
  }

  if (!referralCode.trim() || !referredUserId) {
    return null;
  }

  const event = await attachReferralOnSignup(referredUserId, referralCode, null, null);
  return event ? String((event as { id?: string }).id ?? "") : null;
}

export async function redeemWalletForApplication({
  userId,
  applicationId,
  serviceName,
  orderAmount,
  requestedAmount,
  maxRedemptionPercent = walletMaxRedemptionPercent,
}: {
  userId: string;
  applicationId: string;
  serviceName: string;
  orderAmount: number;
  requestedAmount: number;
  maxRedemptionPercent?: number;
}) {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    throw new Error("Supabase service role key is missing.");
  }

  void serviceName;
  void maxRedemptionPercent;

  const cappedRequest = Math.min(requestedAmount, calculateMaxRedeem(orderAmount));
  const transaction = await redeemRewardWalletForApplication({
    userId,
    applicationId,
    applicationAmount: orderAmount,
    requestedAmount: cappedRequest,
    createdBy: userId,
  });

  return Number(transaction?.amount ?? 0);
}

export async function completeReferralRewardForFirstPaidOrder({
  userId,
  applicationId,
  createdBy,
}: {
  userId: string;
  applicationId: string;
  createdBy?: string | null;
}) {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    throw new Error("Supabase service role key is missing.");
  }

  void userId;

  const result = await processRewardsOnApplicationCompleted(applicationId, createdBy ?? null);
  return result.referrer_transaction_id ?? null;
}
