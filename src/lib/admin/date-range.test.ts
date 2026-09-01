import { describe, expect, it } from "vitest";

import { formatDelta, parseAdminDatePreset, resolveAdminDateRange } from "./date-range";
import {
  ADMIN_WORKSPACES,
  flattenAdminNav,
  getAdminWorkspace,
  isAdminNavActive,
  navigableGroups,
  resolveAdminBreadcrumbs,
} from "./nav";

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
  it("keeps tickets and core-config out of the sidebar without hiding them", () => {
    /*
      Both screens exist and neither saves anything: the ticket desk writes to
      `localStorage`, and core-config's save button persists nothing. They used
      to be deleted from the nav outright, which is how the panel ended up with
      screens nobody could find. They are marked `unfinished` now — listed on
      the workspace home with a "not connected yet" label, and kept out of the
      sidebar so nobody is led into one by accident.
    */
    const sidebar = ADMIN_WORKSPACES.flatMap((workspace) =>
      navigableGroups(workspace).flatMap((group) => group.items.map((item) => item.href)),
    );
    expect(sidebar).not.toContain("/admin/tickets");
    expect(sidebar).not.toContain("/admin/settings/core-config");

    const all = flattenAdminNav();
    for (const href of ["/admin/tickets", "/admin/settings/core-config"]) {
      const item = all.find((entry) => entry.href === href);
      expect(item, `${href} vanished instead of being marked`).toBeTruthy();
      expect(item!.unfinished, `${href} is listed without saying it does not work`).toBeTruthy();
    }

    expect(sidebar).toContain("/admin/agency-partners");
    expect(sidebar).toContain("/admin/payment-reconciliation");
    expect(sidebar).toContain("/admin/homepage");
    expect(sidebar).toContain("/admin/communications");
  });

  it("uses Digi Partners label", () => {
    const partners = flattenAdminNav().find((item) => item.href === "/admin/agency-partners");
    expect(partners?.label).toBe("Digi Partners");
  });

  it("groups the customer workspace in the order the day runs", () => {
    expect(getAdminWorkspace("customer").groups.map((group) => group.id)).toEqual([
      "overview",
      "customers",
      "leads",
      "work",
      "catalogue",
      "website",
      "money",
      "messages",
      "insight",
      "settings",
    ]);
  });

  it("groups the partner workspace separately", () => {
    expect(getAdminWorkspace("partner").groups.map((group) => group.id)).toEqual([
      "partner-overview",
      "partners",
      "earnings",
      "network",
    ]);
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
