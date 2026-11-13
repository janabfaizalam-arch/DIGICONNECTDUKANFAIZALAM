/**
 * The partner buys the service, and the wallet pays first.
 *
 * ITR costs ₹100. The partner pays it, the ₹25 score lands in their wallet when
 * the work is done, and the next application costs them ₹75 at the counter.
 * Once ₹100 has built up it costs them nothing. What they charge their own
 * customer is not the platform's business and appears nowhere here.
 *
 * Two things in this file are about money leaving when it should not: the split
 * arithmetic, and that the server never takes the wallet's share from the
 * browser. A form that could name its own wallet credit is a form that can buy
 * a ₹100 service for ₹0.
 */

import { describe, expect, it } from "vitest";

import { readCode } from "@/lib/testing/source";
import { applyLedgerEntry } from "@/lib/ap-wallet";
import { splitForPrice } from "@/lib/payments/wallet-application-payment";
import { AP_WALLET_ENTRY_TYPE_LABELS } from "@/lib/ap-types";

const lib = readCode("src/lib/payments/wallet-application-payment.ts");
const route = readCode("src/app/api/ap/applications/route.ts");
const reserveRoute = readCode("src/app/api/ap/applications/wallet-split/route.ts");
const form = readCode("src/components/ap/ap-application-form.tsx");
const walletRoute = readCode("src/app/api/ap/wallet/route.ts");
const migration = readCode("supabase/migrations/20261113090000_partner_pays_from_wallet.sql");

/* ─────────────────────────────────────────────────────────────────────────
   The ₹100 / ₹25 walkthrough
   ───────────────────────────────────────────────────────────────────────── */

