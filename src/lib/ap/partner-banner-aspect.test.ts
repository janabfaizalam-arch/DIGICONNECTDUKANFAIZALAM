import { describe, expect, it } from "vitest";

import {
  isNearPartnerMobileBannerRatio,
  partnerMobileBannerRatioWarning,
  PARTNER_MOBILE_BANNER_RATIO,
} from "@/lib/ap/partner-banner-aspect";

describe("partner mobile banner aspect", () => {
  it("accepts exact 1400×600 (7:3)", () => {
    expect(isNearPartnerMobileBannerRatio(1400, 600)).toBe(true);
    expect(partnerMobileBannerRatioWarning(1400, 600)).toBeNull();
    expect(PARTNER_MOBILE_BANNER_RATIO).toBeCloseTo(7 / 3);
  });

  it("warns when ratio differs significantly from 7:3", () => {
    expect(isNearPartnerMobileBannerRatio(1920, 1080)).toBe(false);
    expect(partnerMobileBannerRatioWarning(1920, 1080)).toMatch(/Recommended/);
  });
});
