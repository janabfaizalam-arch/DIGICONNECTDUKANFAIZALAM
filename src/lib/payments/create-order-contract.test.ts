import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  resolveApplicationSourceEnum,
  resolveSourceChannel,
  rupeesToPaise,
} from "./application-source";

describe("Digi Partner payment preparation contract", () => {
  it("maps ITR Original ₹999 to 99900 paise server-side", () => {
    expect(rupeesToPaise(999)).toBe(99900);
  });

  it("never trusts a client-supplied amount for partner enum mapping", () => {
    // Partner prepare flow always uses agent_pos regardless of client price.
    expect(resolveApplicationSourceEnum(true)).toBe("agent_pos");
    expect(resolveSourceChannel({ isPartnerFlow: true })).toBe("agency_partner");
  });

  it("create-order uses membership-safe portal hint and enum helpers", () => {
    const contents = readFileSync(join(process.cwd(), "src/app/api/create-order/route.ts"), "utf8");
    expect(contents).toContain("getPartnerMembership");
    expect(contents).toContain("resolveApplicationSourceEnum");
    expect(contents).toContain("rupeesToPaise");
    expect(contents).toContain("application_source_enum_mismatch");
    expect(contents).toContain("razorpay_not_configured");
    expect(contents).toContain("already_paid");
    expect(contents.includes(`source: ap?.id ? "agency_partner"`)).toBe(false);
  });

  it("partner wizard marks portal=ap and does not send client amount as authority", () => {
    const contents = readFileSync(join(process.cwd(), "src/components/portal/partner-application-wizard.tsx"), "utf8");
    expect(contents).toContain(`portal:   "ap"`);
    expect(contents).toContain("Preparing secure payment");
    expect(contents).toContain("Retry Payment");
    // Sticky Pay button must not require Razorpay script for Generate Link mode.
    expect(contents).toContain('paymentMethodType === "immediate" && !isScriptReady');
  });

  it("payment-links generate uses membership-first AP authorization", () => {
    const contents = readFileSync(join(process.cwd(), "src/app/api/payment-links/generate/route.ts"), "utf8");
    expect(contents).toContain("getPartnerMembership");
    expect(contents).toContain("agency_partner_id");
  });
});
