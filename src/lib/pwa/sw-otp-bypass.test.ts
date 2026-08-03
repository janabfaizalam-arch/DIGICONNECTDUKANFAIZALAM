import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("service worker OTP / auth bypass", () => {
  const sw = readFileSync(join(process.cwd(), "public/sw.js"), "utf8");

  it("bumps cache version past digiconnect-static-v1", () => {
    expect(sw).toContain('CACHE_NAME = "digiconnect-static-v2"');
    expect(sw).not.toContain('CACHE_NAME = "digiconnect-static-v1"');
  });

  it("never caches API, auth, signup, or customer-auth paths", () => {
    for (const prefix of ["/api/", "/login", "/signup", "/customer-auth", "/auth/", "/customer"]) {
      expect(sw).toContain(`"${prefix}"`);
    }
  });

  it("does not intercept non-GET requests", () => {
    expect(sw).toContain('request.method !== "GET"');
  });

  it("does not permanently cache /_next/static JS", () => {
    expect(sw).toContain('url.pathname.startsWith("/_next/static/")');
    expect(sw).toMatch(/\/_next\/static\/[\s\S]{0,200}return false/);
  });
});
