/**
 * The balance that gates a partner payout.
 *
 * `checkPayoutFraud` does I/O, so what is tested here is the arithmetic it now
 * delegates to — `applyLedgerEntry`, the canonical rule — at the dataset sizes
 * and shapes where the old inline copy in `ap-fraud.ts` gave a different
 * answer. A wrong balance here either blocks a legitimate payout or lets
 * through one that should have been stopped.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { applyLedgerEntry } from "@/lib/ap-wallet";

const source = (file: string) => readFileSync(join(process.cwd(), "src/lib", file), "utf8");

/** Fold a whole ledger the way `calculateWalletBalance` does. */
const balanceOf = (entries: { amount: unknown; entry_type: string }[]) =>
  entries.reduce(applyLedgerEntry, 0);

/** What the old inline copy in ap-fraud.ts computed, kept to pin the divergence. */
function legacyFraudBalance(entries: { amount: unknown; entry_type: string }[]) {
  const credit = ["commission_credit", "manual_credit", "bonus"];
  const debit = ["manual_debit", "payout_deduction", "penalty", "reversal"];
  return entries.reduce((total, e) => {
    if (credit.includes(e.entry_type)) return total + Number(e.amount);
    if (debit.includes(e.entry_type)) return total - Math.abs(Number(e.amount));
    return total + Number(e.amount);
  }, 0);
}

const credit = (amount: number) => ({ amount, entry_type: "commission_credit" });
const debit = (amount: number) => ({ amount, entry_type: "payout_deduction" });

describe("payout gate balance", () => {
  it("is zero for a partner with no ledger", () => {
    expect(balanceOf([])).toBe(0);
  });

  it("handles a single credit", () => {
    expect(balanceOf([credit(1_500)])).toBe(1_500);
  });

  it("is exact across 1,000 entries — where the old unbounded read stopped", () => {
    // PostgREST returns 1000 rows and stops, with no error. The arithmetic has
    // to be right at that line; the paging itself is calculateWalletBalance's,
    // which has always been paged.
    const ledger = Array.from({ length: 1_000 }, () => credit(100));

    expect(balanceOf(ledger)).toBe(100_000);
  });

  it("is exact at 1,001 and 2,500 entries", () => {
    expect(balanceOf(Array.from({ length: 1_001 }, () => credit(100)))).toBe(100_100);
    expect(balanceOf(Array.from({ length: 2_500 }, () => credit(100)))).toBe(250_000);
  });

  it("shows what truncation would have cost: a 2,500-entry ledger read as 1,000", () => {
    const ledger = Array.from({ length: 2_500 }, () => credit(100));
    const truncated = ledger.slice(0, 1_000);

    expect(balanceOf(ledger)).toBe(250_000);
    expect(balanceOf(truncated)).toBe(100_000);

    // A partner with ₹2.5L available, asking for ₹1.5L, was told they could not
    // afford it — the warning fired on a balance that was simply not read.
    const requested = 150_000;
    expect(requested > balanceOf(truncated)).toBe(true);
    expect(requested > balanceOf(ledger)).toBe(false);
  });

  it("nets credits against debits across a realistic ledger", () => {
    const ledger = [credit(1_200), credit(800), debit(500), { amount: -250, entry_type: "adjustment" }];

    expect(balanceOf(ledger)).toBe(1_250);
  });

  it("stops counting an unknown entry type as a credit — the rules had drifted", () => {
    // ap-fraud.ts used to add any unrecognised type to the balance, while the
    // canonical rule ignores it. A stray row therefore inflated the balance on
    // the payout check only, letting through a payout the ledger did not cover.
    const ledger = [credit(1_000), { amount: 5_000, entry_type: "something_new" }];

    expect(balanceOf(ledger)).toBe(1_000);
    expect(legacyFraudBalance(ledger)).toBe(6_000);
    expect(balanceOf(ledger)).not.toBe(legacyFraudBalance(ledger));
  });

  it("agrees with the old copy wherever the types are recognised", () => {
    // The divergence is confined to unknown types; everything else must be
    // unchanged, so this is a correctness fix and not a silent re-pricing.
    const ledger = [credit(1_200), credit(800), debit(500), { amount: 100, entry_type: "penalty" }];

    expect(balanceOf(ledger)).toBe(legacyFraudBalance(ledger));
  });

  it("treats a debit as a magnitude whichever sign it was stored with", () => {
    expect(balanceOf([credit(1_000), debit(200)])).toBe(800);
    expect(balanceOf([credit(1_000), debit(-200)])).toBe(800);
  });

  it("does not let a malformed amount poison the balance", () => {
    const ledger = [
      credit(1_000),
      { amount: null, entry_type: "commission_credit" },
      { amount: "abc", entry_type: "payout_deduction" },
    ];

    expect(balanceOf(ledger)).toBe(1_000);
  });

  it("decides the boundary on >, so a partner may draw their balance to zero", () => {
    const available = balanceOf([credit(5_000), debit(1_000)]);

    expect(available).toBe(4_000);
    expect(4_000 > available).toBe(false); // exactly the balance is allowed
    expect(4_001 > available).toBe(true); // a rupee more is not
  });

  it("is order-independent, so the page order of the ledger cannot change it", () => {
    // The old read had no `order by`, so which rows survived truncation was
    // arbitrary. Paging now returns all of them, and the fold must not care
    // what order they arrive in.
    const ledger = [credit(1_200), debit(500), credit(800), { amount: -250, entry_type: "adjustment" }];
    const reversed = [...ledger].reverse();

    expect(balanceOf(reversed)).toBe(balanceOf(ledger));
  });
});

describe("ap-fraud delegates rather than re-implementing", () => {
  const fraud = source("ap-fraud.ts");

  it("calls the canonical balance function", () => {
    expect(fraud).toContain("calculateWalletBalance");
  });

  it("no longer reads ap_wallet_ledger directly", () => {
    // The whole point: one implementation of a partner's balance, not two.
    expect(fraud).not.toContain('from("ap_wallet_ledger")');
  });

  it("fails closed when the balance cannot be read", () => {
    // An unreadable ledger previously produced an empty array, which looked
    // identical to a zero balance. On the one check standing between a request
    // and money being sent, that must raise a warning, not stay silent.
    expect(fraud).toContain("balanceResult.ok");
    expect(fraud).toContain("could not be verified");
  });
});
