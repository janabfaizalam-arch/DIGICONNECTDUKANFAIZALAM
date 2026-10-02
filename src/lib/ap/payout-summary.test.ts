import { describe, expect, it } from "vitest";

import {
  EMPTY_PAYOUT_SUMMARY,
  SUMMARISED_PAYOUT_STATUSES,
  summarisePayouts,
} from "./payout-summary";

const payout = (status: string, amount: unknown = 1_000) => ({ status, amount });

describe("summarisePayouts", () => {
  it("returns zeroes for no payouts", () => {
    // A new instance shows ₹0 owed, not a blank card or NaN.
    expect(summarisePayouts([])).toEqual(EMPTY_PAYOUT_SUMMARY);
  });

  it("handles a single payout", () => {
    expect(summarisePayouts([payout("requested", 4_250)])).toEqual({
      requested: 1,
      requestedAmount: 4_250,
      processing: 0,
      paidAmount: 0,
    });
  });

  it("separates what is owed, in flight, and already paid", () => {
    const summary = summarisePayouts([
      payout("requested", 1_000),
      payout("requested", 2_500),
      payout("processing", 5_000),
      payout("paid", 7_250),
      payout("paid", 750),
    ]);

    expect(summary).toEqual({
      requested: 2,
      requestedAmount: 3_500,
      // `processing` is counted but not totalled: the money has not left yet
      // and is no longer claimable, so it belongs in neither amount.
      processing: 1,
      paidAmount: 8_000,
    });
  });

  it("excludes rejected payouts from both totals", () => {
    // A rejection credits the money back to the partner's wallet. Counting it
    // as owed would double-count it; counting it as paid would say money left
    // the business when it did not.
    const summary = summarisePayouts([
      payout("requested", 1_000),
      payout("rejected", 9_999),
      payout("paid", 2_000),
    ]);

    expect(summary).toEqual({
      requested: 1,
      requestedAmount: 1_000,
      processing: 0,
      paidAmount: 2_000,
    });
  });

  it("totals 1,000 payouts — the size where the old unbounded read broke", () => {
    // PostgREST returns 1000 rows and stops, with no error. The arithmetic has
    // to be right at and beyond that line; the read that feeds it is covered in
    // paged-read.test.ts.
    const rows = Array.from({ length: 1_000 }, () => payout("requested", 500));

    expect(summarisePayouts(rows)).toEqual({
      requested: 1_000,
      requestedAmount: 500_000,
      processing: 0,
      paidAmount: 0,
    });
  });

  it("stays exact across 2,500 payouts spanning every status", () => {
    const rows = Array.from({ length: 2_500 }, (_, index) => {
      if (index % 4 === 0) return payout("requested", 100);
      if (index % 4 === 1) return payout("processing", 200);
      if (index % 4 === 2) return payout("paid", 300);
      return payout("rejected", 400);
    });

    expect(summarisePayouts(rows)).toEqual({
      requested: 625,
      requestedAmount: 62_500,
      processing: 625,
      paidAmount: 187_500,
    });
  });

  it("totals across many partners, since the queue is business-wide", () => {
    // The summary is not per-partner: 50 partners with one requested payout
    // each is 50 requests, not 1.
    const rows = Array.from({ length: 50 }, (_, partner) => payout("requested", (partner + 1) * 10));

    const summary = summarisePayouts(rows);

    expect(summary.requested).toBe(50);
    // 10 + 20 + … + 500
    expect(summary.requestedAmount).toBe(12_750);
  });

  it("reads a numeric column that arrived as a string", () => {
    // PostgREST serialises `numeric` as a string; `+` on those concatenates.
    const summary = summarisePayouts([payout("requested", "1500.50"), payout("paid", "2499.50")]);

    expect(summary.requestedAmount).toBe(1500.5);
    expect(summary.paidAmount).toBe(2499.5);
  });

  it("treats a malformed amount as zero rather than poisoning the total", () => {
    const summary = summarisePayouts([
      payout("requested", 1_000),
      payout("requested", null),
      payout("requested", "not a number"),
      // An absent `amount` column, not a defaulted one.
      { status: "requested" },
    ]);

    // Still four requests — the row exists even if its amount does not parse.
    expect(summary.requested).toBe(4);
    expect(summary.requestedAmount).toBe(1_000);
  });

  it("matches status case-insensitively, like the SQL aggregates do", () => {
    // The app only writes lowercase, so this is a no-op for rows it wrote. It
    // rescues a legacy or imported "Paid", which would otherwise vanish from
    // both totals.
    const summary = summarisePayouts([
      payout("Requested", 100),
      payout("  PAID  ", 200),
      payout("Processing", 300),
    ]);

    expect(summary).toEqual({
      requested: 1,
      requestedAmount: 100,
      processing: 1,
      paidAmount: 200,
    });
  });

  it("ignores a missing or unknown status instead of guessing", () => {
    const summary = summarisePayouts([
      { amount: 500 },
      { status: null, amount: 500 },
      payout("archived", 500),
    ]);

    expect(summary).toEqual(EMPTY_PAYOUT_SUMMARY);
  });

  it("narrows the query to exactly the statuses it reads", () => {
    // If a status were added to the summary but not to this list, the query
    // would stop transferring the rows it needs and the total would drop
    // silently. This pins the two together.
    expect([...SUMMARISED_PAYOUT_STATUSES]).toEqual(["requested", "processing", "paid"]);

    const counted = ["requested", "processing", "paid"];
    for (const status of counted) {
      const summary = summarisePayouts([payout(status, 1)]);
      const touched =
        summary.requested + summary.processing + summary.requestedAmount + summary.paidAmount;
      expect(touched).toBeGreaterThan(0);
    }
  });
});
