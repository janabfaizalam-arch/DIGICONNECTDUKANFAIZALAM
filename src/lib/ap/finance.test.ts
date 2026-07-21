import { describe, expect, it } from "vitest";

import {
  buildOnboardingChecklist,
  isWalletCredit,
  isWalletDebit,
  summarizeCommissions,
  summarizePayouts,
  summarizeWalletLedger,
  walletDirection,
} from "./finance";
import type { APCommission, APPayout, APWalletEntry } from "@/lib/ap-types";

describe("wallet direction helpers", () => {
  it("classifies credit and debit entry types", () => {
    expect(isWalletCredit("commission_credit")).toBe(true);
    expect(isWalletDebit("payout_deduction")).toBe(true);
    expect(walletDirection("bonus")).toBe("credit");
    expect(walletDirection("penalty")).toBe("debit");
  });
});

describe("summarizeWalletLedger", () => {
  it("aggregates credits and debits from a full ledger", () => {
    const ledger = [
      { amount: 1000, entry_type: "commission_credit" },
      { amount: 200, entry_type: "payout_deduction" },
      { amount: 50, entry_type: "bonus" },
    ] as APWalletEntry[];

    expect(summarizeWalletLedger(ledger)).toEqual({
      totalCredits: 1050,
      totalDebits: 200,
      entryCount: 3,
      availableBalance: 850,
    });
  });

  it("handles empty ledger", () => {
    expect(summarizeWalletLedger([])).toEqual({
      totalCredits: 0,
      totalDebits: 0,
      entryCount: 0,
      availableBalance: 0,
    });
  });
});

describe("summarizeCommissions", () => {
  it("uses status buckets without inventing rows", () => {
    const rows = [
      { calculated_amount: 100, status: "pending" },
      { calculated_amount: 200, status: "approved" },
      { calculated_amount: 300, status: "paid" },
      { calculated_amount: 40, status: "reversed" },
      { calculated_amount: 10, status: "cancelled" },
    ] as APCommission[];

    const summary = summarizeCommissions(rows);
    expect(summary.totalEarned).toBe(650);
    expect(summary.pending).toBe(100);
    expect(summary.approved).toBe(200);
    expect(summary.paid).toBe(300);
    expect(summary.reversed).toBe(40);
    expect(summary.eligibleCount).toBe(3);
  });

  it("does not invent totals when the list is empty", () => {
    expect(summarizeCommissions([])).toEqual({
      totalEarned: 0,
      pending: 0,
      approved: 0,
      paid: 0,
      reversed: 0,
      eligibleCount: 0,
      rowCount: 0,
    });
  });
});

describe("summarizePayouts", () => {
  it("computes pending and paid metrics from real payout rows", () => {
    const payouts = [
      { amount: 500, status: "requested", paid_at: null, processed_at: null, updated_at: "2026-01-01" },
      { amount: 700, status: "paid", paid_at: "2026-07-10T10:00:00.000Z", processed_at: null, updated_at: "2026-07-10" },
    ] as APPayout[];

    const summary = summarizePayouts(payouts, 1200);
    expect(summary.availableForPayout).toBe(1200);
    expect(summary.pendingPayout).toBe(500);
    expect(summary.lifetimePaid).toBe(700);
  });

  it("never invents available balance above the trusted wallet figure", () => {
    expect(summarizePayouts([], -50).availableForPayout).toBe(0);
  });
});

describe("buildOnboardingChecklist", () => {
  it("marks items only when real flags are true", () => {
    const items = buildOnboardingChecklist({
      hasName: true,
      hasMobile: true,
      hasEmail: false,
      hasAddress: true,
      kycApproved: true,
      hasShopDetails: false,
      hasCustomer: true,
      hasApplication: false,
      hasCommission: false,
    });

    expect(items.find((i) => i.id === "profile")?.complete).toBe(false);
    expect(items.find((i) => i.id === "kyc")?.complete).toBe(true);
    expect(items.find((i) => i.id === "customer")?.complete).toBe(true);
    expect(items.find((i) => i.id === "application")?.complete).toBe(false);
  });
});
