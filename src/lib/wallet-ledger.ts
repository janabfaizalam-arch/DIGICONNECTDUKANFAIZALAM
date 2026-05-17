import {
  MAX_WALLET_REDEEM_PERCENT,
  SIGNUP_BONUS_AMOUNT,
  calculateMaxWalletRedeem,
} from "@/lib/reward-rules";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type CanonicalWalletTransactionType =
  | "signup_bonus"
  | "referrer_signup_bonus"
  | "referrer_first_service_bonus"
  | "first_service_cashback"
  | "repeat_cashback"
  | "redeem"
  | "legacy_wallet_migration"
  | "admin_adjustment"
  | "reversal";

export type CanonicalWalletTransaction = {
  id: string;
  user_id: string;
  type: CanonicalWalletTransactionType;
  direction: "credit" | "debit";
  amount: number;
  balance_after: number;
  application_id?: string | null;
  payment_id?: string | null;
  referred_user_id?: string | null;
  referrer_user_id?: string | null;
  idempotency_key: string;
  status: "pending" | "posted" | "reversed";
  note?: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
  created_by?: string | null;
};

export type CanonicalRewardWallet = {
  id: string;
  user_id: string;
  balance: number;
  lifetime_earned: number;
  lifetime_redeemed: number;
  frozen?: boolean;
  suspicious?: boolean;
  admin_note?: string | null;
  created_at: string;
  updated_at: string;
};

export async function ensureRewardWallet(userId: string) {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    throw new Error("Supabase service role key is missing.");
  }

  const { data, error } = await supabase.rpc("create_reward_wallet_if_missing", { p_user_id: userId });

  if (error) {
    throw error;
  }

  return data as CanonicalRewardWallet;
}

export async function postWalletCredit({
  userId,
  amount,
  type,
  idempotencyKey,
  applicationId,
  paymentId,
  referredUserId,
  referrerUserId,
  metadata,
  createdBy,
  note,
}: {
  userId: string;
  amount: number;
  type: CanonicalWalletTransactionType;
  idempotencyKey: string;
  applicationId?: string | null;
  paymentId?: string | null;
  referredUserId?: string | null;
  referrerUserId?: string | null;
  metadata?: Record<string, unknown>;
  createdBy?: string | null;
  note?: string | null;
}) {
  return postWalletEntry({
    userId,
    amount,
    type,
    direction: "credit",
    idempotencyKey,
    applicationId,
    paymentId,
    referredUserId,
    referrerUserId,
    metadata,
    createdBy,
    note,
  });
}

export async function postWalletDebit({
  userId,
  amount,
  type,
  idempotencyKey,
  applicationId,
  paymentId,
  metadata,
  createdBy,
  note,
}: {
  userId: string;
  amount: number;
  type: CanonicalWalletTransactionType;
  idempotencyKey: string;
  applicationId?: string | null;
  paymentId?: string | null;
  metadata?: Record<string, unknown>;
  createdBy?: string | null;
  note?: string | null;
}) {
  return postWalletEntry({
    userId,
    amount,
    type,
    direction: "debit",
    idempotencyKey,
    applicationId,
    paymentId,
    metadata,
    createdBy,
    note,
  });
}

async function postWalletEntry({
  userId,
  amount,
  type,
  direction,
  idempotencyKey,
  applicationId,
  paymentId,
  referredUserId,
  referrerUserId,
  metadata,
  createdBy,
  note,
}: {
  userId: string;
  amount: number;
  type: CanonicalWalletTransactionType;
  direction: "credit" | "debit";
  idempotencyKey: string;
  applicationId?: string | null;
  paymentId?: string | null;
  referredUserId?: string | null;
  referrerUserId?: string | null;
  metadata?: Record<string, unknown>;
  createdBy?: string | null;
  note?: string | null;
}) {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    throw new Error("Supabase service role key is missing.");
  }

  const { data, error } = await supabase.rpc("post_reward_wallet_transaction", {
    p_user_id: userId,
    p_type: type,
    p_direction: direction,
    p_amount: amount,
    p_idempotency_key: idempotencyKey,
    p_application_id: applicationId ?? null,
    p_payment_id: paymentId ?? null,
    p_referred_user_id: referredUserId ?? null,
    p_referrer_user_id: referrerUserId ?? null,
    p_note: note ?? null,
    p_metadata: metadata ?? {},
    p_created_by: createdBy ?? null,
  });

  if (error) {
    throw error;
  }

  return data as CanonicalWalletTransaction;
}

export async function creditSignupBonus(userId: string, createdBy?: string | null) {
  await ensureRewardWallet(userId);

  return postWalletCredit({
    userId,
    amount: SIGNUP_BONUS_AMOUNT,
    type: "signup_bonus",
    idempotencyKey: `signup_bonus_500:${userId}`,
    metadata: { closed_loop: true },
    createdBy: createdBy ?? userId,
    note: "Signup bonus credited to DigiConnect Reward Wallet",
  });
}

export async function getWalletBalance(userId: string) {
  const wallet = await ensureRewardWallet(userId);
  return Number(wallet.balance ?? 0);
}

export async function getWalletSnapshot(userId: string, limit = 20) {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return { wallet: null, transactions: [] as CanonicalWalletTransaction[] };
  }

  await ensureRewardWallet(userId);

  const [{ data: wallet }, { data: transactions }] = await Promise.all([
    supabase.from("reward_wallets").select("*").eq("user_id", userId).maybeSingle(),
    supabase
      .from("wallet_transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit),
  ]);

  return {
    wallet: (wallet ?? null) as CanonicalRewardWallet | null,
    transactions: (transactions ?? []) as CanonicalWalletTransaction[],
  };
}

export async function reconcileWalletBalance(userId: string) {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    throw new Error("Supabase service role key is missing.");
  }

  const { data, error } = await supabase.rpc("reconcile_reward_wallet_balance", { p_user_id: userId });

  if (error) {
    throw error;
  }

  return data as CanonicalRewardWallet;
}

export async function migrateLegacyWalletIfNeeded(userId: string) {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    throw new Error("Supabase service role key is missing.");
  }

  const { data, error } = await supabase.rpc("migrate_legacy_wallet_if_needed", { p_user_id: userId });

  if (error) {
    throw error;
  }

  return data as CanonicalWalletTransaction | null;
}

export function getMaxWalletRedeemForService(serviceAmount: number, walletBalance: number) {
  return calculateMaxWalletRedeem(serviceAmount, walletBalance);
}

export { MAX_WALLET_REDEEM_PERCENT };
