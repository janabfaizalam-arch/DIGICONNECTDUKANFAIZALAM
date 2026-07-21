import { describe, expect, it } from "vitest";

import { buildPartnerWhatsAppCaption, captionContainsFabricatedClaims } from "./marketing";

describe("buildPartnerWhatsAppCaption", () => {
  it("uses partner and service names without inventing offers or prices", () => {
    const caption = buildPartnerWhatsAppCaption({
      serviceTitle: "PAN Card",
      partnerName: "Faiz Alam",
      partnerCode: "DP1001",
    });

    expect(caption).toContain("Faiz Alam");
    expect(caption).toContain("DP1001");
    expect(caption).toContain("PAN Card");
    expect(caption).toContain("DigiConnect Dukan");
    expect(captionContainsFabricatedClaims(caption)).toBe(false);
  });
});
