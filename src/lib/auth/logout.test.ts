import { describe, expect, it } from "vitest";
import { NextResponse } from "next/server";

import { isSupabaseAuthCookieName } from "@/lib/auth/admin-login-core";
import { ADMIN_ACCESS_TOKEN_COOKIE } from "@/lib/auth/admin-session";
import {
  AUTH_COOKIE_CLEAR_SPECS,
  clearAllAuthCookiesOnResponse,
  detectPortalFromRequestCookies,
  listSupabaseAuthCookieNames,
} from "@/lib/auth/logout";
import { inferLogoutPortal, resolveLogoutRedirect } from "@/lib/auth/logout-destinations";

describe("logout destinations", () => {
  it("maps each portal to a loggedOut login URL (replace, not home)", () => {
    expect(resolveLogoutRedirect("admin")).toBe("/admin/login?loggedOut=1");
    expect(resolveLogoutRedirect("ap")).toBe("/ap/login?loggedOut=1");
    expect(resolveLogoutRedirect("customer")).toBe("/customer/login?loggedOut=1");
    expect(resolveLogoutRedirect("auto")).toBe("/login?loggedOut=1");
  });

  it("infers portal from pathname", () => {
    expect(inferLogoutPortal("/admin/agency-partners")).toBe("admin");
    expect(inferLogoutPortal("/ap/dashboard")).toBe("ap");
    expect(inferLogoutPortal("/customer/dashboard")).toBe("customer");
    expect(inferLogoutPortal("/")).toBe("auto");
  });
});

describe("logout cookie inventory", () => {
  it("clears admin, customer JWT, and legacy customer cookies (not device ids)", () => {
    const names = AUTH_COOKIE_CLEAR_SPECS.map((s) => s.name);
    expect(names).toContain(ADMIN_ACCESS_TOKEN_COOKIE);
    expect(names).toContain("v2_customer_access_token");
    expect(names).toContain("v2_customer_refresh_token");
    expect(names).toContain("customer_access_token");
    expect(names).not.toContain("v2_device_id");
    expect(names).not.toContain("customer_device_id");
  });

  it("expires customer refresh cookie on its scoped path", () => {
    const refresh = AUTH_COOKIE_CLEAR_SPECS.find((s) => s.name === "v2_customer_refresh_token");
    expect(refresh?.path).toBe("/api/customer-auth/refresh");
  });

  it("detects portal from cookie names without trusting a bare role cookie", () => {
    expect(detectPortalFromRequestCookies([ADMIN_ACCESS_TOKEN_COOKIE])).toBe("admin");
    expect(detectPortalFromRequestCookies(["v2_customer_access_token"])).toBe("customer");
    expect(detectPortalFromRequestCookies(["sb-abcdefgh-auth-token"])).toBe("ap");
    expect(detectPortalFromRequestCookies([])).toBe("auto");
  });

  it("lists supabase auth cookie names including chunks", () => {
    const names = listSupabaseAuthCookieNames([
      "sb-abcdefgh-auth-token",
      "sb-abcdefgh-auth-token.0",
      "v2_admin_access_token",
      "unrelated",
    ]);
    expect(names).toEqual(["sb-abcdefgh-auth-token", "sb-abcdefgh-auth-token.0"]);
    expect(isSupabaseAuthCookieName("sb-abcdefgh-auth-token.1")).toBe(true);
  });

  it("writes Max-Age=0 Set-Cookie entries for every auth cookie on the response", () => {
    const response = NextResponse.json({ ok: true });
    const cleared = clearAllAuthCookiesOnResponse(response, [
      "sb-projref-auth-token",
      "sb-projref-auth-token.0",
      ADMIN_ACCESS_TOKEN_COOKIE,
    ]);

    expect(cleared.some((c) => c.startsWith(`${ADMIN_ACCESS_TOKEN_COOKIE}@`))).toBe(true);
    expect(cleared.some((c) => c.startsWith("sb-projref-auth-token@"))).toBe(true);
    expect(cleared.some((c) => c.startsWith("v2_customer_access_token@"))).toBe(true);

    const setCookies = response.headers.getSetCookie?.() ?? [];
    // Fallback for environments without getSetCookie
    const headerBlob = setCookies.length
      ? setCookies.join("\n")
      : String(response.headers.get("set-cookie") ?? "");

    expect(headerBlob).toMatch(/v2_admin_access_token=/);
    expect(headerBlob).toMatch(/Max-Age=0|max-age=0/i);
  });
});
