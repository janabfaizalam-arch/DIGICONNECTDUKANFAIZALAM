import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { middleware } from "./middleware";

function requestFor(pathname: string) {
  return new NextRequest(new URL(`https://digiconnectdukan.test${pathname}`));
}

describe("partner login alias redirects", () => {
  const aliases = ["/agent/login", "/partner/login", "/digi-partner/login", "/agency-partner/login"];

  for (const alias of aliases) {
    it(`permanently redirects ${alias} -> /ap/login`, async () => {
      const res = await middleware(requestFor(alias));
      expect(res.status).toBe(308);
      const location = res.headers.get("location");
      expect(location).not.toBeNull();
      expect(new URL(location as string).pathname).toBe("/ap/login");
    });
  }

  it("preserves query-string aliases but lands on the canonical route", async () => {
    const res = await middleware(requestFor("/partner/login?ref=footer"));
    expect(res.status).toBe(308);
    expect(new URL(res.headers.get("location") as string).pathname).toBe("/ap/login");
  });

  it("does not redirect the canonical /ap/login route to itself", async () => {
    const res = await middleware(requestFor("/ap/login"));
    // Guests pass through (no 3xx redirect back to /ap/login).
    if (res.status >= 300 && res.status < 400) {
      expect(new URL(res.headers.get("location") as string).pathname).not.toBe("/ap/login");
    } else {
      expect(res.status).toBeLessThan(300);
    }
  });
});

describe("loggedOut login pages stay public", () => {
  it("does not create a redirect loop on /ap/login?loggedOut=1 for guests", async () => {
    const res = await middleware(requestFor("/ap/login?loggedOut=1"));
    if (res.status >= 300 && res.status < 400) {
      const location = new URL(res.headers.get("location") as string);
      expect(location.pathname).not.toBe("/ap/dashboard");
      expect(location.pathname).not.toBe("/ap/login");
      expect(location.pathname).not.toBe("/unauthorized");
    } else {
      expect(res.status).toBeLessThan(300);
    }
  });

  it("does not bounce guests from /admin/login?loggedOut=1 to /admin", async () => {
    const res = await middleware(requestFor("/admin/login?loggedOut=1"));
    if (res.status >= 300 && res.status < 400) {
      expect(new URL(res.headers.get("location") as string).pathname).not.toBe("/admin");
      expect(new URL(res.headers.get("location") as string).pathname).not.toBe("/unauthorized");
    } else {
      expect(res.status).toBeLessThan(300);
    }
  });

  it("sends guests away from /unauthorized to a login page", async () => {
    const res = await middleware(requestFor("/unauthorized"));
    expect(res.status).toBeGreaterThanOrEqual(300);
    expect(res.status).toBeLessThan(400);
    const location = new URL(res.headers.get("location") as string);
    expect(location.pathname).not.toBe("/unauthorized");
    expect(["/login", "/ap/login", "/admin/login", "/customer/login"]).toContain(location.pathname);
  });

  it("sends logged-out guests from /ap/dashboard to /ap/login, not /unauthorized", async () => {
    const res = await middleware(requestFor("/ap/dashboard"));
    expect(res.status).toBeGreaterThanOrEqual(300);
    expect(res.status).toBeLessThan(400);
    const location = new URL(res.headers.get("location") as string);
    expect(location.pathname).toBe("/ap/login");
    expect(location.pathname).not.toBe("/unauthorized");
  });
});

describe("signup OTP API and legacy redirects", () => {
  it("lets /api/* pass through without auth redirects", async () => {
    const res = await middleware(requestFor("/api/auth/customer/send-signup-otp"));
    expect(res.status).toBeLessThan(300);
  });

  it("permanently redirects legacy customer-auth-v2 signup to canonical signup", async () => {
    const res = await middleware(requestFor("/customer-auth-v2/signup"));
    expect(res.status).toBe(308);
    expect(new URL(res.headers.get("location") as string).pathname).toBe("/customer/signup");
  });
});
