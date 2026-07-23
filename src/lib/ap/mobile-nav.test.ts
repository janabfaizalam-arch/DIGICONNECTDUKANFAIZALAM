import { describe, expect, it } from "vitest";

import {
  AP_MOBILE_NAV_ITEMS,
  getActiveMobileNavKey,
  isNavItemActive,
} from "@/lib/ap/mobile-nav-config";

describe("AP mobile nav route matching", () => {
  const byKey = Object.fromEntries(AP_MOBILE_NAV_ITEMS.map((item) => [item.key, item]));

  it("activates Home only for dashboard (and exact /ap)", () => {
    expect(isNavItemActive("/ap/dashboard", byKey.home)).toBe(true);
    expect(isNavItemActive("/ap", byKey.home)).toBe(true);
    expect(isNavItemActive("/ap/applications", byKey.home)).toBe(false);
    expect(isNavItemActive("/ap/dashboard/extra", byKey.home)).toBe(false);
  });

  it("activates Applications for nested application routes", () => {
    expect(isNavItemActive("/ap/applications", byKey.applications)).toBe(true);
    expect(isNavItemActive("/ap/applications/new", byKey.applications)).toBe(true);
    expect(isNavItemActive("/ap/applications/abc-123", byKey.applications)).toBe(true);
    expect(isNavItemActive("/ap/assigned-work", byKey.applications)).toBe(false);
  });

  it("activates Customers for nested customer routes", () => {
    expect(isNavItemActive("/ap/customers", byKey.customers)).toBe(true);
    expect(isNavItemActive("/ap/customers/new", byKey.customers)).toBe(true);
    expect(isNavItemActive("/ap/customers/xyz", byKey.customers)).toBe(true);
    expect(isNavItemActive("/ap/commissions", byKey.customers)).toBe(false);
  });

  it("activates Wallet for wallet child routes only", () => {
    expect(isNavItemActive("/ap/wallet", byKey.wallet)).toBe(true);
    expect(isNavItemActive("/ap/wallet/history", byKey.wallet)).toBe(true);
    expect(isNavItemActive("/ap/commissions", byKey.wallet)).toBe(false);
    expect(isNavItemActive("/ap/payouts", byKey.wallet)).toBe(false);
  });

  it("activates Account for profile/settings/account routes", () => {
    expect(isNavItemActive("/ap/profile", byKey.account)).toBe(true);
    expect(isNavItemActive("/ap/settings", byKey.account)).toBe(true);
    expect(isNavItemActive("/ap/change-password", byKey.account)).toBe(true);
    expect(isNavItemActive("/ap/account/security", byKey.account)).toBe(true);
    expect(isNavItemActive("/ap/dashboard", byKey.account)).toBe(false);
  });

  it("returns a single active key without cross-tab conflicts", () => {
    expect(getActiveMobileNavKey("/ap/dashboard")).toBe("home");
    expect(getActiveMobileNavKey("/ap/applications/new")).toBe("applications");
    expect(getActiveMobileNavKey("/ap/customers/abc")).toBe("customers");
    expect(getActiveMobileNavKey("/ap/wallet")).toBe("wallet");
    expect(getActiveMobileNavKey("/ap/profile")).toBe("account");
    expect(getActiveMobileNavKey("/ap/team")).toBeNull();
  });
});
