import { describe, expect, it } from "vitest";

import { formatDelta, parseAdminDatePreset, resolveAdminDateRange } from "./date-range";
import { ADMIN_NAV_GROUPS, flattenAdminNav, isAdminNavActive, resolveAdminBreadcrumbs } from "./nav";

describe("admin date ranges (IST / FY)", () => {
  it("defaults unknown presets to last_7_days", () => {
    expect(parseAdminDatePreset("nope")).toBe("last_7_days");
  });

  it("builds current FY starting April 1 for mid-year dates", () => {
    const range = resolveAdminDateRange({ preset: "current_fy", now: new Date("2026-07-22T10:00:00+05:30") });
    expect(range.preset).toBe("current_fy");
    expect(range.label).toBe("Current Financial Year");
    // FY start 2026-04-01 00:00 IST = 2026-03-31T18:30:00.000Z
    expect(range.fromIso).toBe("2026-03-31T18:30:00.000Z");
  });

  it("handles previous-period zero safely", () => {
    expect(formatDelta(10, 0)).toEqual({ absolute: 10, percent: null, label: "New" });
    expect(formatDelta(0, 0).label).toBe("0%");
    expect(formatDelta(12, 10).label).toBe("+20%");
  });
});

describe("admin nav IA", () => {
  it("excludes tickets and core-config from active navigation", () => {
    const hrefs = flattenAdminNav().map((item) => item.href);
    expect(hrefs).not.toContain("/admin/tickets");
    expect(hrefs).not.toContain("/admin/settings/core-config");
    expect(hrefs).toContain("/admin/agency-partners");
    expect(hrefs).toContain("/admin/payment-reconciliation");
    expect(hrefs).toContain("/admin/homepage");
  });

  it("uses Digi Partners label", () => {
    const partners = flattenAdminNav().find((item) => item.href === "/admin/agency-partners");
    expect(partners?.label).toBe("Digi Partners");
  });

  it("groups navigation sections", () => {
    expect(ADMIN_NAV_GROUPS.map((g) => g.id)).toEqual(["overview", "operations", "finance", "crm-content", "insights", "system"]);
  });

  it("highlights nested routes", () => {
    expect(isAdminNavActive("/admin/applications/abc", "/admin/applications")).toBe(true);
    expect(isAdminNavActive("/admin", "/admin")).toBe(true);
    expect(isAdminNavActive("/admin/customers", "/admin")).toBe(false);
  });

  it("builds breadcrumbs", () => {
    const crumbs = resolveAdminBreadcrumbs("/admin/agency-partners");
    expect(crumbs[0]?.label).toBe("Admin");
    expect(crumbs.some((c) => c.label === "Digi Partners")).toBe(true);
  });
});
