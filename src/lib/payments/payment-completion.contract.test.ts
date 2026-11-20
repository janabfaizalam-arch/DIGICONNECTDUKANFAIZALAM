import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

/**
 * A paid order has to end up complete whichever way the money is confirmed.
 *
 * Wallet debit, cashback and the invoice used to run only in the browser's
 * verify call. A customer who closed the tab during the Razorpay redirect kept
 * the wallet credits their discount was based on, got no cashback and had no
 * invoice, while the webhook still marked the application paid. These pin the
 * arrangement that fixed it: one settlement, reached from every path.
 */

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("the shared settlement", () => {
  const source = read("src/lib/payments/settle-application-payment.ts");

  it("owns the money steps, not just the status flags", () => {
    expect(source).toContain("redeemWalletForApplication");
    expect(source).toContain("processRewardsOnPaymentVerified");
    expect(source).toContain("createInvoiceForApplication");
  });

  it("reads prior state before updating, so the money steps run once", () => {
    // The transition set is computed from a read that happens before any
    // update; without that, a replayed webhook would re-run everything.
    const priorRead = source.indexOf('select("id, payment_status, metadata, wallet_reserve_id")');
    const firstUpdate = source.indexOf("applicationPaymentUpdate");

    expect(priorRead).toBeGreaterThan(-1);
    expect(priorRead).toBeLessThan(firstUpdate);
  });

  it("messages only the applications that just became paid", () => {
    expect(source).toContain("for (const appId of transitionedIds)");
  });

  it("raises the invoice before the WhatsApp message", () => {
    // The invoice's own message already says "paid, here is your invoice", and
    // payment_success is skipped when it went out, so the order matters.
    expect(source.indexOf("createInvoiceForApplication")).toBeLessThan(
      source.indexOf("triggerWhatsAppNotification"),
    );
  });
});

describe("every payment path reaches it", () => {
  it("the browser verify call, the webhook, and the UPI QR branch", () => {
    expect(read("src/app/api/verify-payment/route.ts")).toContain("settleApplicationPayment");
    expect(read("src/app/api/razorpay/webhook/route.ts")).toContain("settleApplicationPayment");
  });

  it("credit reports and print jobs are completed by the webhook too", () => {
    const webhook = read("src/app/api/razorpay/webhook/route.ts");
    expect(webhook).toContain("completeCreditPayment");
    expect(webhook).toContain("completePrintPayment");
  });
});

describe("only captured money counts as paid", () => {
  it("the webhook does not accept an authorization on its own", () => {
    const events = read("src/lib/payments/razorpay-events.ts");
    // The mapping must not list "authorized" as a verified status.
    const verifiedBranch = events.slice(events.indexOf('=== "captured"'));
    expect(verifiedBranch.slice(0, 120)).not.toContain("authorized");
  });

  it("reconciliation does not sweep an authorization into paid", () => {
    const source = read("src/lib/admin-payment-reconciliation.ts");
    expect(source).not.toContain('status === "captured" || status === "authorized"');
  });

  it("the browser verify call confirms the capture with Razorpay", () => {
    expect(read("src/app/api/verify-payment/route.ts")).toContain("assertPaymentCaptured");
  });
});

describe("orders are never created anonymously", () => {
  it("create-order requires a session before it reaches Razorpay", () => {
    const source = read("src/app/api/create-order/route.ts");
    const guard = source.indexOf("if (!orderUserId)");
    const createsOrder = source.lastIndexOf("razorpay.orders.create");

    expect(guard).toBeGreaterThan(-1);
    expect(guard).toBeLessThan(createsOrder);
  });
});

describe("the checkout button", () => {
  it("enters its pending state, so a double click cannot open two orders", () => {
    expect(read("src/components/payments/razorpay-checkout-button.tsx")).toContain("setIsPending(true)");
  });
});
