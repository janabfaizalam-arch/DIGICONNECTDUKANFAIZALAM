import { describe, expect, it } from "vitest";

import {
  computeGst,
  computeTotal,
  daysUntilExpiry,
  defaultValidTill,
  effectiveStatus,
  getInsuranceQuotationPublicUrl,
  INSURANCE_GST_RATE,
  isoDateInDays,
  totalsAgree,
} from "@/lib/insurance-quotations";

/**
 * The three numbers on a quotation are the only ones a customer reads, and a
 * quotation is a figure the shop has to honour. These guard the arithmetic
 * that used to be typed by hand.
 */
describe("premium arithmetic", () => {
  it("charges eighteen per cent GST", () => {
    expect(INSURANCE_GST_RATE).toBe(0.18);
    expect(computeGst(10_000)).toBe(1800);
    expect(computeTotal(10_000, computeGst(10_000))).toBe(11_800);
  });

  it("rounds to the paisa so the same premium always gives the same tax", () => {
    // 2,499.99 x 0.18 = 449.9982 — must not reach the customer as that.
    expect(computeGst(2499.99)).toBe(450);
    expect(computeTotal(2499.99, 450)).toBe(2949.99);
    // And the float that would otherwise show up as 2949.9899999999998.
    expect(String(computeTotal(2499.99, 450))).toBe("2949.99");
  });

  it("refuses to invent tax on a premium that is not a number", () => {
    expect(computeGst(Number.NaN)).toBe(0);
    expect(computeGst(0)).toBe(0);
    expect(computeGst(-500)).toBe(0);
  });

  it("accepts a rounding difference but catches a real mismatch", () => {
    expect(totalsAgree(10_000, 1800, 11_800)).toBe(true);
    // A hand-rounded GST is a rounding difference, not an error.
    expect(totalsAgree(10_000, 1800, 11_801)).toBe(true);
    // A digit dropped from the total is.
    expect(totalsAgree(10_000, 1800, 1180)).toBe(false);
    expect(totalsAgree(10_000, 1800, 118_000)).toBe(false);
  });
});

describe("validity", () => {
  it("offers a quotation for fifteen days by default", () => {
    const from = new Date("2026-03-01T06:00:00Z");
    expect(isoDateInDays(15, from)).toBe("2026-03-16");
    expect(defaultValidTill()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("counts the last day as still valid", () => {
    // 23:59 IST on the valid_till date is inside the offer, not outside it.
    const lastDay = new Date("2026-03-16T17:00:00Z"); // 22:30 IST on the 16th
    expect(daysUntilExpiry("2026-03-16", lastDay)).toBeGreaterThanOrEqual(0);
  });

  it("goes negative once the date has passed", () => {
    expect(daysUntilExpiry("2026-03-16", new Date("2026-03-20T06:00:00Z"))).toBeLessThan(0);
  });

  it("has no opinion when no date was recorded", () => {
    expect(daysUntilExpiry(null)).toBeNull();
    expect(daysUntilExpiry("not a date")).toBeNull();
  });
});

describe("the status a customer is shown", () => {
  const past = "2026-01-01";
  const future = "2099-01-01";
  const now = new Date("2026-06-01T06:00:00Z");

  it("shows a lapsed quotation as expired, whatever the row says", () => {
    // The bug this replaces: nothing ever moved a quotation to "expired", so a
    // quote that ran out in January still greeted its customer as "Sent".
    expect(effectiveStatus({ status: "sent", valid_till: past }, now)).toBe("expired");
    expect(effectiveStatus({ status: "draft", valid_till: past }, now)).toBe("expired");
  });

  it("leaves a live quotation alone", () => {
    expect(effectiveStatus({ status: "sent", valid_till: future }, now)).toBe("sent");
  });

  it("never un-accepts or un-rejects a quotation because a date passed", () => {
    expect(effectiveStatus({ status: "accepted", valid_till: past }, now)).toBe("accepted");
    expect(effectiveStatus({ status: "rejected", valid_till: past }, now)).toBe("rejected");
  });
});

describe("the link a customer is sent", () => {
  it("falls back to this business's own domain", () => {
    // It used to fall back to digiconnectdukan.com, which this business does
    // not run — every shared link pointed at nothing.
    const url = getInsuranceQuotationPublicUrl("abc123");
    expect(url).toMatch(/^https:\/\/(www\.)?rnos\.in\/insurance-quotation\/abc123$/);
    expect(url).not.toContain("digiconnectdukan.com");
  });
});
