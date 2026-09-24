import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

/**
 * A UPI QR payment reaches this app through exactly one door.
 *
 * A checkout payment belongs to an order, and the order already wrote a
 * `payments` row naming its application — matching that row is how the
 * webhook has always found what to settle. Money paid into a QR has no order
 * and no checkout, so there is no such row: it arrives as `qr_code.credited`
 * carrying only the QR's id.
 *
 * If that door is not wired, the customer's money is taken and the
 * application stays unpaid, with no commission and no notification. These
 * tests pin each link in that chain.
 */

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("the QR a customer pays into", () => {
  const source = read("src/lib/payments/upi-qr.ts");

  it("cannot be paid twice, and cannot be paid the wrong amount", () => {
    expect(source).toContain('usage: "single_use"');
    expect(source).toContain("fixed_amount: true");
    expect(source).toContain("payment_amount: amountPaise");
  });

  it("dies with its link, never sooner than Razorpay allows", () => {
    expect(source).toContain("close_by: closeBy");
    expect(source).toContain("MIN_CLOSE_BY_SECONDS");
    expect(source).toContain("Math.max(requestedCloseBy, nowSeconds + MIN_CLOSE_BY_SECONDS)");
  });

  it("never takes the link down with it when Razorpay refuses", () => {
    // QR Codes is an on-demand feature; an account without it must still be
    // able to issue payment links.
    const catchBlock = source.slice(source.indexOf("} catch (error) {"));
    expect(catchBlock).toContain("return null");
    expect(catchBlock).not.toContain("throw");
  });
});

describe("generation", () => {
  const source = read("src/app/api/payment-links/generate/route.ts");

  it("stores the QR id, which is all the webhook will have to match on", () => {
    expect(source).toContain("razorpay_qr_id: upiQr?.id ?? null");
  });

  it("does not mint a second QR for a link the customer already holds", () => {
    expect(source).toContain("upiQrImageUrl = liveLink.razorpay_qr_image_url ?? null");
  });

  it("closes the QR of a link it replaces", () => {
    expect(source).toContain("closeUpiQr(reusable.razorpay_qr_id)");
  });
});

describe("the webhook", () => {
  const source = read("src/app/api/razorpay/webhook/route.ts");

  it("handles qr_code.credited at all", () => {
    expect(source).toContain('payload.event === "qr_code.credited"');
  });

  it("finds the link by the QR id, since a QR payment has no order", () => {
    expect(source).toContain('.eq("razorpay_qr_id", qrCode.id)');
  });

  it("settles every application in the link's cart, not just the first", () => {
    expect(source).toContain('from("payment_link_applications")');
    expect(source).toContain("settleApplicationPayment(");
  });

  it("does not record the same QR payment twice when Razorpay retries", () => {
    expect(source).toContain('.eq("razorpay_payment_id", payment.id)');
    expect(source).toContain("if (!existingPayment)");
  });

  it("still verifies the signature before trusting any of it", () => {
    expect(source).toContain("verifyWebhookSignature");
    expect(source.indexOf("verifyWebhookSignature(rawBody")).toBeLessThan(
      source.indexOf('payload.event === "qr_code.credited"'),
    );
  });

  it("routes both kinds of payment through the same settlement", () => {
    const calls = source.match(/settleApplicationPayment\(/g) ?? [];
    expect(calls.length).toBe(2);
  });
});

describe("settlement", () => {
  const source = read("src/lib/payments/settle-application-payment.ts");

  it("still does everything the inline version did", () => {
    for (const step of [
      "markPaymentLinksPaid",          // the link
      "createCommissionForApplication", // the partner's money
      "scheduleCrmSyncMany",            // the office
      "triggerWhatsAppNotification",    // the customer
      "invoices",                       // the paperwork
    ]) {
      expect(source).toContain(step);
    }
  });

  it("never downgrades an application that is already verified", () => {
    expect(source).toContain('applicationPaymentUpdate.neq("payment_status", "verified")');
  });

  it("never drags a progressed application back to a payment stage", () => {
    expect(source).toContain("PAYMENT_STAGE_STATUSES");
    expect(source).toContain('.in("status", PAYMENT_STAGE_STATUSES)');
  });
});

describe("the migration", () => {
  const source = read("supabase/migrations/20260924170000_payment_link_upi_qr.sql");

  it("adds the QR columns idempotently and indexes the lookup", () => {
    expect(source).toContain("ADD COLUMN IF NOT EXISTS razorpay_qr_id text");
    expect(source).toContain("ADD COLUMN IF NOT EXISTS razorpay_qr_image_url text");
    expect(source).toContain("idx_payment_links_razorpay_qr_id");
  });
});
