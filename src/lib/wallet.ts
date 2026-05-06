import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type WalletTransactionType = "cashback_credit" | "wallet_usage" | "refund_adjustment" | "admin_bonus";
export type WalletTransactionDirection = "credit" | "debit";
export type WalletTransactionStatus = "active" | "used" | "expired" | "reversed";

export type Wallet = {
  id: string;
  user_id: string;
  balance: number;
  total_cashback_earned: number;
  total_cashback_used: number;
  nearest_expiry_at: string | null;
  created_at: string;
  updated_at: string;
};

export type WalletTransaction = {
  id: string;
  wallet_id: string;
  user_id: string;
  application_id: string | null;
  campaign_id: string | null;
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

export type CashbackCampaign = {
  id: string;
  title: string;
  service_slug: string | null;
  service_name: string | null;
  cashback_type: "percentage" | "fixed";
  cashback_value: number;
  expiry_days: number;
  max_redemption_percent: number;
  active: boolean;
  starts_at: string;
  ends_at: string | null;
};

export type WalletSnapshot = {
  wallet: Wallet | null;
  transactions: WalletTransaction[];
  cashbackEarned: number;
  cashbackUsed: number;
  expiringSoonAmount: number;
};

export const walletMaxRedemptionPercent = 50;
export const defaultCashbackExpiryDays = 90;

function toNumber(value: unknown) {
  return Number(value ?? 0);
}

export function getWalletMaxUsable(orderAmount: number, walletBalance: number) {
  return Math.max(0, Math.min(walletBalance, Math.floor(orderAmount * (walletMaxRedemptionPercent / 100))));
}

export function getRealPayableAmount(orderAmount: number, walletAmount: number) {
  return Math.max(0, orderAmount - walletAmount);
}

export async function getWalletSnapshot(userId: string, limit = 20): Promise<WalletSnapshot> {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return { wallet: null, transactions: [], cashbackEarned: 0, cashbackUsed: 0, expiringSoonAmount: 0 };
  }

  await supabase.rpc("refresh_wallet_summary", { p_user_id: userId });

  const [{ data: walletData }, { data: transactionData }] = await Promise.all([
    supabase.from("wallets").select("*").eq("user_id", userId).maybeSingle(),
    supabase
      .from("wallet_transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit),
  ]);

  const wallet = (walletData ?? null) as Wallet | null;
  const transactions = (transactionData ?? []) as WalletTransaction[];
  const soon = new Date();
  soon.setDate(soon.getDate() + 14);
  const expiringSoonAmount = transactions
    .filter((transaction) => {
      if (transaction.direction !== "credit" || transaction.status !== "active" || !transaction.expires_at) {
        return false;
      }

      const expiry = new Date(transaction.expires_at);
      return expiry > new Date() && expiry <= soon;
    })
    .reduce((total, transaction) => total + toNumber(transaction.remaining_amount), 0);

  return {
    wallet,
    transactions,
    cashbackEarned: toNumber(wallet?.total_cashback_earned),
    cashbackUsed: toNumber(wallet?.total_cashback_used),
    expiringSoonAmount,
  };
}

export async function getActiveCashbackCampaign(serviceSlug: string) {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return null;
  }

  const now = new Date().toISOString();
  const { data } = await supabase
    .from("cashback_campaigns")
    .select("*")
    .eq("active", true)
    .or(`service_slug.eq.${serviceSlug},service_slug.is.null`)
    .lte("starts_at", now)
    .or(`ends_at.is.null,ends_at.gt.${now}`)
    .order("service_slug", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data ?? null) as CashbackCampaign | null;
}

export function calculateCashbackAmount(orderAmount: number, campaign: CashbackCampaign | null, fallbackAmount?: number | null) {
  if (typeof fallbackAmount === "number" && fallbackAmount > 0) {
    return Math.min(fallbackAmount, orderAmount);
  }

  if (!campaign) {
    return orderAmount;
  }

  if (campaign.cashback_type === "fixed") {
    return Math.min(toNumber(campaign.cashback_value), orderAmount);
  }

  return Math.min(orderAmount, Math.round(orderAmount * (toNumber(campaign.cashback_value) / 100)));
}

export async function creditCashbackForApplication({
  userId,
  applicationId,
  serviceSlug,
  serviceName,
  orderAmount,
  cashbackAmount,
  expiryDays,
  createdBy,
}: {
  userId: string;
  applicationId: string;
  serviceSlug: string;
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

  const campaign = await getActiveCashbackCampaign(serviceSlug);
  const amount = calculateCashbackAmount(orderAmount, campaign, cashbackAmount);

  if (amount <= 0) {
    return null;
  }

  const { data, error } = await supabase.rpc("credit_wallet_cashback", {
    p_user_id: userId,
    p_application_id: applicationId,
    p_service_name: serviceName,
    p_order_amount: orderAmount,
    p_cashback_amount: amount,
    p_expiry_days: expiryDays ?? campaign?.expiry_days ?? defaultCashbackExpiryDays,
    p_created_by: createdBy ?? null,
    p_campaign_id: campaign?.id ?? null,
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
}: {
  userId: string;
  applicationId: string;
  serviceName: string;
  orderAmount: number;
  requestedAmount: number;
}) {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    throw new Error("Supabase service role key is missing.");
  }

  const { data, error } = await supabase.rpc("redeem_wallet_balance", {
    p_user_id: userId,
    p_application_id: applicationId,
    p_service_name: serviceName,
    p_order_amount: orderAmount,
    p_requested_amount: requestedAmount,
  });

  if (error) {
    throw error;
  }

  return Number(data ?? 0);
}
