import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { GET } from "./route";
import { fetchRazorpayKeyId, getCheckoutRazorpayKey, resetCachedRazorpayKeyId } from "@/lib/razorpay-client";

describe("GET /api/razorpay/config", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    resetCachedRazorpayKeyId();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
    resetCachedRazorpayKeyId();
    vi.restoreAllMocks();
  });

  it("returns 200 and keyId when RAZORPAY_KEY_ID is configured", async () => {
    process.env.RAZORPAY_KEY_ID = "rzp_live_test_key_12345";
    process.env.RAZORPAY_KEY_SECRET = "super_secret_never_leak_me";
    process.env.RAZORPAY_WEBHOOK_SECRET = "webhook_secret_never_leak_me";

    const response = await GET();
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toEqual({
      ok: true,
      keyId: "rzp_live_test_key_12345",
    });

    // Verify secrets are NOT exposed
    const stringified = JSON.stringify(data);
    expect(stringified).not.toContain("super_secret_never_leak_me");
    expect(stringified).not.toContain("webhook_secret_never_leak_me");
    expect(data.keySecret).toBeUndefined();
    expect(data.secret).toBeUndefined();

    // Verify cache control header
    expect(response.headers.get("Cache-Control")).toContain("no-store");
  });

  it("returns 503 when RAZORPAY_KEY_ID is missing", async () => {
    delete process.env.RAZORPAY_KEY_ID;
    delete process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

    const response = await GET();
    expect(response.status).toBe(503);

    const data = await response.json();
    expect(data.ok).toBe(false);
    expect(data.error).toMatch(/Razorpay is not configured/i);
    expect(data.keyId).toBeUndefined();
  });
});

describe("Client helper: razorpay-client", () => {
  beforeEach(() => {
    resetCachedRazorpayKeyId();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    resetCachedRazorpayKeyId();
    vi.restoreAllMocks();
  });

  it("fetchRazorpayKeyId fetches key from /api/razorpay/config and caches it", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, keyId: "rzp_test_abc123" }),
    } as unknown as Response);

    const key1 = await fetchRazorpayKeyId();
    expect(key1).toBe("rzp_test_abc123");
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Second call should return cached key without fetching again
    const key2 = await fetchRazorpayKeyId();
    expect(key2).toBe("rzp_test_abc123");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("fetchRazorpayKeyId throws when server returns error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => ({ ok: false, error: "Razorpay is not configured on the server." }),
    } as unknown as Response);

    await expect(fetchRazorpayKeyId()).rejects.toThrow("Razorpay is not configured on the server.");
  });

  it("getCheckoutRazorpayKey prefers orderKeyId when present", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const key = await getCheckoutRazorpayKey("rzp_order_payload_key");
    expect(key).toBe("rzp_order_payload_key");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("getCheckoutRazorpayKey falls back to fetchRazorpayKeyId when orderKeyId is empty", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, keyId: "rzp_fallback_key" }),
    } as unknown as Response);

    const key = await getCheckoutRazorpayKey("");
    expect(key).toBe("rzp_fallback_key");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
