import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type RewardTransactionType =
  | "signup_bonus"
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

export const walletMaxRedemptionPercent = 50;
export const defaultRewardValidityMonths = 6;

function toNumber(value: unknown) {
  return Number(value ?? 0);
}

export function getWalletMaxUsable(orderAmount: number, walletBalance: number, maxPercent = walletMaxRedemptionPercent) {
  const percent = Math.min(Math.max(maxPercent, 0), walletMaxRedemptionPercent);
  return Math.max(0, Math.min(walletBalance, Math.floor(orderAmount * (percent / 100))));
}

export function getRealPayableAmount(orderAmount: number, walletAmount: number) {
  return Math.max(0, orderAmount - walletAmount);
}

export function getRewardDirection(type: RewardTransactionType): WalletTransactionDirection {
  return type === "redemption" || type === "expiry" ? "debit" : "credit";
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

  const [{ data: profile }, { data: referralRows }] = await Promise.all([
    supabase.from("profiles").select("referral_code").eq("id", userId).maybeSingle(),
    supabase
      .from("referrals")
      .select("id, referrer_id, referred_user_id, referral_code, status, reward_amount, created_at, completed_at")
      .eq("referrer_id", userId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const referrals = ((referralRows ?? []) as Referral[]).map((referral) => ({ ...referral, referred_profile: null }));
  const code = String(profile?.referral_code ?? "");
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://rnos.in";

  return {
    code,
    link: code ? `${baseUrl.replace(/\/$/, "")}/signup?ref=${encodeURIComponent(code)}` : "",
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

  await supabase.rpc("refresh_reward_wallet_summary", { p_user_id: userId });

  const [{ data: walletData }, { data: transactionData }, referralSummary] = await Promise.all([
    supabase.from("wallets").select("*").eq("user_id", userId).maybeSingle(),
    supabase
      .from("reward_transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit),
    getReferralSummary(userId),
  ]);

  const wallet = (walletData ?? null) as Wallet | null;
  const transactions = (transactionData ?? []) as RewardTransaction[];
  const soon = new Date();
  soon.setDate(soon.getDate() + 14);
  const expiringSoonAmount = transactions
    .filter((transaction) => {
      if (!["signup_bonus", "referral_bonus", "cashback", "admin_adjustment"].includes(transaction.type) || transaction.status !== "active" || !transaction.expires_at) {
        return false;
      }

      const expiry = new Date(transaction.expires_at);
      return expiry > new Date() && expiry <= soon;
    })
    .reduce((total, transaction) => total + toNumber(transaction.remaining_amount), 0);

  return {
    wallet,
    transactions,
    cashbackEarned: toNumber(wallet?.total_reward_earned ?? wallet?.total_cashback_earned),
    cashbackUsed: toNumber(wallet?.total_reward_redeemed ?? wallet?.total_cashback_used),
    expiringSoonAmount,
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

export function calculateCashbackAmount(orderAmount: number, rule: ServiceRewardRule | null, fallbackAmount?: number | null) {
  if (typeof fallbackAmount === "number" && fallbackAmount > 0) {
    return Math.max(0, fallbackAmount);
  }

  if (!rule) {
    return Math.round(orderAmount * 0.2);
  }

  if (rule.cashback_type === "fixed") {
    return Math.round(toNumber(rule.cashback_value));
  }

  return Math.round(orderAmount * (toNumber(rule.cashback_value) / 100));
}

export async function creditCashbackForApplication({
  userId,
  applicationId,
  serviceSlug,
  serviceSlugs,
  serviceName,
  orderAmount,
  cashbackAmount,
  createdBy,
}: {
  userId: string;
  applicationId: string;
  serviceSlug: string;
  serviceSlugs?: string[];
  serviceName: string;
  orderAmount: number;
  cashbackAmount?: number | null;
  expiryDays?: number | null;
  createdBy?: string | null;
}) {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    throw new Error("Supabase service role key is missing.");
  }

  const rule = await getRewardRuleForOrder(serviceSlugs?.length ? serviceSlugs : [serviceSlug]);
  const amount = calculateCashbackAmount(orderAmount, rule, cashbackAmount);

  if (amount <= 0) {
    return null;
  }

  const { data, error } = await supabase.rpc("credit_reward_points", {
    p_user_id: userId,
    p_type: "cashback",
    p_amount: amount,
    p_description: `${serviceName} cashback credited for future orders.`,
    p_reference_type: "application",
    p_reference_id: applicationId,
    p_created_by: createdBy ?? null,
    p_expires_at: getRewardExpiryDate(),
    p_metadata: {
      service_slug: serviceSlug,
      service_slugs: serviceSlugs ?? [serviceSlug],
      order_amount: orderAmount,
      rule_id: rule?.id ?? null,
    },
  });

  if (error) {
    throw error;
  }

  return data as string | null;
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

  const { data, error } = await supabase.rpc("redeem_reward_points", {
    p_user_id: userId,
    p_application_id: applicationId,
    p_service_name: serviceName,
    p_order_amount: orderAmount,
    p_requested_amount: requestedAmount,
    p_max_redemption_percent: maxRedemptionPercent,
  });

  if (error) {
    throw error;
  }

  return Number(data ?? 0);
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

  const { data, error } = await supabase.rpc("complete_referral_reward", {
    p_referred_user_id: userId,
    p_application_id: applicationId,
    p_created_by: createdBy ?? null,
  });

  if (error) {
    throw error;
  }

  return data as string | null;
}
