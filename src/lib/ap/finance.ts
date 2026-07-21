import type { APCommission, APCommissionStatus, APPayout, APWalletEntry, APWalletEntryType } from "@/lib/ap-types";

const CREDIT_TYPES: APWalletEntryType[] = ["commission_credit", "manual_credit", "bonus", "adjustment"];
const DEBIT_TYPES: APWalletEntryType[] = ["manual_debit", "payout_deduction", "penalty", "reversal"];

export function isWalletCredit(entryType: APWalletEntryType | string): boolean {
  return CREDIT_TYPES.includes(entryType as APWalletEntryType);
}

export function isWalletDebit(entryType: APWalletEntryType | string): boolean {
  return DEBIT_TYPES.includes(entryType as APWalletEntryType);
}

export function walletDirection(entryType: APWalletEntryType | string): "credit" | "debit" | "other" {
  if (isWalletCredit(entryType)) return "credit";
  if (isWalletDebit(entryType)) return "debit";
  return "other";
}

function safeAmount(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/** Aggregates from a full (unpaginated) wallet ledger. Call only with complete partner ledger. */
export function summarizeWalletLedger(ledger: APWalletEntry[]) {
  let totalCredits = 0;
  let totalDebits = 0;

  for (const entry of ledger) {
    const amt = Math.abs(safeAmount(entry.amount));
    if (isWalletCredit(entry.entry_type)) totalCredits += amt;
    if (isWalletDebit(entry.entry_type)) totalDebits += amt;
  }

  return {
    totalCredits,
    totalDebits,
    entryCount: ledger.length,
    /** Available balance = credits − debits (matches getAPWalletBalance). No locked field in schema. */
    availableBalance: totalCredits - totalDebits,
  };
}

/** Aggregates from a full commission list for one partner. */
export function summarizeCommissions(commissions: APCommission[]) {
  const sumBy = (statuses: APCommissionStatus[]) =>
    commissions
      .filter((c) => statuses.includes(c.status))
      .reduce((total, c) => total + safeAmount(c.calculated_amount), 0);

  return {
    totalEarned: commissions.reduce((t, c) => t + safeAmount(c.calculated_amount), 0),
    pending: sumBy(["pending", "earned"]),
    approved: sumBy(["approved"]),
    paid: sumBy(["paid"]),
    reversed: sumBy(["reversed"]),
    eligibleCount: commissions.filter((c) => !["cancelled", "reversed"].includes(c.status)).length,
    rowCount: commissions.length,
  };
}

/** Aggregates from a full payout list for one partner. */
export function summarizePayouts(payouts: APPayout[], availableBalance: number) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const pending = payouts
    .filter((p) => p.status === "requested" || p.status === "processing")
    .reduce((t, p) => t + safeAmount(p.amount), 0);

  const paidLifetime = payouts
    .filter((p) => p.status === "paid")
    .reduce((t, p) => t + safeAmount(p.amount), 0);

  const paidThisMonth = payouts
    .filter((p) => {
      if (p.status !== "paid") return false;
      const paidAt = p.paid_at || p.processed_at || p.updated_at;
      return paidAt >= monthStart;
    })
    .reduce((t, p) => t + safeAmount(p.amount), 0);

  return {
    availableForPayout: Math.max(0, availableBalance),
    pendingPayout: pending,
    paidThisMonth,
    lifetimePaid: paidLifetime,
  };
}

export type OnboardingChecklistItem = {
  id: string;
  label: string;
  complete: boolean;
  href: string;
};

export function buildOnboardingChecklist(input: {
  hasName: boolean;
  hasMobile: boolean;
  hasEmail: boolean;
  hasAddress: boolean;
  kycApproved: boolean;
  hasShopDetails: boolean;
  hasCustomer: boolean;
  hasApplication: boolean;
  hasCommission: boolean;
}): OnboardingChecklistItem[] {
  const profileComplete = input.hasName && input.hasMobile && input.hasEmail && input.hasAddress;

  return [
    { id: "profile", label: "Profile complete", complete: profileComplete, href: "/ap/profile" },
    { id: "kyc", label: "KYC approved", complete: input.kycApproved, href: "/ap/documents" },
    { id: "shop", label: "Shop details complete", complete: input.hasShopDetails, href: "/ap/profile" },
    { id: "customer", label: "First customer created", complete: input.hasCustomer, href: "/ap/customers" },
    { id: "application", label: "First application submitted", complete: input.hasApplication, href: "/ap/applications/new" },
    { id: "commission", label: "First commission earned", complete: input.hasCommission, href: "/ap/commissions" },
  ];
}
