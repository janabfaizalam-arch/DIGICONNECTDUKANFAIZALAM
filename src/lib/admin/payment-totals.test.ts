import { describe, expect, it } from "vitest";

import {
  EMPTY_PAYMENT_TOTALS,
  FAILED_STATUSES,
  PENDING_STATUSES,
  VERIFIED_STATUSES,
  mapPaymentTotalsRow,
} from "./payment-totals";

describe("mapPaymentTotalsRow", () => {
  it("maps the RPC's four figures", () => {
    expect(
      mapPaymentTotalsRow({
        verified_sum_rupees: 1_234_567.89,
        verified_count: 4_821,
        pending_count: 137,
        failed_count: 42,
      }),
    ).toEqual({
      verifiedSum: 1_234_567.89,
      verifiedCount: 4_821,
      pendingCount: 137,
      failedCount: 42,
    });
  });

  it("reads numeric and bigint columns that arrived as JSON strings", () => {
    // PostgreSQL serialises `numeric` and `bigint` as strings. Trusting them as
    // numbers would make `verifiedSum + 0` concatenate, and a card would read
    // "₹12345670" for ₹1,234,567.
    expect(
      mapPaymentTotalsRow({
        verified_sum_rupees: "1234567.89",
        verified_count: "4821",
        pending_count: "137",
        failed_count: "42",
      }),
    ).toEqual({
      verifiedSum: 1_234_567.89,
      verifiedCount: 4_821,
      pendingCount: 137,
      failedCount: 42,
    });
  });

  it("reads a total far beyond the 1000-row cap, because the sum is the server's", () => {
    // The point of using the RPC: no rows cross the wire, so `db.max_rows`
    // cannot truncate anything regardless of how many payments exist.
    const totals = mapPaymentTotalsRow({
      verified_sum_rupees: "98765432.10",
      verified_count: "250000",
      pending_count: "0",
      failed_count: "0",
    });

    expect(totals.verifiedCount).toBe(250_000);
    expect(totals.verifiedSum).toBeCloseTo(98_765_432.1, 2);
  });

  it("returns zeroes for an instance with no payments", () => {
    expect(
      mapPaymentTotalsRow({
        verified_sum_rupees: 0,
        verified_count: 0,
        pending_count: 0,
        failed_count: 0,
      }),
    ).toEqual(EMPTY_PAYMENT_TOTALS);
  });

  it("handles a single payment", () => {
    const totals = mapPaymentTotalsRow({
      verified_sum_rupees: "1999",
      verified_count: "1",
      pending_count: "0",
      failed_count: "0",
    });

    expect(totals).toEqual({
      verifiedSum: 1_999,
      verifiedCount: 1,
      pendingCount: 0,
      failedCount: 0,
    });
  });

  it("falls back to zero for a missing or malformed field, never NaN", () => {
    // A NaN would render as an empty card rather than a wrong one, and would
    // propagate through any later arithmetic.
    expect(mapPaymentTotalsRow({})).toEqual(EMPTY_PAYMENT_TOTALS);

    expect(
      mapPaymentTotalsRow({
        verified_sum_rupees: null,
        verified_count: undefined,
        pending_count: "not a number",
        failed_count: {},
      }),
    ).toEqual(EMPTY_PAYMENT_TOTALS);
  });

  it("keeps a partial row's good fields", () => {
    const totals = mapPaymentTotalsRow({ verified_sum_rupees: "500", pending_count: "3" });

    expect(totals).toEqual({
      verifiedSum: 500,
      verifiedCount: 0,
      pendingCount: 3,
      failedCount: 0,
    });
  });
});

describe("payment status buckets", () => {
  it("matches the spellings the RPC compares against", () => {
    // These drive the fallback's `in(...)` filters. If they drifted from the
    // SQL, the RPC path and the fallback path would report different totals
    // for the same ledger — which is the bug this module was created to remove.
    expect([...VERIFIED_STATUSES]).toEqual(["verified", "paid"]);
    expect([...PENDING_STATUSES]).toEqual(["pending", "unpaid"]);
    expect([...FAILED_STATUSES]).toEqual(["failed", "cancelled", "canceled"]);
  });

  it("carries both spellings of cancelled, since both appear in the data", () => {
    expect(FAILED_STATUSES).toContain("cancelled");
    expect(FAILED_STATUSES).toContain("canceled");
  });

  it("keeps the buckets disjoint, so no payment is counted twice", () => {
    const all = [...VERIFIED_STATUSES, ...PENDING_STATUSES, ...FAILED_STATUSES];

    expect(new Set(all).size).toBe(all.length);
  });

  it("is lowercase throughout, matching the RPC's lower() comparison", () => {
    for (const status of [...VERIFIED_STATUSES, ...PENDING_STATUSES, ...FAILED_STATUSES]) {
      expect(status).toBe(status.toLowerCase());
    }
  });
});
