import { describe, expect, it } from "vitest";

import {
  ADMIN_AGENCY_PARTNERS_ROUTE,
  adminAgencyPartnerDetailPath,
  isAgencyPartnerId,
  parseAdminPartnerDetailTab,
  parseAgencyPartnerIdParam,
} from "./agency-partner-routes";

describe("admin agency partner routes", () => {
  const partnerId = "a1b2c3d4-e5f6-4789-a012-3456789abcde";

  it("builds the canonical View/Verify detail URL from agency_partners.id", () => {
    expect(adminAgencyPartnerDetailPath(partnerId)).toBe(
      `/admin/agency-partners/${partnerId}`,
    );
    expect(adminAgencyPartnerDetailPath(partnerId, { tab: "kyc" })).toBe(
      `/admin/agency-partners/${partnerId}?tab=kyc`,
    );
    expect(ADMIN_AGENCY_PARTNERS_ROUTE).toBe("/admin/agency-partners");
  });

  it("rejects malformed partner IDs so the admin Not Found path can render", () => {
    expect(isAgencyPartnerId(partnerId)).toBe(true);
    expect(isAgencyPartnerId("not-a-uuid")).toBe(false);
    expect(isAgencyPartnerId("")).toBe(false);
    expect(parseAgencyPartnerIdParam("  ")).toBeNull();
    expect(parseAgencyPartnerIdParam(partnerId)).toBe(partnerId);
  });

  it("never treats user_id-shaped confusion as a route builder concern — path is always /[id]", () => {
    // Detail pages must load via getAgencyPartnerById(path id), not getAgencyPartnerByUserId.
    const path = adminAgencyPartnerDetailPath(partnerId);
    expect(path).not.toContain("/view/");
    expect(path).not.toContain("/user/");
    expect(path.split("/").at(-1)).toBe(partnerId);
  });

  it("normalizes unknown tabs to overview", () => {
    expect(parseAdminPartnerDetailTab("wallet")).toBe("wallet");
    expect(parseAdminPartnerDetailTab("???")).toBe("overview");
  });
});
