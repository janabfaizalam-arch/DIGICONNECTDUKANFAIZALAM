import { describe, expect, it } from "vitest";

import {
  canManagePartnerTeam,
  DIGI_PARTNER_TYPES,
  isCompanyPartnerType,
  isTeamCreatablePartnerType,
  LEGACY_PARTNER_TYPE_MAP,
  normalizePartnerType,
  PARTNER_TYPE_CAPABILITIES,
  partnerTypeDisplayLabel,
  resolvePartnerDashboardPath,
  teamCreatablePartnerTypes,
} from "@/lib/ap/partner-type";

describe("partner-type", () => {
  it("maps legacy values to canonical DigiPartnerType", () => {
    expect(normalizePartnerType("ceo")).toBe("company_partner");
    expect(normalizePartnerType("shop_owner")).toBe("business_partner");
    expect(normalizePartnerType("field_executive")).toBe("field_executive");
    expect(LEGACY_PARTNER_TYPE_MAP.ceo).toBe("company_partner");
    expect(LEGACY_PARTNER_TYPE_MAP.shop_owner).toBe("business_partner");
  });

  it("accepts canonical values and rejects unknown", () => {
    expect(normalizePartnerType("business_partner")).toBe("business_partner");
    expect(normalizePartnerType("company_partner")).toBe("company_partner");
    expect(normalizePartnerType("office_staff")).toBe("office_staff");
    expect(normalizePartnerType("franchise")).toBeNull();
    expect(normalizePartnerType("")).toBeNull();
    expect(normalizePartnerType(null)).toBeNull();
  });

  it("grants team management only to company_partner (incl. legacy ceo)", () => {
    expect(canManagePartnerTeam("company_partner")).toBe(true);
    expect(canManagePartnerTeam("ceo")).toBe(true);
    expect(isCompanyPartnerType("ceo")).toBe(true);
    expect(canManagePartnerTeam("business_partner")).toBe(false);
    expect(canManagePartnerTeam("office_staff")).toBe(false);
    expect(canManagePartnerTeam("field_executive")).toBe(false);
    expect(PARTNER_TYPE_CAPABILITIES.office_staff.canManageTeam).toBe(false);
  });

  it("limits team-creatable types", () => {
    expect(teamCreatablePartnerTypes()).toEqual([
      "business_partner",
      "field_executive",
      "office_staff",
    ]);
    expect(isTeamCreatablePartnerType("shop_owner")).toBe(true);
    expect(isTeamCreatablePartnerType("company_partner")).toBe(false);
    expect(isTeamCreatablePartnerType("ceo")).toBe(false);
  });

  it("exposes labels and dashboard path helper", () => {
    expect(DIGI_PARTNER_TYPES.company_partner.label).toBe("Company Partner");
    expect(partnerTypeDisplayLabel("shop_owner")).toContain("Business Partner");
    expect(resolvePartnerDashboardPath("company_partner")).toBe("/ap/dashboard");
  });
});
