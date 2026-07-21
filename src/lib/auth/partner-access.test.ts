import { describe, expect, it } from "vitest";

import {
  DIGI_PARTNER_BECOME_CTA_LABEL,
  DIGI_PARTNER_DASHBOARD_ROUTE,
  DIGI_PARTNER_LANDING_ROUTE,
  DIGI_PARTNER_LOGIN_ROUTE,
  PARTNER_LOGIN_ALIASES,
  normalizePartnerRole,
  resolvePartnerCtaDestination,
  resolvePartnerLoginAlias,
} from "./partner-access";

describe("canonical routes", () => {
  it("uses /ap/login as the single canonical partner login route", () => {
    expect(DIGI_PARTNER_LOGIN_ROUTE).toBe("/ap/login");
    expect(DIGI_PARTNER_DASHBOARD_ROUTE).toBe("/ap/dashboard");
    expect(DIGI_PARTNER_LANDING_ROUTE).toBe("/digi-partner");
    expect(DIGI_PARTNER_BECOME_CTA_LABEL).toBe("Become a Digi Partner");
  });

  it("never lists the canonical route as an alias (prevents redirect loops)", () => {
    expect(PARTNER_LOGIN_ALIASES).not.toContain(DIGI_PARTNER_LOGIN_ROUTE);
    expect(PARTNER_LOGIN_ALIASES).not.toContain(DIGI_PARTNER_LANDING_ROUTE);
  });
});

describe("resolvePartnerLoginAlias", () => {
  it("redirects every legacy partner login URL to /ap/login", () => {
    for (const alias of PARTNER_LOGIN_ALIASES) {
      expect(resolvePartnerLoginAlias(alias)).toBe("/ap/login");
    }
  });

  it("handles the explicitly required legacy URLs", () => {
    expect(resolvePartnerLoginAlias("/agent/login")).toBe("/ap/login");
    expect(resolvePartnerLoginAlias("/partner/login")).toBe("/ap/login");
    expect(resolvePartnerLoginAlias("/digi-partner/login")).toBe("/ap/login");
    expect(resolvePartnerLoginAlias("/agency-partner/login")).toBe("/ap/login");
  });

  it("is tolerant of trailing slashes, query strings, hashes and casing", () => {
    expect(resolvePartnerLoginAlias("/partner/login/")).toBe("/ap/login");
    expect(resolvePartnerLoginAlias("/partner/login?ref=x")).toBe("/ap/login");
    expect(resolvePartnerLoginAlias("/Partner/Login")).toBe("/ap/login");
    expect(resolvePartnerLoginAlias("/AGENT/LOGIN#top")).toBe("/ap/login");
  });

  it("returns null for the canonical route and unrelated paths", () => {
    expect(resolvePartnerLoginAlias("/ap/login")).toBeNull();
    expect(resolvePartnerLoginAlias("/customer/login")).toBeNull();
    expect(resolvePartnerLoginAlias("/admin/login")).toBeNull();
    expect(resolvePartnerLoginAlias("/services")).toBeNull();
    expect(resolvePartnerLoginAlias("/")).toBeNull();
  });
});

describe("normalizePartnerRole", () => {
  it("normalizes all known partner role aliases to agency_partner", () => {
    expect(normalizePartnerRole("agent")).toBe("agency_partner");
    expect(normalizePartnerRole("agency_partner")).toBe("agency_partner");
    expect(normalizePartnerRole("ap")).toBe("agency_partner");
    expect(normalizePartnerRole("AGENT")).toBe("agency_partner");
    expect(normalizePartnerRole("  Agency_Partner  ")).toBe("agency_partner");
  });

  it("returns null for non-partner roles", () => {
    expect(normalizePartnerRole("customer")).toBeNull();
    expect(normalizePartnerRole("admin")).toBeNull();
    expect(normalizePartnerRole("")).toBeNull();
    expect(normalizePartnerRole(null)).toBeNull();
    expect(normalizePartnerRole(undefined)).toBeNull();
  });
});

describe("resolvePartnerCtaDestination", () => {
  it("sends guests to the login page", () => {
    expect(resolvePartnerCtaDestination("guest")).toEqual({
      href: "/ap/login",
      showCustomerNotice: false,
    });
  });

  it("sends active partners to the dashboard", () => {
    expect(resolvePartnerCtaDestination("agency_partner")).toEqual({
      href: "/ap/dashboard",
      showCustomerNotice: false,
    });
  });

  it("sends admins without partner membership to Digi Partner login (explicit switch)", () => {
    expect(resolvePartnerCtaDestination("admin")).toEqual({
      href: "/ap/login",
      showCustomerNotice: false,
    });
  });

  it("sends admins with partner membership to the Digi Partner dashboard", () => {
    expect(resolvePartnerCtaDestination("admin", { hasPartnerMembership: true })).toEqual({
      href: "/ap/dashboard",
      showCustomerNotice: false,
    });
  });

  it("lets a signed-in customer reach the login page with a switch notice", () => {
    expect(resolvePartnerCtaDestination("customer")).toEqual({
      href: "/ap/login",
      showCustomerNotice: true,
    });
  });
});
