import { describe, expect, it } from "vitest";

import { formatCount, formatINR, formatPercentDelta, partnerInitials } from "./format";

describe("formatINR", () => {
  it("formats Indian currency with ₹", () => {
    expect(formatINR(125000)).toBe("₹1,25,000");
    expect(formatINR(0)).toBe("₹0");
  });

  it("never emits Rs", () => {
    expect(formatINR(999)).not.toMatch(/Rs/);
  });
});

describe("formatCount", () => {
  it("formats integers with en-IN grouping", () => {
    expect(formatCount(1200)).toBe("1,200");
  });
});

describe("formatPercentDelta", () => {
  it("labels growth and decline", () => {
    expect(formatPercentDelta(20, 10)).toEqual({ label: "+100%", tone: "up" });
    expect(formatPercentDelta(5, 10)).toEqual({ label: "-50%", tone: "down" });
    expect(formatPercentDelta(0, 0)).toEqual({ label: "—", tone: "flat" });
  });
});

describe("partnerInitials", () => {
  it("builds initials from a full name", () => {
    expect(partnerInitials("Faiz Alam")).toBe("FA");
    expect(partnerInitials("Digi")).toBe("DI");
  });
});
