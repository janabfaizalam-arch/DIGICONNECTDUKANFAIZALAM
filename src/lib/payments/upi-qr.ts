import { getRazorpayClient } from "@/lib/razorpay";

/**
 * Mint a Razorpay UPI QR for one payment link.
 *
 * The QR the panel already draws encodes the link's /pay/<code> URL: it opens
 * a page, and the customer pays from there. This is the other kind -- a real
 * UPI QR that GPay or PhonePe pays straight from, with no page in between.
 *
 * Three things make it safe to hand to a customer:
 *
 *   single_use    it closes itself the moment it is paid, so a QR left on a
 *                 counter, screenshotted or forwarded cannot be paid twice
 *   fixed_amount  the customer cannot pay less than the cart, or more
 *   close_by      it dies with the link it belongs to
 *
 * `notes` carries the link's code purely so a human can read the Razorpay
 * dashboard; the webhook matches on the QR's id, which the caller stores.
 *
 * Minting is best effort. A link whose QR fails is still a working link with
 * a working page-based QR, so this returns null rather than throwing and
 * taking the whole generation down with it.
 */

/** Razorpay rejects a close_by less than 15 minutes out. */
const MIN_CLOSE_BY_SECONDS = 16 * 60;

export type UpiQr = {
  id: string;
  imageUrl: string | null;
};

export async function createUpiQrForPaymentLink(input: {
  code: string;
  amount: number;
  expiresAt: Date;
  description: string;
  customerName: string;
}): Promise<UpiQr | null> {
  const razorpay = getRazorpayClient();
  if (!razorpay) return null;

  const amountPaise = Math.round(input.amount * 100);
  if (!Number.isFinite(amountPaise) || amountPaise < 100) return null;

  const nowSeconds = Math.floor(Date.now() / 1000);
  const requestedCloseBy = Math.floor(input.expiresAt.getTime() / 1000);
  const closeBy = Math.max(requestedCloseBy, nowSeconds + MIN_CLOSE_BY_SECONDS);

  try {
    const qr = await razorpay.qrCode.create({
      type: "upi_qr",
      name: input.customerName.slice(0, 40),
      usage: "single_use",
      fixed_amount: true,
      payment_amount: amountPaise,
      description: input.description.slice(0, 120),
      close_by: closeBy,
      notes: { payment_link_code: input.code },
    });

    if (!qr?.id) return null;

    return { id: qr.id, imageUrl: qr.image_url ?? null };
  } catch (error) {
    // QR Codes is an on-demand Razorpay feature. If it is not enabled on the
    // account the call fails here, and the link simply goes out without one.
    console.error("[payments/upi-qr] Could not create a UPI QR:", error);
    return null;
  }
}

/**
 * Close a QR that is being replaced, so a link's old QR cannot still be paid.
 *
 * Failing to close is not worth failing the caller over: the replacement is
 * already minted, and the old QR expires on its own close_by.
 */
export async function closeUpiQr(qrId: string): Promise<void> {
  const razorpay = getRazorpayClient();
  if (!razorpay) return;

  try {
    await razorpay.qrCode.close(qrId);
  } catch (error) {
    console.error("[payments/upi-qr] Could not close a replaced QR:", error);
  }
}
