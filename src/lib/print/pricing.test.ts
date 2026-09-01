import { describe, expect, it } from "vitest";

import { DEFAULT_RATES, RATE_LIMITS, clampRate, priceFor } from "@/lib/print/stations";

describe("what a print costs", () => {
  it("multiplies pages by copies at the shop's own rate", () => {
    expect(priceFor(DEFAULT_RATES, { pages: 10, copies: 2, paperSize: "A4", colorMode: "mono" })).toBe(40);
    expect(priceFor(DEFAULT_RATES, { pages: 3, copies: 1, paperSize: "A3", colorMode: "color" })).toBe(60);
  });

  it("charges each shop's own rate, not a platform one", () => {
    const cheaper = { ...DEFAULT_RATES, a4_mono: 1.5 };
    expect(priceFor(cheaper, { pages: 10, copies: 1, paperSize: "A4", colorMode: "mono" })).toBe(15);
  });

  it("never prices a job at zero or a fraction of a paisa", () => {
    // Rounded to paise: a rate of 1.5 on an odd page count must not produce
    // a total the payment gateway will refuse.
    const odd = priceFor({ ...DEFAULT_RATES, a4_mono: 1.5 }, { pages: 3, copies: 1, paperSize: "A4", colorMode: "mono" });
    expect(odd).toBe(4.5);
    expect(Number.isInteger(odd * 100)).toBe(true);
  });

  it("treats zero or negative pages as one", () => {
    // A browser can send anything; a job still has to cost something.
    expect(priceFor(DEFAULT_RATES, { pages: 0, copies: 0, paperSize: "A4", colorMode: "mono" })).toBe(2);
    expect(priceFor(DEFAULT_RATES, { pages: -5, copies: -1, paperSize: "A4", colorMode: "mono" })).toBe(2);
  });
});

describe("a shop's rate stays inside what the platform allows", () => {
  it("holds a sensible rate as typed", () => {
    expect(clampRate(3.5, 2)).toBe(3.5);
  });

  it("pulls an absurd rate back to the limit", () => {
    // A customer scanning a QR has already walked into the shop; the price
    // should not be a surprise they discover at payment.
    expect(clampRate(9999, 2)).toBe(RATE_LIMITS.max);
    expect(clampRate(0, 2)).toBe(RATE_LIMITS.min);
    expect(clampRate(-4, 2)).toBe(RATE_LIMITS.min);
  });

  it("falls back rather than storing nonsense", () => {
    expect(clampRate("abc", 2)).toBe(2);
  });

  it("treats a blank field as 'leave it alone', not as zero", () => {
    /*
      `Number(null)` and `Number("")` are both 0, which is finite — so without
      an explicit check a blank colour-rate field would silently drop that
      shop's colour price to the platform minimum on every save.
    */
    expect(clampRate(null, 7)).toBe(7);
    expect(clampRate(undefined, 7)).toBe(7);
    expect(clampRate("", 7)).toBe(7);
  });

  it("rounds to paise", () => {
    expect(clampRate(2.567, 2)).toBe(2.57);
  });
});
