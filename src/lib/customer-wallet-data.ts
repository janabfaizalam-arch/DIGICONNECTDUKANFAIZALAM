import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type CustomerWalletTransaction = {
  id: string;
  type: string;
  direction: "credit" | "debit";
  amount: number;
  status: string;
  note: string | null;
  idempotency_key: string | null;
  application_id: string | null;
  created_at: string;
};

export type CustomerReferral = {
  id: string;
  referred_user_id: string;
  referred_name: string | null;
  status: string;
  reward_amount: number;
  created_at: string;
};

export type CustomerWalletData = {
  balance: number;
  totalEarned: number;
  totalUsed: number;
  transactions: CustomerWalletTransaction[];
  referralCode: string;
  referralLink: string;
  referrals: CustomerReferral[];
  referralCount: number;
  referralEarned: number;
  isFirstServiceCashbackUsed: boolean;
};

function numberValue(value: unknown) {
  const nextValue = Number(value ?? 0);
  return Number.isFinite(nextValue) ? nextValue : 0;
}

export async function getCustomerWalletData(userId: string): Promise<CustomerWalletData> {
  const supabase = getSupabaseAdmin();
  const empty: CustomerWalletData = {
    balance: 0,
    totalEarned: 0,
    totalUsed: 0,
    transactions: [],
    referralCode: "",
    referralLink: "",
    referrals: [],
    referralCount: 0,
    referralEarned: 0,
    isFirstServiceCashbackUsed: false,
  };

  if (!supabase) {
    return empty;
  }

  const [walletResult, transactionsResult, profileResult, referralEventsResult, referrerRewardsResult] = await Promise.all([
    supabase
      .from("reward_wallets")
      .select("balance, lifetime_earned, lifetime_redeemed")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("wallet_transactions")
      .select("id, type, direction, amount, status, note, idempotency_key, application_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("profiles")
      .select("referral_code, first_service_cashback_awarded")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("referral_events")
      .select("id, referred_user_id, referral_code, referrer_reward_status, referrer_signup_reward_status, created_at")
      .eq("referrer_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("wallet_transactions")
      .select("referred_user_id, amount")
      .eq("user_id", userId)
      .in("type", ["referrer_signup_bonus", "referrer_first_service_bonus"])
      .neq("status", "reversed"),
  ]);

  if (walletResult.error) {
    console.error("[customer-wallet] Wallet summary failed", { userId, error: walletResult.error });
  }

  if (transactionsResult.error) {
    console.error("[customer-wallet] Transactions failed", { userId, error: transactionsResult.error });
  }

  const referralCode = String(profileResult.data?.referral_code ?? "");
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://rnos.in";
  const referralLink = referralCode ? `${baseUrl.replace(/\/$/, "")}/signup?ref=${encodeURIComponent(referralCode)}` : "";

  // Build referral list with reward amounts
  const rewardsByReferredUser = ((referrerRewardsResult.data ?? []) as Array<{ referred_user_id: string | null; amount: number | null }>)
    .reduce<Record<string, number>>((grouped, row) => {
      if (row.referred_user_id) {
        grouped[row.referred_user_id] = (grouped[row.referred_user_id] ?? 0) + numberValue(row.amount);
      }
      return grouped;
    }, {});

  const referrals: CustomerReferral[] = (referralEventsResult.data ?? []).map((event) => ({
    id: String(event.id),
    referred_user_id: String(event.referred_user_id),
    referred_name: null,
    status: event.referrer_reward_status === "credited" ? "completed" : "pending",
    reward_amount: rewardsByReferredUser[String(event.referred_user_id)] ?? 0,
    created_at: String(event.created_at),
  }));

  const referralEarned = referrals
    .filter((r) => r.status === "completed")
    .reduce((total, r) => total + r.reward_amount, 0);

  // Check if first service cashback has been used
  const isFirstServiceCashbackUsed = Boolean(profileResult.data?.first_service_cashback_awarded);

  return {
    balance: numberValue(walletResult.data?.balance),
    totalEarned: numberValue(walletResult.data?.lifetime_earned),
    totalUsed: numberValue(walletResult.data?.lifetime_redeemed),
    transactions: (transactionsResult.data ?? []).map((transaction) => ({
      id: String(transaction.id),
      type: String(transaction.type ?? ""),
      direction: transaction.direction === "debit" ? "debit" : "credit",
      amount: numberValue(transaction.amount),
      status: String(transaction.status ?? "posted"),
      note: transaction.note ? String(transaction.note) : null,
      idempotency_key: transaction.idempotency_key ? String(transaction.idempotency_key) : null,
      application_id: transaction.application_id ? String(transaction.application_id) : null,
      created_at: String(transaction.created_at),
    })),
    referralCode,
    referralLink,
    referrals,
    referralCount: referrals.length,
    referralEarned,
    isFirstServiceCashbackUsed,
  };
}
