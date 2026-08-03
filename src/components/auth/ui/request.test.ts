import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { messageFor, postJson } from "@/components/auth/ui/request";

describe("postJson auth helper", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("treats HTTP 200 without ok/success as failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ maskedPhone: "+91 98XXXXXX10" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    const result = await postJson("/api/auth/customer/send-signup-otp", { phone: "9876543210" });
    expect(result.ok).toBe(false);
    expect(result.status).toBe(200);
  });

  it("succeeds only when ok:true is present", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ ok: true, maskedPhone: "+91 98XXXXXX10" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    const result = await postJson("/api/auth/customer/send-signup-otp", { phone: "9876543210" });
    expect(result.ok).toBe(true);
  });

  it("fails on HTML responses so OTP screen does not open", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response("<html>login</html>", {
          status: 200,
          headers: { "Content-Type": "text/html" },
        }),
      ),
    );

    const result = await postJson("/api/auth/customer/send-signup-otp", { phone: "9876543210" });
    expect(result.ok).toBe(false);
    expect(result.nonJson).toBe(true);
    expect(messageFor(result, "fallback")).toMatch(/invalid response|non-JSON|hard-refresh/i);
  });

  it("fails on redirects", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(null, {
          status: 302,
          headers: { Location: "/customer/login" },
        }),
      ),
    );

    const result = await postJson("/api/auth/customer/send-signup-otp", { phone: "9876543210" });
    expect(result.ok).toBe(false);
    expect(result.redirected).toBe(true);
  });
});

describe("normalizeIndianPhone (signup inputs)", () => {
  // Lazy import to keep request tests isolated.
  beforeEach(async () => {
    await import("@/lib/auth/phone");
  });

  it("accepts 10-digit, +91, and 91-prefixed mobiles", async () => {
    const { normalizeIndianPhone } = await import("@/lib/auth/phone");
    expect(normalizeIndianPhone("9876543210")).toEqual({
      ok: true,
      local: "9876543210",
      e164: "+919876543210",
      display: "+91 9876543210",
    });
    expect(normalizeIndianPhone("+91 98765 43210").ok && normalizeIndianPhone("+91 98765 43210").local).toBe(
      "9876543210",
    );
    expect(normalizeIndianPhone("919876543210").ok && normalizeIndianPhone("919876543210").e164).toBe(
      "+919876543210",
    );
  });

  it("rejects invalid mobiles", async () => {
    const { normalizeIndianPhone } = await import("@/lib/auth/phone");
    expect(normalizeIndianPhone("12345").ok).toBe(false);
    expect(normalizeIndianPhone("5876543210").ok).toBe(false);
  });
});
