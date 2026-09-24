import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Settle the payment links covering these applications.
 *
 * A link covers a whole cart, so it is reached through
 * `payment_link_applications` rather than by matching
 * `payment_links.application_id` — that column names only the first
 * application, so a two-service link paid through its second application
 * would never have been marked paid.
 *
 * Links written before the cart table existed have no cart rows, so the
 * legacy column is still checked as a fallback.
 *
 * Settlement is best effort by design: the payment itself has already
 * succeeded and been recorded against the applications by the time this runs.
 * A failure here is logged, never thrown, because failing the caller would
 * tell a customer their completed payment did not go through.
 */
export async function markPaymentLinksPaid(
  supabase: SupabaseClient,
  applicationIds: string[],
  payment: { paidAt: string; razorpayOrderId?: string | null; razorpayPaymentId?: string | null },
  logPrefix: string,
): Promise<void> {
  const ids = [...new Set(applicationIds.filter(Boolean))];
  if (!ids.length) return;

  try {
    const [cartResult, legacyResult] = await Promise.all([
      supabase.from("payment_link_applications").select("payment_link_id").in("application_id", ids),
      supabase.from("payment_links").select("id").in("application_id", ids).eq("status", "pending"),
    ]);

    const linkIds = [
      ...new Set([
        ...(cartResult.data ?? []).map((row) => row.payment_link_id as string),
        ...(legacyResult.data ?? []).map((row) => row.id as string),
      ]),
    ];

    if (!linkIds.length) return;

    const { error } = await supabase
      .from("payment_links")
      .update({
        status: "paid",
        paid_at: payment.paidAt,
        razorpay_order_id: payment.razorpayOrderId ?? null,
        razorpay_payment_id: payment.razorpayPaymentId ?? null,
        updated_at: payment.paidAt,
      })
      .in("id", linkIds)
      .eq("status", "pending");

    if (error) {
      console.error(`${logPrefix} Failed to update payment link status:`, error);
    }
  } catch (err) {
    console.error(`${logPrefix} Failed to update payment link status:`, err);
  }
}
