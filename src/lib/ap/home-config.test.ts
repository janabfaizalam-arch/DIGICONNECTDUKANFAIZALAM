import { describe, expect, it } from "vitest";

import { getPartnerHomeActions, PARTNER_HOME_ACTIONS, STANDARD_PARTNER_ACTIONS } from "@/lib/ap/home-config";
import { isBannerVisibleNow } from "@/lib/ap/partner-banners";

describe("partner home config", () => {
  it("keeps business_partner and field_executive actions identical", () => {
    expect(PARTNER_HOME_ACTIONS.business_partner).toEqual(STANDARD_PARTNER_ACTIONS);
    expect(PARTNER_HOME_ACTIONS.field_executive).toEqual(STANDARD_PARTNER_ACTIONS);
    expect(getPartnerHomeActions("business_partner")).toEqual(getPartnerHomeActions("field_executive"));
  });

  it("adds My Team only for company_partner", () => {
    const company = getPartnerHomeActions("company_partner");
    expect(company.some((a) => a.key === "my-team")).toBe(true);
    expect(getPartnerHomeActions("business_partner").some((a) => a.key === "my-team")).toBe(false);
    expect(getPartnerHomeActions("office_staff").some((a) => a.key === "my-team")).toBe(false);
  });

  it("gives office staff processing-focused actions", () => {
    const keys = getPartnerHomeActions("office_staff").map((a) => a.key);
    expect(keys).toEqual([
      "search-customer",
      "process-application",
      "offline-invoice",
      "support-queue",
      "collect-payment",
      "view-commission",
    ]);
    expect(keys).not.toContain("new-customer");
    expect(keys).not.toContain("apply-service");
  });
});

describe("partner banner visibility", () => {
  const now = new Date("2026-07-23T10:00:00.000Z");

  it("respects active window and partner type targeting", () => {
    expect(
      isBannerVisibleNow(
        { is_active: true, start_at: null, end_at: null, partner_types: null },
        "business_partner",
        now,
      ),
    ).toBe(true);

    expect(
      isBannerVisibleNow(
        {
          is_active: true,
          start_at: null,
          end_at: null,
          partner_types: ["company_partner"],
        },
        "business_partner",
        now,
      ),
    ).toBe(false);

    expect(
      isBannerVisibleNow(
        {
          is_active: true,
          start_at: "2026-07-23T09:00:00.000Z",
          end_at: "2026-07-23T11:00:00.000Z",
          partner_types: ["office_staff"],
        },
        "office_staff",
        now,
      ),
    ).toBe(true);
  });
});
