import { describe, expect, it } from "vitest";

import { getAgencyPartnerById, getAgencyPartnerByUserId } from "@/lib/ap-data";

/**
 * Documents the ID contract that caused the production View/Verify 404:
 * list links pass agency_partners.id; detail must load via getAgencyPartnerById.
 */
describe("agency partner admin detail ID contract", () => {
  it("exposes distinct loaders for agency_partners.id vs user_id", () => {
    expect(typeof getAgencyPartnerById).toBe("function");
    expect(typeof getAgencyPartnerByUserId).toBe("function");
    expect(getAgencyPartnerById).not.toBe(getAgencyPartnerByUserId);
  });
});
