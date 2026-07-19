import { describe, expect, it } from "vitest";

import {
  matchesLocal,
  mobileLookupVariants,
  normalizeStoredMobile,
  resolveCustomerMatches,
} from "@/lib/auth/customer-lookup";

describe("normalizeStoredMobile / variants", () => {
  it("normalizes common Indian formats to 10 digits", () => {
    expect(normalizeStoredMobile("9876543210")).toBe("9876543210");
    expect(normalizeStoredMobile("+91 98765-43210")).toBe("9876543210");
    expect(normalizeStoredMobile("919876543210")).toBe("9876543210");
    expect(normalizeStoredMobile("09876543210")).toBe("9876543210");
  });

  it("builds lookup variants", () => {
    const variants = mobileLookupVariants("9876543210");
    expect(variants).toContain("9876543210");
    expect(variants).toContain("919876543210");
    expect(variants).toContain("+919876543210");
  });

  it("matchesLocal across storage shapes", () => {
    expect(matchesLocal("+919876543210", "9876543210")).toBe(true);
    expect(matchesLocal("9876543210", "9876543210")).toBe(true);
    expect(matchesLocal("9123456789", "9876543210")).toBe(false);
  });
});

describe("resolveCustomerMatches", () => {
  it("finds legacy customer with customers.mobile and no user_id", () => {
    const result = resolveCustomerMatches({
      localPhone: "9876543210",
      customers: [
        {
          id: "cust-1",
          mobile: "9876543210",
          name: "Legacy Customer",
          is_active: true,
        },
      ],
      profiles: [],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.customerId).toBe("cust-1");
      expect(result.lookupSource).toBe("customers");
      expect(result.profileId).toBeNull();
    }
  });

  it("blocks duplicate mobile customers", () => {
    const result = resolveCustomerMatches({
      localPhone: "9876543210",
      customers: [
        { id: "a", mobile: "9876543210", name: "A", is_active: true },
        { id: "b", mobile: "+91 9876543210", name: "B", is_active: true },
      ],
      profiles: [],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("ambiguous");
      expect(result.message).toContain("multiple accounts");
    }
  });

  it("returns profile_only when only profiles match", () => {
    const result = resolveCustomerMatches({
      localPhone: "9876543210",
      customers: [],
      profiles: [
        {
          id: "prof-1",
          role: "customer",
          phone: "9876543210",
          mobile: "9876543210",
          active: true,
          is_active: true,
        },
      ],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("profile_only");
    }
  });

  it("treats is_active=false as inactive but found", () => {
    const result = resolveCustomerMatches({
      localPhone: "9876543210",
      customers: [
        {
          id: "cust-inactive",
          mobile: "9876543210",
          name: "Inactive",
          is_active: false,
        },
      ],
      profiles: [],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.isActive).toBe(false);
      expect(result.customerId).toBe("cust-inactive");
    }
  });

  it("links optional profile when both exist", () => {
    const result = resolveCustomerMatches({
      localPhone: "9876543210",
      customers: [{ id: "cust-1", mobile: "9876543210", name: "C", is_active: true }],
      profiles: [
        {
          id: "prof-1",
          role: "customer",
          phone: "9876543210",
          mobile: null,
          active: true,
          is_active: true,
        },
      ],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.lookupSource).toBe("customers+profiles");
      expect(result.profileId).toBe("prof-1");
    }
  });
});
