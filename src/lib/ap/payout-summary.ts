/**
 * The partner payout queue's headline figures.
 *
 * Pure, with no I/O, because these are money: "₹98,000 awaiting settlement" is
 * acted on. Keeping the arithmetic separate from the read means the counting
 * rules can be tested directly, including at the dataset sizes where the read
 * used to go wrong.
 */

export type PayoutSummary = {
  /** Payouts a partner has asked for and nobody has actioned. */
  requested: number;
  /** What those add up to — the money the business currently owes. */
  requestedAmount: number;
  /** In flight at the bank. */
  processing: number;
  /** What has actually left, over all time. */
  paidAmount: number;
};

export const EMPTY_PAYOUT_SUMMARY: PayoutSummary = {
  requested: 0,
  requestedAmount: 0,
  processing: 0,
  paidAmount: 0,
};

export type PayoutSummaryRow = {
  amount?: unknown;
  status?: unknown;
};

/**
 * `numeric` arrives from PostgREST as a string often enough that `+` would
 * concatenate rather than add, and a malformed value must contribute zero
 * rather than turning the whole total into NaN.
 */
function toAmount(value: unknown): number {
  const amount = typeof value === "string" ? Number(value) : (value as number);
  return Number.isFinite(amount) ? amount : 0;
}

/**
 * Status matching is case-insensitive.
 *
 * `PAYOUT_STATUSES` is lowercase and the application only ever writes those, so
 * for any row this code wrote it is a no-op. It rescues an imported or legacy
 * `"Paid"`, which would otherwise be counted as neither paid nor pending and
 * silently drop out of the totals — and it matches how the SQL aggregates in
 * `admin_dashboard_*` compare status, with `lower()`.
 */
function normalizeStatus(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

/**
 * Fold payout rows into the queue summary.
 *
 * Takes every payout, not a page of them: a queue that totals only what is on
 * screen tells an admin the business owes less than it does.
 */
export function summarisePayouts(rows: readonly PayoutSummaryRow[]): PayoutSummary {
  const summary: PayoutSummary = { ...EMPTY_PAYOUT_SUMMARY };

  for (const row of rows) {
    const status = normalizeStatus(row.status);
    const amount = toAmount(row.amount);

    if (status === "requested") {
      summary.requested += 1;
      summary.requestedAmount += amount;
    } else if (status === "processing") {
      summary.processing += 1;
    } else if (status === "paid") {
      summary.paidAmount += amount;
    }
    // `rejected` contributes to neither: the money went back to the partner's
    // wallet, so counting it as owed or as paid out would both be wrong.
  }

  return summary;
}

/** The statuses the summary actually reads, for narrowing the query. */
export const SUMMARISED_PAYOUT_STATUSES = ["requested", "processing", "paid"] as const;
