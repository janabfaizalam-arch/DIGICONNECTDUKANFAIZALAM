import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

import {
  PAYOUT_STATUSES,
  allowedTransitions,
  canTransition,
  checkTransition,
  describeTransition,
  isPayoutStatus,
  refundsWallet,
  requiresPaymentReference,
} from "@/lib/ap-payout-transitions";

const root = process.cwd();
const readSrc = (rel: string) => readFileSync(join(root, rel), "utf8");

describe("payout transitions", () => {
  it("lets a request be processed, paid or rejected", () => {
    expect(canTransition("requested", "processing")).toBe(true);
    expect(canTransition("requested", "paid")).toBe(true);
    expect(canTransition("requested", "rejected")).toBe(true);
  });

  it("treats paid and rejected as final", () => {
    // Re-opening either would double-count: the money has already moved.
    expect(allowedTransitions("paid")).toEqual([]);
    expect(allowedTransitions("rejected")).toEqual([]);
    expect(canTransition("paid", "rejected")).toBe(false);
    expect(canTransition("rejected", "paid")).toBe(false);
  });

  it("refuses to move a payout to its current status", () => {
    const result = checkTransition({ from: "requested", to: "requested" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/already requested/i);
  });

  it("explains what a final payout can do", () => {
    const result = checkTransition({ from: "paid", to: "processing" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/final/i);
  });

  it("requires a payment reference before marking paid", () => {
    // Without one the transfer cannot be reconciled against the bank later.
    expect(requiresPaymentReference("paid")).toBe(true);
    expect(checkTransition({ from: "requested", to: "paid" }).ok).toBe(false);
    expect(checkTransition({ from: "requested", to: "paid", paymentReference: "   " }).ok).toBe(false);
    expect(checkTransition({ from: "requested", to: "paid", paymentReference: "UTR123" }).ok).toBe(true);
  });

  it("does not demand a reference for any other transition", () => {
    expect(checkTransition({ from: "requested", to: "rejected" }).ok).toBe(true);
    expect(checkTransition({ from: "requested", to: "processing" }).ok).toBe(true);
  });

  it("only refunds the wallet on rejection", () => {
    // The debit happened at request time, so a rejected payout must be
    // credited back or the partner is simply out of pocket.
    expect(refundsWallet("rejected")).toBe(true);
    for (const status of ["requested", "processing", "paid"] as const) {
      expect(refundsWallet(status), status).toBe(false);
    }
  });

  it("rejects unknown statuses from either side", () => {
    expect(isPayoutStatus("cancelled")).toBe(false);
    expect(isPayoutStatus(null)).toBe(false);
    expect(checkTransition({ from: "nonsense", to: "paid" }).ok).toBe(false);
    expect(checkTransition({ from: "requested", to: "nonsense" }).ok).toBe(false);
  });

  it("warns before the two transitions that move money", () => {
    expect(describeTransition("paid", 5000)).toMatch(/cannot be undone/i);
    expect(describeTransition("rejected", 5000)).toMatch(/back into the partner/i);
    expect(describeTransition("processing", 5000)).toBeNull();
  });

  it("covers every status in the table", () => {
    for (const status of PAYOUT_STATUSES) {
      expect(Array.isArray(allowedTransitions(status)), status).toBe(true);
    }
  });
});

describe("payout processing", () => {
  const lib = readSrc("src/lib/ap-payouts.ts");

  it("refunds before writing the rejected status", () => {
    // Marking it rejected without returning the money loses the money.
    expect(lib.indexOf("reverseEntry(")).toBeLessThan(lib.indexOf('.from("ap_payouts")\n    .update(patch)'));
    expect(lib).toMatch(/refund\.ok[\s\S]{0,300}left unchanged/);
  });

  it("conditions the write on the status it read", () => {
    // Two admins clicking at once must not both pay the same payout.
    expect(lib).toMatch(/\.eq\("status", from\)/);
    expect(lib).toMatch(/changed by someone else/);
  });

  it("records who acted and when", () => {
    expect(lib).toContain("processed_by");
    expect(lib).toContain("paid_at");
  });
});

describe("the gap this closes", () => {
  it("gives payouts an admin screen and route", () => {
    // A partner's wallet is debited the moment they request, and a partial
    // unique index allows one active payout at a time — so with nothing able
    // to process a request, the money was stuck and the partner was blocked
    // from ever requesting again.
    expect(() => readSrc("src/app/admin/ap-payouts/page.tsx")).not.toThrow();
    expect(() => readSrc("src/app/api/admin/ap-payouts/[id]/route.ts")).not.toThrow();
  });
});
