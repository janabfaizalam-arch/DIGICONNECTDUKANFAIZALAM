/**
 * A DC Partner pays from their own wallet first at checkout.
 *
 * The wizard asked /api/create-order for the full price every time, so the
 * scores sitting in a partner's wallet could not be spent anywhere they
 * actually buy services. These pin the pieces that make it work.
 */
import { describe, expect, it } from "vitest";

import { readCode } from "@/lib/testing/source";
import { splitForPrice } from "@/lib/payments/wallet-application-payment";

const wizard = readCode("src/components/portal/partner-application-wizard.tsx");
const order = readCode("src/app/api/create-order/route.ts");
const settle = readCode("src/lib/payments/settle-application-payment.ts");
const wallet = readCode("src/lib/payments/wallet-application-payment.ts");

describe("the checkout offers the wallet", () => {
  it("shows the balance with a switch, on by default", () => {
    expect(wizard).toContain('fetch("/api/ap/wallet"');
    expect(wizard).toContain("Wallet use karein");
    expect(wizard).toContain("useState(true)");
  });

  it("asks the server to use it, and re-prepares when the switch changes", () => {
    expect(wizard).toContain("usePartnerWallet: useWallet && partnerWalletBalance > 0");
    expect(wizard).toMatch(/useWallet,\n\s*\}\),\n\s*\[cartItems, customer\.mobile, customer\.name, useWallet\]/);
    expect(wizard).toContain("replacesApplicationIds: lastPreparedIdsRef.current");
  });

  it("finishes without Razorpay when the wallet pays everything", () => {
    expect(wizard).toContain("if (orderData.wallet_only)");
    expect(wizard).toMatch(/orderData\.wallet_only[\s\S]{0,700}setCurrentStep\(6\)/);
  });
});

describe("the server takes the wallet's share first", () => {
  it("holds the share for partners only, before the Razorpay amount is fixed", () => {
    expect(order).toMatch(/usePartnerWallet === true && isPartnerFlow/);
    expect(order.indexOf("reserveWalletForApplication({")).toBeLessThan(order.indexOf("const expectedAmount = rupeesToPaise(freshPayableAmount)"));
    expect(order).toContain("finalAmountBeforeWallet - partnerWalletAmount");
  });

  it("never touches the customer's reward wallet for a partner payment", () => {
    expect(order).toContain("if (!paidFromPartnerWallet) try {");
  });

  it("gives the hold back when the request fails", () => {
    expect(order).toMatch(/ctx\.partnerReserve && response\.status >= 400[\s\S]{0,200}releaseReserve/);
  });

  it("claims the hold when the payment is verified, re-debiting one given back meanwhile", () => {
    expect(settle).toContain("const reserveId = held?.reserve_id");
    expect(settle).toContain("update({ wallet_reserve_id: claimId })");
    expect(settle).toContain('eq("reference_type", "wallet_refund")');
  });

  it("does not give back a hold an unpaid order still counts on", () => {
    expect(wallet).toContain('eq("metadata->partner_wallet->>reserve_id", id)');
  });
});

describe("the split", () => {
  it("covers what the balance allows and leaves the rest for Razorpay", () => {
    expect(splitForPrice(500, 200)).toMatchObject({ fromWallet: 200, fromRazorpay: 300 });
    expect(splitForPrice(150, 400)).toMatchObject({ fromWallet: 150, fromRazorpay: 0 });
    expect(splitForPrice(150, 24.9)).toMatchObject({ fromWallet: 24, fromRazorpay: 126 });
  });
});
