import { getSupabaseAdmin } from "@/lib/supabase/admin";

type SupabaseAdmin = NonNullable<ReturnType<typeof getSupabaseAdmin>>;

export type WalletResolverInput = {
  userIds: string[];
  customerIds?: string[];
};

export type ResolvedUserWalletFacts = {
  walletBalance: number;
  cashbackEarned: number;
  referralsCount: number;
  sourceUsed: "new" | "legacy" | "none";
};

type AnyRow = Record<string, unknown>;

function unique(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean)));
}

function amount(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function isActiveStatus(value: unknown) {
  const status = String(value ?? "posted").toLowerCase();
  return !["reversed", "failed", "cancelled", "rejected", "expired"].includes(status);
}

function rowMatches(row: AnyRow, ids: Set<string>) {
  return ["user_id", "customer_id", "profile_id", "referrer_user_id", "referred_user_id", "referrer_id", "referred_id"].some((key) => row[key] && ids.has(String(row[key])));
}

async function safeRead(supabase: SupabaseAdmin, table: string) {
  try {
    const { data, error } = await supabase.from(table).select("*").limit(5000);
    if (error) return [];
    return (data ?? []) as AnyRow[];
  } catch {
    return [];
  }
}

function sumNewTransactions(rows: AnyRow[]) {
  return rows.reduce<{ credits: number; debits: number }>(
    (totals, row) => {
      if (!isActiveStatus(row.status)) return totals;
      const value = amount(row.amount);
      if (row.direction === "credit") {
        totals.credits += value;
      } else if (row.direction === "debit") {
        totals.debits += value;
      }
      return totals;
    },
    { credits: 0, debits: 0 },
  );
}

function legacyWalletAmount(row: AnyRow | null) {
  if (!row) return 0;
  return amount(row.balance_points) || amount(row.balance) || amount(row.wallet_balance) || amount(row.cashback_balance) || amount(row.amount);
}

function legacyCashbackAmount(row: AnyRow | null) {
  if (!row) return 0;
  return amount(row.lifetime_earned) || amount(row.total_cashback_earned) || amount(row.cashback_earned) || amount(row.cashback_balance) || legacyWalletAmount(row);
}

function sumLegacyTransactions(rows: AnyRow[]) {
  return rows.reduce<{ credits: number; debits: number; referrals: number }>(
    (totals, row) => {
      if (!isActiveStatus(row.status)) return totals;
      const value = amount(row.amount ?? row.points);
      const type = String(row.type ?? row.transaction_type ?? "").toLowerCase();
      const direction = String(row.direction ?? "").toLowerCase();
      const isDebit = direction === "debit" || type.includes("redeem") || type.includes("debit") || value < 0;
      const absolute = Math.abs(value);

      if (isDebit) {
        totals.debits += absolute;
      } else {
        totals.credits += absolute;
      }

      if (type.includes("referrer") || type.includes("referral")) {
        totals.referrals += 1;
      }

      return totals;
    },
    { credits: 0, debits: 0, referrals: 0 },
  );
}

export async function resolveUserWalletFacts(input: WalletResolverInput): Promise<ResolvedUserWalletFacts> {
  const supabase = getSupabaseAdmin();
  const ids = new Set(unique([...(input.userIds ?? []), ...(input.customerIds ?? [])]));

  if (!supabase || ids.size === 0) {
    return { walletBalance: 0, cashbackEarned: 0, referralsCount: 0, sourceUsed: "none" };
  }

  const [rewardWallets, walletTransactions, referralEvents] = await Promise.all([
    safeRead(supabase, "reward_wallets"),
    safeRead(supabase, "wallet_transactions"),
    safeRead(supabase, "referral_events"),
  ]);
  const matchedRewardWallet = rewardWallets.find((row) => row.user_id && ids.has(String(row.user_id))) ?? null;
  const matchedNewTransactions = walletTransactions.filter((row) => row.user_id && ids.has(String(row.user_id)));
  const matchedReferralEvents = referralEvents.filter((row) => row.referrer_user_id && ids.has(String(row.referrer_user_id)));
  const newTransactionTotals = sumNewTransactions(matchedNewTransactions);
  const newWalletBalance = amount(matchedRewardWallet?.balance) || Math.max(0, newTransactionTotals.credits - newTransactionTotals.debits);
  const newCashbackEarned = amount(matchedRewardWallet?.lifetime_earned) || newTransactionTotals.credits;
  const newReferralsCount = matchedReferralEvents.length;

  if (newWalletBalance > 0 || newCashbackEarned > 0 || newReferralsCount > 0) {
    return {
      walletBalance: newWalletBalance,
      cashbackEarned: newCashbackEarned,
      referralsCount: newReferralsCount,
      sourceUsed: "new",
    };
  }

  const [wallets, rewardTransactions, customerWallets, cashbackWallets, referrals] = await Promise.all([
    safeRead(supabase, "wallets"),
    safeRead(supabase, "reward_transactions"),
    safeRead(supabase, "customer_wallets"),
    safeRead(supabase, "cashback_wallets"),
    safeRead(supabase, "referrals"),
  ]);
  const legacyWallet =
    [...wallets, ...customerWallets, ...cashbackWallets].find((row) => rowMatches(row, ids)) ?? null;
  const matchedLegacyTransactions = rewardTransactions.filter((row) => rowMatches(row, ids));
  const legacyTransactionTotals = sumLegacyTransactions(matchedLegacyTransactions);
  const legacyReferralRows = referrals.filter((row) => row.referrer_id && ids.has(String(row.referrer_id)));
  const legacyWalletBalance = legacyWalletAmount(legacyWallet) || Math.max(0, legacyTransactionTotals.credits - legacyTransactionTotals.debits);
  const legacyCashbackEarned = legacyCashbackAmount(legacyWallet) || legacyTransactionTotals.credits;
  const legacyReferralsCount = legacyReferralRows.length || legacyTransactionTotals.referrals;

  if (legacyWalletBalance > 0 || legacyCashbackEarned > 0 || legacyReferralsCount > 0) {
    return {
      walletBalance: legacyWalletBalance,
      cashbackEarned: legacyCashbackEarned,
      referralsCount: legacyReferralsCount,
      sourceUsed: "legacy",
    };
  }

  return { walletBalance: 0, cashbackEarned: 0, referralsCount: 0, sourceUsed: "none" };
}
