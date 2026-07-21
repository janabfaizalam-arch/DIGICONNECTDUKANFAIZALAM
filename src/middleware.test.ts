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
