import { describe, expect, it } from "vitest";

import {
  AP_MOBILE_NAV_ITEMS,
  getActiveMobileNavKey,
  isNavItemActive,
} from "@/lib/ap/mobile-nav-config";

describe("AP mobile nav route matching", () => {
  const byKey = Object.fromEntries(AP_MOBILE_NAV_ITEMS.map((item) => [item.key, item]));

  it("activates Home only for dashboard (and exact /ap)", () => {
    expect(isNavItemActive("/dc-partner/dashboard", byKey.home)).toBe(true);
    expect(isNavItemActive("/dc-partner", byKey.home)).toBe(true);
    expect(isNavItemActive("/dc-partner/applications", byKey.home)).toBe(false);
    expect(isNavItemActive("/dc-partner/dashboard/extra", byKey.home)).toBe(false);
  });

  it("activates Applications for nested application routes", () => {
    expect(isNavItemActive("/dc-partner/applications", byKey.applications)).toBe(true);
    expect(isNavItemActive("/dc-partner/applications/new", byKey.applications)).toBe(true);
    expect(isNavItemActive("/dc-partner/applications/abc-123", byKey.applications)).toBe(true);
    expect(isNavItemActive("/dc-partner/assigned-work", byKey.applications)).toBe(false);
  });

  it("activates Customers for nested customer routes", () => {
    expect(isNavItemActive("/dc-partner/customers", byKey.customers)).toBe(true);
    expect(isNavItemActive("/dc-partner/customers/new", byKey.customers)).toBe(true);
    expect(isNavItemActive("/dc-partner/customers/xyz", byKey.customers)).toBe(true);
    expect(isNavItemActive("/dc-partner/commissions", byKey.customers)).toBe(false);
  });

  it("activates Wallet for wallet child routes only", () => {
    expect(isNavItemActive("/dc-partner/wallet", byKey.wallet)).toBe(true);
    expect(isNavItemActive("/dc-partner/wallet/history", byKey.wallet)).toBe(true);
    expect(isNavItemActive("/dc-partner/commissions", byKey.wallet)).toBe(false);
    expect(isNavItemActive("/dc-partner/payouts", byKey.wallet)).toBe(false);
  });

  it("activates Account for profile/settings/account routes", () => {
    expect(isNavItemActive("/dc-partner/profile", byKey.account)).toBe(true);
    expect(isNavItemActive("/dc-partner/settings", byKey.account)).toBe(true);
    expect(isNavItemActive("/dc-partner/change-password", byKey.account)).toBe(true);
    expect(isNavItemActive("/dc-partner/account/security", byKey.account)).toBe(true);
    expect(isNavItemActive("/dc-partner/dashboard", byKey.account)).toBe(false);
  });

  it("returns a single active key without cross-tab conflicts", () => {
    expect(getActiveMobileNavKey("/dc-partner/dashboard")).toBe("home");
    expect(getActiveMobileNavKey("/dc-partner/applications/new")).toBe("applications");
    expect(getActiveMobileNavKey("/dc-partner/customers/abc")).toBe("customers");
    expect(getActiveMobileNavKey("/dc-partner/wallet")).toBe("wallet");
    expect(getActiveMobileNavKey("/dc-partner/profile")).toBe("account");
    expect(getActiveMobileNavKey("/dc-partner/team")).toBeNull();
  });
});
