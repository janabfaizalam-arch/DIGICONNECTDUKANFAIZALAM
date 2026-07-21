import { describe, expect, it } from "vitest";

import { DIGI_PARTNER_LANDING_ROUTE, DIGI_PARTNER_LOGIN_ROUTE, normalizePartnerRole } from "./partner-access";

describe("Digi Partner hub routes (stages 4–5)", () => {
  it("keeps canonical login and landing routes stable", () => {
    expect(DIGI_PARTNER_LOGIN_ROUTE).toBe("/ap/login");
    expect(DIGI_PARTNER_LANDING_ROUTE).toBe("/digi-partner");
  });

  it("documents training as the canonical education route (knowledge redirects)", () => {
    const training = "/ap/training";
    const knowledge = "/ap/knowledge";
    expect(training).not.toBe(knowledge);
    expect(training).toBe("/ap/training");
  });

  it("ignores client-side role escalation aliases for customers and admins", () => {
    expect(normalizePartnerRole("customer")).toBeNull();
    expect(normalizePartnerRole("admin")).toBeNull();
    expect(normalizePartnerRole("agency_partner_admin")).toBeNull();
    expect(normalizePartnerRole("agency_partner")).toBe("agency_partner");
  });
});
