import "server-only";

export type CrmPaymentStatus = "Unpaid" | "Partially Paid" | "Paid";

export function toNumber(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Payment rules for office CRM:
 * - No payment → Unpaid
 * - Partial → Partially Paid
 * - Full → Paid
 * Balance always auto-calculated.
 */
export function resolveCrmPayment(input: {
  totalFee: unknown;
  amountReceived: unknown;
  paymentStatus?: string | null;
}): {
  totalFee: number;
  amountReceived: number;
  balance: number;
  paymentStatus: CrmPaymentStatus;
} {
  const totalFee = Math.max(0, toNumber(input.totalFee));
  let amountReceived = Math.max(0, toNumber(input.amountReceived));

  const raw = String(input.paymentStatus ?? "")
    .trim()
    .toLowerCase();

  // When DB says verified/paid but amount fields are empty, treat as full payment.
  if ((raw === "verified" || raw === "paid" || raw === "success") && amountReceived <= 0 && totalFee > 0) {
    amountReceived = totalFee;
  }

  if (amountReceived > totalFee) amountReceived = totalFee;
  const balance = Math.max(0, Math.round((totalFee - amountReceived) * 100) / 100);

  let paymentStatus: CrmPaymentStatus = "Unpaid";
  if (totalFee <= 0 && amountReceived <= 0) {
    paymentStatus = raw === "verified" || raw === "paid" ? "Paid" : "Unpaid";
  } else if (balance <= 0.009) {
    paymentStatus = "Paid";
  } else if (amountReceived > 0) {
    paymentStatus = "Partially Paid";
  } else {
    paymentStatus = "Unpaid";
  }

  return {
    totalFee: Math.round(totalFee * 100) / 100,
    amountReceived: Math.round(amountReceived * 100) / 100,
    balance,
    paymentStatus,
  };
}
