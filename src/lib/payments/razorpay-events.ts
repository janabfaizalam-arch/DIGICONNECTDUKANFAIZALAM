/**
 * Pure helpers for reading Razorpay webhook events. They live here rather than
 * in the route because Next.js restricts what a route file may export, and
 * these are worth testing on their own.
 */

/** Razorpay ids are safe alphanumerics; anything else never reaches a query filter. */
export function safeRazorpayId(value: string | null | undefined): string | null {
  const id = String(value ?? "").trim();
  return /^[a-zA-Z0-9_-]{1,64}$/.test(id) ? id : null;
}

export type MappedPaymentStatus = "verified" | "failed" | "pending";

/**
 * Map a Razorpay event to the status we store.
 *
 * `authorized` is deliberately not verified. An authorization is a hold on the
 * customer's money, not a transfer: it settles only when it is captured, and it
 * lapses if it never is. Treating it as paid submits the application, debits
 * the wallet, reserves the partner's commission and tells the customer their
 * payment succeeded -- for money that may never arrive.
 */
export function mapPaymentStatus(
  event: string | undefined,
  razorpayStatus: string | undefined,
): MappedPaymentStatus {
  if (event === "payment.failed" || razorpayStatus === "failed") {
    return "failed";
  }

  if (event === "payment.captured" || razorpayStatus === "captured") {
    return "verified";
  }

  return "pending";
}
