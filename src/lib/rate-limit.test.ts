import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows up to the limit and blocks the next call", () => {
    const key = `test:allow:${Math.random()}`;
    for (let call = 0; call < 3; call += 1) {
      expect(checkRateLimit(key, 3, 60_000).ok).toBe(true);
    }

    const blocked = checkRateLimit(key, 3, 60_000);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThan(0);
  });

  it("starts a fresh window once the old one expires", () => {
    const key = `test:window:${Math.random()}`;
    expect(checkRateLimit(key, 1, 60_000).ok).toBe(true);
    expect(checkRateLimit(key, 1, 60_000).ok).toBe(false);

    vi.advanceTimersByTime(60_001);
    expect(checkRateLimit(key, 1, 60_000).ok).toBe(true);
  });

  it("counts each key independently", () => {
    const suffix = Math.random();
    expect(checkRateLimit(`test:a:${suffix}`, 1, 60_000).ok).toBe(true);
    expect(checkRateLimit(`test:b:${suffix}`, 1, 60_000).ok).toBe(true);
  });
});

describe("getClientIp", () => {
  it("prefers the first x-forwarded-for hop", () => {
    const request = new Request("https://example.com", {
      headers: { "x-forwarded-for": "203.0.113.9, 10.0.0.1", "x-real-ip": "10.0.0.2" },
    });
    expect(getClientIp(request)).toBe("203.0.113.9");
  });

  it("falls back to x-real-ip, then to unknown", () => {
    expect(getClientIp(new Request("https://example.com", { headers: { "x-real-ip": "203.0.113.5" } }))).toBe(
      "203.0.113.5",
    );
    expect(getClientIp(new Request("https://example.com"))).toBe("unknown");
  });
});
