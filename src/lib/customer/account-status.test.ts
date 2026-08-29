import { describe, expect, it } from "vitest";

import { getCustomerAccountStatus, hasIndianMobile } from "@/lib/customer/account-status";
import { readCode } from "@/lib/testing/source";

describe("customer account status", () => {
  it("never claims verification, in any state", () => {
    const states = [
      { email: "a@b.com", mobile: "9876543210", completionPercent: 100 },
      { email: "a@b.com", mobile: "9876543210", completionPercent: 40 },
      { email: null, mobile: null, completionPercent: 0 },
    ];

    for (const state of states) {
      const status = getCustomerAccountStatus(state);
      expect(status.badge.label).not.toMatch(/verif/i);
    }
  });

  it("reports a saved email and mobile as on file, not as verified", () => {
    const status = getCustomerAccountStatus({ email: "a@b.com", mobile: "9876543210" });
    expect(status.emailOnFile).toBe(true);
    expect(status.mobileOnFile).toBe(true);
    // Nothing in this codebase confirms either — customer email verification
    // is retired — so no field may imply that it does.
    expect(Object.keys(status).join(" ")).not.toMatch(/verified/i);
  });

  it("says the profile is complete only at 100%", () => {
    expect(getCustomerAccountStatus({ completionPercent: 100 }).badge.tone).toBe("complete");
    expect(getCustomerAccountStatus({ completionPercent: 99 }).badge.tone).toBe("partial");
    expect(getCustomerAccountStatus({ completionPercent: 99 }).badge.label).toBe("Profile 99% complete");
  });

  it("asks for details rather than showing a bare zero", () => {
    const status = getCustomerAccountStatus({});
    expect(status.badge.tone).toBe("empty");
    expect(status.badge.label).toBe("Add your details");
    expect(status.completionPercent).toBe(0);
  });

  it("clamps a nonsense completion value", () => {
    expect(getCustomerAccountStatus({ completionPercent: 250 }).completionPercent).toBe(100);
    expect(getCustomerAccountStatus({ completionPercent: -30 }).completionPercent).toBe(0);
    expect(getCustomerAccountStatus({ completionPercent: Number.NaN }).completionPercent).toBe(0);
  });

  it("rejects mobiles that are not ten Indian digits", () => {
    expect(hasIndianMobile("9876543210")).toBe(true);
    expect(hasIndianMobile("5876543210")).toBe(false);
    expect(hasIndianMobile("98765432")).toBe(false);
    expect(hasIndianMobile("+919876543210")).toBe(false);
    expect(hasIndianMobile(null)).toBe(false);
  });

  /**
   * The badge this replaced was a literal in the markup. This is the contract
   * that keeps one from being pasted back in.
   */
  it("no portal component prints a hardcoded verified badge", () => {
    const files = [
      "src/components/customer/portal-shell.tsx",
      "src/components/customer/section-account.tsx",
    ];

    for (const rel of files) {
      // This is a `not.toMatch`, so a comment stripper that swallows too much
      // makes it pass for the wrong reason. `readCode` drops comments line by
      // line rather than with a regex that a `/*` inside a string can derail.
      expect(readCode(rel), `${rel} hardcodes a verification claim`).not.toMatch(/>\s*Verified\s*</);
    }
  });
});
