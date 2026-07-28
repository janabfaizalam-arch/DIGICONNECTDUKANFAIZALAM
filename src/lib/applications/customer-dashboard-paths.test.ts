import { describe, expect, it } from "vitest";

import { resolveLegacyCustomerDashboardPath } from "@/lib/applications/customer-dashboard-paths";

describe("resolveLegacyCustomerDashboardPath", () => {
  it("maps /dashboard home", () => {
    expect(resolveLegacyCustomerDashboardPath("/dashboard")).toBe("/customer/dashboard");
  });

  it("maps applications list", () => {
    expect(resolveLegacyCustomerDashboardPath("/dashboard/applications")).toBe(
      "/customer/dashboard?tab=applications",
    );
  });

  it("preserves application detail id", () => {
    expect(resolveLegacyCustomerDashboardPath("/dashboard/applications/abc-123")).toBe(
      "/customer/applications/abc-123",
    );
  });

  it("falls back unknown dashboard paths to customer home", () => {
    expect(resolveLegacyCustomerDashboardPath("/dashboard/wallet")).toBe("/customer/dashboard");
  });

  it("returns null for unrelated paths", () => {
    expect(resolveLegacyCustomerDashboardPath("/customer/dashboard")).toBeNull();
  });
});
