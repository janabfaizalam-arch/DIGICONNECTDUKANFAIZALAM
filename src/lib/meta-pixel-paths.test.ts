import { describe, expect, it } from "vitest";
import { isPixelAllowedPath } from "@/lib/meta-pixel";

describe("isPixelAllowedPath", () => {
  it("runs on public marketing pages", () => {
    for (const path of ["/", "/services", "/services/pan-card", "/become-dc-partner", "/credit-cards", "/print"]) {
      expect(isPixelAllowedPath(path)).toBe(true);
    }
  });

  it("never runs where customer data is in the URL or the form", () => {
    for (const path of [
      "/admin",
      "/admin/customers/1",
      "/dc-partner/applications/new",
      "/customer/dashboard",
      "/customer-v2/dashboard",
      "/apply/pan-card",
      "/pay/application/1",
      "/invoice/1",
      "/track-application",
      "/print/station",
      "/packages/quote/abc",
      "/auth/callback",
      "/login",
      "/servicesx",
      null,
    ]) {
      expect(isPixelAllowedPath(path)).toBe(false);
    }
  });
});
