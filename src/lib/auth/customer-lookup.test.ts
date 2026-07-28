import { describe, expect, it } from "vitest";

import { resolveCustomerMatches } from "@/lib/auth/customer-lookup";
import {
  matchesLocal,
  mobileLookupVariants,
  normalizeStoredMobile,
} from "@/lib/auth/mobile";

describe("normalizeStoredMobile / variants", () => {
  it("normalizes common Indian formats to 10 digits", () => {
    expect(normalizeStoredMobile("9455062648")).toBe("9455062648");
    expect(normalizeStoredMobile("+91 94550-62648")).toBe("9455062648");
    expect(normalizeStoredMobile("919455062648")).toBe("9455062648");
    expect(normalizeStoredMobile("09455062648")).toBe("9455062648");
  });

  it("builds lookup variants", () => {
    const variants = mobileLookupVariants("9455062648");
    expect(variants).toContain("9455062648");
    expect(variants).toContain("919455062648");
    expect(variants).toContain("+919455062648");
  });

  it("matchesLocal across storage shapes", () => {
    expect(matchesLocal("+919455062648", "9455062648")).toBe(true);
    expect(matchesLocal("9455062648", "9455062648")).toBe(true);
    expect(matchesLocal("9123456789", "9455062648")).toBe(false);
  });
});

describe("resolveCustomerMatches", () => {
  it("finds legacy customer with customers.mobile and no user_id", () => {
    const result = resolveCustomerMatches({
      localPhone: "9455062648",
      customers: [
        {
          id: "cust-1",
          mobile: "9455062648",
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
      localPhone: "9455062648",
      customers: [
        { id: "a", mobile: "9455062648", name: "A", is_active: true },
        { id: "b", mobile: "+91 9455062648", name: "B", is_active: true },
      ],
      profiles: [],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("ambiguous");
      expect(result.message).toContain("more than one account");
    }
  });

  it("returns profile_only when only profiles match (pre-repair signal)", () => {
    const result = resolveCustomerMatches({
      localPhone: "9455062648",
      customers: [],
      profiles: [
        {
          id: "prof-1",
          role: "customer",
          phone: "9455062648",
          mobile: "9455062648",
          active: true,
          is_active: true,
        },
      ],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("profile_only");
      expect(result.message).toContain("login setup is incomplete");
      expect(result.internalCode).toBe("profile_without_customers_row");
    }
  });

  it("rejects wrong role profiles", () => {
    const result = resolveCustomerMatches({
      localPhone: "9455062648",
      customers: [],
      profiles: [
        {
          id: "admin-1",
          role: "admin",
          phone: "9455062648",
          mobile: "9455062648",
          active: true,
          is_active: true,
        },
      ],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("not_found");
  });

  it("treats is_active=false as inactive but found", () => {
    const result = resolveCustomerMatches({
      localPhone: "9455062648",
      customers: [
        {
          id: "cust-inactive",
          mobile: "9455062648",
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
      localPhone: "9455062648",
      customers: [{ id: "cust-1", mobile: "9455062648", name: "C", is_active: true }],
      profiles: [
        {
          id: "prof-1",
          role: "customer",
          phone: "9455062648",
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

  it("returns not registered for unknown mobile", () => {
    const result = resolveCustomerMatches({
      localPhone: "9000000000",
      customers: [],
      profiles: [],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("not_found");
      expect(result.message).toContain("No customer account");
    }
  });
});
