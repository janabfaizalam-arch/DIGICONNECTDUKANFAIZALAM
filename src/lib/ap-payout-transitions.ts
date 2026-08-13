/**
 * Payout status rules, with no I/O so they can be tested directly.
 *
 * The wallet is debited the moment a partner requests a payout, and a partial
 * unique index allows only one active payout per partner. Together that means
 * a payout with nowhere to go traps the partner's money *and* blocks them from
 * ever requesting again — so which transitions are legal, and which of them
 * must return the money, are the rules that matter here.
 */

export const PAYOUT_STATUSES = [
  "requested",
  "processing",
  "paid",
  "rejected",
] as const;

export type PayoutStatus = (typeof PAYOUT_STATUSES)[number];

export function isPayoutStatus(value: unknown): value is PayoutStatus {
  return typeof value === "string" && (PAYOUT_STATUSES as readonly string[]).includes(value);
}

/**
 * Where each status can go next.
 *
 * `paid` and `rejected` are terminal: money has either left the business or
 * gone back to the partner, and re-opening either would double-count.
 */
const ALLOWED: Record<PayoutStatus, PayoutStatus[]> = {
  requested: ["processing", "paid", "rejected"],
  processing: ["paid", "rejected"],
  paid: [],
  rejected: [],
};

export function allowedTransitions(from: PayoutStatus): PayoutStatus[] {
  return ALLOWED[from] ?? [];
}

export function canTransition(from: PayoutStatus, to: PayoutStatus): boolean {
  return allowedTransitions(from).includes(to);
}

/**
 * Rejecting is the only transition that moves money back.
 *
 * The debit happened at request time, so a rejected payout must be credited
 * back or the partner is simply out of pocket.
 */
export function refundsWallet(to: PayoutStatus): boolean {
  return to === "rejected";
}

/** Marking paid needs a reference so the transfer can be reconciled later. */
export function requiresPaymentReference(to: PayoutStatus): boolean {
  return to === "paid";
}

export type TransitionCheck =
  | { ok: true }
  | { ok: false; error: string };

export function checkTransition(input: {
  from: unknown;
  to: unknown;
  paymentReference?: string | null;
}): TransitionCheck {
  if (!isPayoutStatus(input.from)) {
    return { ok: false, error: "This payout has an unrecognised status." };
  }
  if (!isPayoutStatus(input.to)) {
    return { ok: false, error: "That is not a valid payout status." };
  }
  if (input.from === input.to) {
    return { ok: false, error: `This payout is already ${input.from}.` };
  }
  if (!canTransition(input.from, input.to)) {
    const options = allowedTransitions(input.from);
    return {
      ok: false,
      error: options.length
        ? `A ${input.from} payout can only move to ${options.join(" or ")}.`
        : `A ${input.from} payout is final and cannot be changed.`,
    };
  }
  if (requiresPaymentReference(input.to) && !String(input.paymentReference ?? "").trim()) {
    return { ok: false, error: "Add the bank or UPI reference before marking this payout paid." };
  }

  return { ok: true };
}

/** Wording for the confirmation prompt on a transition that moves money. */
export function describeTransition(to: PayoutStatus, amount: number): string | null {
  const money = `₹${amount.toLocaleString("en-IN")}`;
  if (to === "paid") {
    return `Mark ${money} as paid? Do this only after the transfer has actually gone out — it cannot be undone.`;
  }
  if (to === "rejected") {
    return `Reject this ${money} payout? The amount goes back into the partner's wallet and they can request again.`;
  }
  return null;
}
