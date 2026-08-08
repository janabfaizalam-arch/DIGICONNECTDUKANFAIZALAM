import { describe, expect, it } from "vitest";

import { applyLedgerEntry } from "@/lib/ap-wallet";

describe("applyLedgerEntry", () => {
  it("adds credit entry types", () => {
    expect(applyLedgerEntry(0, { amount: 500, entry_type: "commission_credit" })).toBe(500);
    expect(applyLedgerEntry(100, { amount: 50, entry_type: "manual_credit" })).toBe(150);
    expect(applyLedgerEntry(100, { amount: 25, entry_type: "bonus" })).toBe(125);
  });

  it("subtracts debit entry types by magnitude, whatever sign was stored", () => {
    // Historic rows carry debits as both positive and negative amounts, so the
    // magnitude is what counts — a stored -200 must not credit the partner.
    expect(applyLedgerEntry(1000, { amount: 200, entry_type: "payout_deduction" })).toBe(800);
    expect(applyLedgerEntry(1000, { amount: -200, entry_type: "payout_deduction" })).toBe(800);
    expect(applyLedgerEntry(1000, { amount: 100, entry_type: "penalty" })).toBe(900);
    expect(applyLedgerEntry(1000, { amount: 300, entry_type: "reversal" })).toBe(700);
    expect(applyLedgerEntry(1000, { amount: 50, entry_type: "manual_debit" })).toBe(950);
  });

  it("uses the sign of the amount for adjustments", () => {
    expect(applyLedgerEntry(1000, { amount: 250, entry_type: "adjustment" })).toBe(1250);
    expect(applyLedgerEntry(1000, { amount: -250, entry_type: "adjustment" })).toBe(750);
  });

  it("ignores unknown entry types rather than corrupting the balance", () => {
    expect(applyLedgerEntry(1000, { amount: 999, entry_type: "something_new" })).toBe(1000);
  });

  it("treats unparseable amounts as zero", () => {
    expect(applyLedgerEntry(1000, { amount: null, entry_type: "commission_credit" })).toBe(1000);
    expect(applyLedgerEntry(1000, { amount: "abc", entry_type: "commission_credit" })).toBe(1000);
    expect(applyLedgerEntry(1000, { amount: undefined, entry_type: "penalty" })).toBe(1000);
  });

  it("reproduces a full earn → payout ledger", () => {
    const ledger = [
      { amount: 1200, entry_type: "commission_credit" },
      { amount: 800, entry_type: "commission_credit" },
      { amount: 200, entry_type: "bonus" },
      { amount: 500, entry_type: "payout_deduction" },
      { amount: 100, entry_type: "penalty" },
      { amount: -50, entry_type: "adjustment" },
    ];
    expect(ledger.reduce(applyLedgerEntry, 0)).toBe(1550);
  });
});