describe("what the wallet covers", () => {
  it("an empty wallet pays the whole price", () => {
    expect(splitForPrice(100, 0)).toMatchObject({ fromWallet: 0, fromRazorpay: 100 });
  });

  it("₹25 in the wallet leaves ₹75 at the counter", () => {
    expect(splitForPrice(100, 25)).toMatchObject({ fromWallet: 25, fromRazorpay: 75 });
  });

  it("₹500 built up buys the ₹100 service outright", () => {
    const split = splitForPrice(100, 500);
    expect(split.fromWallet).toBe(100);
    expect(split.fromRazorpay).toBe(0);
  });

  it("never spends more wallet than the price", () => {
    for (const balance of [101, 500, 10_000]) {
      expect(splitForPrice(100, balance).fromWallet).toBe(100);
    }
  });

  it("the two halves always add back up to the price", () => {
    for (const price of [0, 1, 49, 100, 349, 1199, 25_000]) {
      for (const balance of [0, 1, 25, 100, 500, 25_000]) {
        const split = splitForPrice(price, balance);
        expect(split.fromWallet + split.fromRazorpay).toBe(split.price);
      }
    }
  });

  it("a negative or junk balance is treated as empty, not as credit", () => {
    for (const balance of [-50, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(splitForPrice(100, balance as number).fromWallet).toBe(0);
    }
  });

  it("rounds a part-rupee balance down, so it can never overdraw", () => {
    // 24.9 in hand must not buy 25 of service.
    expect(splitForPrice(100, 24.9).fromWallet).toBe(24);
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   The ledger has to count the spend
   ───────────────────────────────────────────────────────────────────────── */

describe("application_spend in the balance", () => {
  it("is a debit", () => {
    expect(applyLedgerEntry(100, { amount: 25, entry_type: "application_spend" })).toBe(75);
  });

  it("is a debit even when the row carries a negative amount", () => {
    expect(applyLedgerEntry(100, { amount: -25, entry_type: "application_spend" })).toBe(75);
  });

  it("cannot be spent twice out of one credit", () => {
    // Without the debit the same ₹25 would pay for every application forever.
    const ledger = [
      { amount: 25, entry_type: "commission_credit" },
      { amount: 25, entry_type: "application_spend" },
      { amount: 25, entry_type: "application_spend" },
    ];
    expect(ledger.reduce(applyLedgerEntry, 0)).toBe(-25);
  });

  it("a released hold comes back as a credit", () => {
    // reverseEntry used to append `reversal`, which is a debit: the money left
    // twice. A release has to raise the balance or an abandoned form eats it.
    const released = applyLedgerEntry(75, { amount: 25, entry_type: "manual_credit" });
    expect(released).toBe(100);
  });

  it("reads as something the partner recognises in their ledger", () => {
    expect(AP_WALLET_ENTRY_TYPE_LABELS.application_spend).toBeTruthy();
  });

  it("the database allows the type the code writes", () => {
    expect(migration).toContain("'application_spend'");
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   The browser does not get to say what the wallet paid
   ───────────────────────────────────────────────────────────────────────── */

describe("the server decides the amount", () => {
  it("reads the wallet share from the ledger, not the request", () => {
    expect(route).toContain("checkReserve(");
    expect(route).toMatch(/walletAmount = reserve\.fromWallet/);
    // The form only names which hold to use.
    expect(route).toContain('formData.get("wallet_reserve_id")');
    expect(route).not.toMatch(/walletAmount\s*=\s*Number\(formData/);
  });

  it("checks the hold before it works out what Razorpay must show", () => {
    expect(route.indexOf("checkReserve(")).toBeLessThan(route.indexOf("const expectedAmountPaise"));
  });

  it("bills the price minus the wallet share", () => {
    expect(route).toMatch(/expectedAmountPaise = Math\.round\(\(finalCustomerFee - walletAmount\) \* 100\)/);
  });

  it("refuses a hold bigger than the price instead of billing a negative amount", () => {
    expect(route).toMatch(/walletAmount > finalCustomerFee/);
  });

  it("records on the application which hold it spent and how much", () => {
    expect(route).toContain("wallet_amount: walletAmount");
    expect(route).toContain("wallet_reserve_id: walletReserveId");
  });

  it("the payment row records what actually went through Razorpay", () => {
    // Counting the wallet share here too would make the partner look paid twice.
    expect(route).toMatch(/amount: Math\.max\(0, finalCustomerFee - walletAmount\)/);
  });

  it("one application per hold, enforced by the database as well", () => {
    expect(migration).toContain("applications_wallet_reserve_id_key");
    expect(migration).toContain("where wallet_reserve_id is not null");
    expect(lib).toContain('.eq("wallet_reserve_id"');
  });

  it("a hold belonging to another partner is refused", () => {
    expect(lib).toMatch(/agency_partner_id\)\s*!==\s*params\.agencyPartnerId/);
  });

  it("the reserve endpoint prices the service itself", () => {
    expect(reserveRoute).toContain('.from("agent_services")');
    expect(reserveRoute).not.toContain("input.price");
    expect(reserveRoute).not.toContain("input.amount");
  });

  it("an abandoned form gives its hold back before taking another", () => {
    expect(lib).toContain("findUnclaimedReserve");
    expect(lib.indexOf("releaseReserve(")).toBeLessThan(lib.indexOf("const split = await previewSplit"));
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   ₹100 means ₹100
   ───────────────────────────────────────────────────────────────────────── */

describe("the price is the whole price", () => {
  it("the form adds no GST", () => {
    // It used to show ₹118 for a ₹100 service and charge ₹100.
    expect(form).not.toContain("0.18");
    expect(form).not.toContain("GST");
    expect(form).not.toContain("grossTotal");
  });

  it("the partner pays the price minus the wallet, and nothing else", () => {
    expect(form).toMatch(/payableAmountPaise = Math\.round\(fromRazorpay \* 100\)/);
  });

  it("a full wallet skips the gateway entirely", () => {
    expect(form).toContain("needsRazorpay");
    expect(form).toMatch(/needsRazorpay && \(/);
  });

  it("the hold is taken before the payment step renders, not on a second tap", () => {
    expect(form).toContain("takeReserve()");
    expect(form.indexOf("takeReserve()")).toBeLessThan(form.indexOf("setCurrentStep(4)"));
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   Spend-only
   ───────────────────────────────────────────────────────────────────────── */

describe("the wallet is spent, not withdrawn", () => {
  it("a new withdrawal is refused by the server", () => {
    expect(walletRoute).toContain("410");
    expect(walletRoute).not.toContain("debitPayout");
  });

  it("the balance can still be read", () => {
    expect(walletRoute).toContain("getAPWalletBalance");
  });
});
