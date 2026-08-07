import { describe, expect, it } from "vitest";

import { isWeakPin, validateCustomerPin } from "@/lib/auth/pin";

describe("PIN strength rules", () => {
  it("rejects every-digit-identical PINs", () => {
    for (const pin of ["000000", "111111", "555555", "999999"]) {
      expect(isWeakPin(pin)).toBe(true);
    }
  });

  it("rejects ascending and descending sequential runs", () => {
    for (const pin of ["123456", "234567", "456789", "654321", "987654", "876543"]) {
      expect(validateCustomerPin(pin, "9876543210").ok).toBe(false);
    }
  });

  it("rejects short patterns repeated to fill the PIN", () => {
    for (const pin of ["121212", "101010", "123123", "459459", "838383"]) {
      expect(isWeakPin(pin)).toBe(true);
    }
  });

  it("rejects the last six digits of the customer's own mobile", () => {
    expect(validateCustomerPin("543210", "9876543210").ok).toBe(false);
  });

  it("rejects anything that is not exactly six digits", () => {
    for (const pin of ["12345", "1234567", "12a456", ""]) {
      expect(validateCustomerPin(pin, "9876543210").ok).toBe(false);
    }
  });

  it("accepts ordinary strong PINs", () => {
    for (const pin of ["481923", "907214", "263845", "719402"]) {
      expect(isWeakPin(pin)).toBe(false);
      expect(validateCustomerPin(pin, "9876543210").ok).toBe(true);
    }
  });

  it("does not treat a near-sequence as sequential", () => {
    // One broken step is enough to leave the sequential family.
    expect(isWeakPin("123457")).toBe(false);
    expect(isWeakPin("124567")).toBe(false);
  });
});
