import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  calculateCashbackForFreshPayment,
  calculateMaxWalletRedeem,
} from "@/lib/reward-rules";
import { ensureRewardWallet } from "@/lib/wallet-ledger";

export type RewardWallet = {
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

export type WalletLedgerTransaction = {
  id: string;
  user_id: string;
  type:
    | "signup_bonus"
    | "referrer_signup_bonus"
    | "referrer_first_service_bonus"
    | "first_service_cashback"
    | "repeat_cashback"
    | "redeem"
    | "legacy_wallet_migration"
    | "admin_adjustment"
    | "reversal";
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

export function calculateMaxRedeem(amount: number, walletBalance = Number.POSITIVE_INFINITY) {
  return calculateMaxWalletRedeem(amount, walletBalance);
}

export function calculateExpectedCashback({
  freshPaidAmount,
  isFirstService,
}: {
  freshPaidAmount: number;
  isFirstService: boolean;
}) {
  const amount = Math.max(0, freshPaidAmount);
  return calculateCashbackForFreshPayment(amount, isFirstService);
}

export async function createWalletIfMissing(userId: string) {
  return ensureRewardWallet(userId);
}

export async function getWallet(userId: string) {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return null;
  }

  await createWalletIfMissing(userId);

  const { data, error } = await supabase.from("reward_wallets").select("*").eq("user_id", userId).maybeSingle();

  if (error) {
    throw error;
  }

  return (data ?? null) as RewardWallet | null;
}

export async function postWalletTransaction({
  userId,
  type,
  direction,
  amount,
  idempotencyKey,
  applicationId,
  paymentId,
  referredUserId,
  referrerUserId,
  note,
  metadata,
  createdBy,
}: {
  userId: string;
  type: WalletLedgerTransaction["type"];
  direction: WalletLedgerTransaction["direction"];
  amount: number;
  idempotencyKey: string;
  applicationId?: string | null;
  paymentId?: string | null;
  referredUserId?: string | null;
  referrerUserId?: string | null;
  note?: string | null;
  metadata?: Record<string, unknown>;
  createdBy?: string | null;
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

  return data as WalletLedgerTransaction;
}

export async function redeemWalletForApplication({
  userId,
  applicationId,
  applicationAmount,
  requestedAmount,
  paymentId,
  createdBy,
}: {
  userId: string;
  applicationId: string;
  applicationAmount: number;
  requestedAmount: number;
  paymentId?: string | null;
  createdBy?: string | null;
}) {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    throw new Error("Supabase service role key is missing.");
  }

  const { data, error } = await supabase.rpc("redeem_reward_wallet_for_application", {
    p_user_id: userId,
    p_application_id: applicationId,
    p_order_amount: applicationAmount,
    p_requested_amount: requestedAmount,
    p_payment_id: paymentId ?? null,
    p_created_by: createdBy ?? null,
  });

  if (error) {
    throw error;
  }

  return data as WalletLedgerTransaction | null;
}

export async function processRewardsOnApplicationCompleted(applicationId: string, createdBy?: string | null) {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    throw new Error("Supabase service role key is missing.");
  }

  const { data, error } = await supabase.rpc("process_rewards_on_application_completed", {
    p_application_id: applicationId,
    p_created_by: createdBy ?? null,
  });

  if (error) {
    throw error;
  }

  return data as {
    processed?: boolean;
    already_processed?: boolean;
    first_service?: boolean;
    cashback_amount?: number;
    cashback_transaction_id?: string | null;
    referrer_transaction_id?: string | null;
    reason?: string;
  };
}

export async function calculateCashback(userId: string, application: { fresh_payable_amount?: number | null; real_payment_amount?: number | null }) {
  const supabase = getSupabaseAdmin();
  const freshPaidAmount = Number(application.fresh_payable_amount ?? application.real_payment_amount ?? 0);

  if (!supabase) {
    return calculateExpectedCashback({ freshPaidAmount, isFirstService: false });
  }

  const { data } = await supabase.from("profiles").select("first_service_cashback_awarded").eq("id", userId).maybeSingle();

  return calculateExpectedCashback({
    freshPaidAmount,
    isFirstService: !Boolean(data?.first_service_cashback_awarded),
  });
}

export async function reverseWalletTransaction(transactionId: string, reason: string, createdBy?: string | null) {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    throw new Error("Supabase service role key is missing.");
  }

  const { data, error } = await supabase.rpc("reverse_reward_wallet_transaction", {
    p_transaction_id: transactionId,
    p_reason: reason,
    p_created_by: createdBy ?? null,
  });

  if (error) {
    throw error;
  }

  return data as WalletLedgerTransaction;
}

/**
 * Process cashback and referral rewards immediately after Razorpay payment verification.
 * This calls the same process_rewards_on_application_completed RPC but the migration
 * will update it to also accept 'submitted' status (which is set during verify-payment).
 *
 * Returns cashback info if processed, or already_processed if idempotent replay.
 */
export async function processRewardsOnPaymentVerified(applicationId: string, createdBy?: string | null) {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    throw new Error("Supabase service role key is missing.");
  }

  const { data, error } = await supabase.rpc("process_rewards_on_payment_verified", {
    p_application_id: applicationId,
    p_created_by: createdBy ?? null,
  });

  if (error) {
    throw error;
  }

  return data as {
    processed?: boolean;
    already_processed?: boolean;
    first_service?: boolean;
    cashback_amount?: number;
    cashback_transaction_id?: string | null;
    referrer_transaction_id?: string | null;
    reason?: string;
  };
}
