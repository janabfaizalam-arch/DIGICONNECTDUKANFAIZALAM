/**
 * Wallet totals for `/admin/wallet`.
 *
 * These cards said "Total Cashback Issued", "Total Redeemed" and "Total
 * Referrals" while being computed from the most recent 200 transactions and
 * the most recent 100 referral events. Past those sizes the numbers simply
 * stopped growing — which reads as a quiet business, not as a truncated query.
 *
 * Counts come from PostgreSQL via `count: "exact", head: true`; sums page
 * through with `.range()`. There is no RPC for these, and writing one needs a
 * migration verified against the live schema, which is not available here —
 * so this uses the paging route rather than inventing SQL.
 */

import { getRewardDirection, type RewardTransactionType } from "@/lib/wallet";
import { countRows, sumPages, toAmount } from "@/lib/supabase/paged-read";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * Every reward transaction type.
 *
 * Needed as a value, not just a type, because the credit/debit split has to be
 * pushed into the query — filtering in JS is what required reading every row.
 */
export const ALL_REWARD_TRANSACTION_TYPES = [
  "signup_referral_bonus",
  "referrer_bonus",
  "signup_bonus",
  "referrer_signup_bonus",
  "referrer_first_service_bonus",
  "legacy_wallet_migration",
  "first_service_cashback",
  "repeat_cashback",
  "redeem",
  "reversal",
  "referral_bonus",
  "cashback",
  "redemption",
  "expiry",
  "admin_adjustment",
] as const satisfies readonly RewardTransactionType[];

/**
 * Fails the build if a type is added to `RewardTransactionType` without being
 * added above. Without this the new type would be left out of the `in(...)`
 * filter and its money would vanish from the totals with nothing to notice it.
 */
type UnlistedRewardType = Exclude<
  RewardTransactionType,
  (typeof ALL_REWARD_TRANSACTION_TYPES)[number]
>;
const _everyRewardTypeIsListed: UnlistedRewardType extends never ? true : never = true;
void _everyRewardTypeIsListed;

/**
 * The types that put money into a wallet.
 *
 * Derived from `getRewardDirection` rather than re-listed, so the query and the
 * display logic cannot disagree about what a credit is.
 *
 * Note `reversal` counts as a credit here, which is what `getRewardDirection`
 * has always said. That is existing business logic and is preserved exactly;
 * whether a reversal should instead reduce "issued" is a separate question and
 * deliberately not changed in a correctness fix.
 */
export const CREDIT_REWARD_TYPES = ALL_REWARD_TRANSACTION_TYPES.filter(
  (type) => getRewardDirection(type) === "credit" && type !== "expiry",
);

/** Redemptions, as the card has always counted them. */
export const REDEEM_REWARD_TYPES = ["redeem"] as const;

/** The two bonuses the referral-rewards card totals. */
export const REFERRAL_REWARD_TYPES = [
  "referrer_signup_bonus",
  "referrer_first_service_bonus",
] as const;

export type WalletTotals = {
  totalIssued: number;
  totalRedeemed: number;
  totalReferralRewards: number;
  totalReferrals: number;
  /** False when any figure above had to stop early. */
  complete: boolean;
};

export const EMPTY_WALLET_TOTALS: WalletTotals = {
  totalIssued: 0,
  totalRedeemed: 0,
  totalReferralRewards: 0,
  totalReferrals: 0,
  complete: false,
};

export async function getWalletTotals(): Promise<WalletTotals> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ...EMPTY_WALLET_TOTALS };

  const amountsFor = (types: readonly string[], excludeReversed = false) => {
    const query = supabase.from("wallet_transactions").select("amount").in("type", [...types]);
    return excludeReversed ? query.neq("status", "reversed") : query;
  };

  const [issued, redeemed, referralRewards, referrals] = await Promise.all([
    sumPages(
      (from, to) => amountsFor(CREDIT_REWARD_TYPES).range(from, to),
      (row: { amount?: unknown }) => toAmount(row.amount),
      { label: "wallet_transactions.issued" },
    ),
    sumPages(
      (from, to) => amountsFor(REDEEM_REWARD_TYPES).range(from, to),
      (row: { amount?: unknown }) => toAmount(row.amount),
      { label: "wallet_transactions.redeemed" },
    ),
    sumPages(
      // The reversed exclusion matches what this query already did.
      (from, to) => amountsFor(REFERRAL_REWARD_TYPES, true).range(from, to),
      (row: { amount?: unknown }) => toAmount(row.amount),
      { label: "wallet_transactions.referralRewards" },
    ),
    // A count, so no rows cross the wire and `db.max_rows` cannot apply.
    countRows(
      () => supabase.from("referral_events").select("id", { count: "exact", head: true }),
      "referral_events.total",
    ),
  ]);

  return {
    totalIssued: issued.total,
    totalRedeemed: redeemed.total,
    totalReferralRewards: referralRewards.total,
    totalReferrals: referrals.count,
    complete: issued.complete && redeemed.complete && referralRewards.complete && referrals.ok,
  };
}
