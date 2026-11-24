import { describe, expect, it } from "vitest";

import { effectiveFeePercent, splitPrintEarning } from "@/lib/print/earnings";

describe("splitting a Digi Print payment", () => {
  it("gives the shop everything when there is no platform fee", () => {
    expect(splitPrintEarning(24, 0)).toEqual({ partner: 24, platform: 0 });
  });

  it("splits to the paisa and always sums to the price", () => {
    const split = splitPrintEarning(10.5, 10);
    expect(split).toEqual({ partner: 9.45, platform: 1.05 });
    const odd = splitPrintEarning(7, 3.3);
    expect(Math.round((odd.partner + odd.platform) * 100)).toBe(700);
  });

  it("caps a mistaken fee instead of taking the shop's whole payment", () => {
    expect(splitPrintEarning(100, 500)).toEqual({ partner: 50, platform: 50 });
    expect(splitPrintEarning(100, -5)).toEqual({ partner: 100, platform: 0 });
  });
});

describe("which fee applies", () => {
  it("prefers the station's own deal", () => {
    expect(effectiveFeePercent(5, "10")).toBe(5);
    expect(effectiveFeePercent(0, "10")).toBe(0);
  });

  it("falls back to the platform default, then to zero", () => {
    expect(effectiveFeePercent(null, "10")).toBe(10);
    expect(effectiveFeePercent(null, undefined)).toBe(0);
    expect(effectiveFeePercent(null, "abc")).toBe(0);
    expect(effectiveFeePercent(null, "90")).toBe(0);
  });
});
