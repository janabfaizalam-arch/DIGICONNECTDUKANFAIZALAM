import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  __resetAisensySendDedupeForTests,
  isAisensySuccessResponse,
  loadAisensyConfig,
  normalizeAisensyDestination,
  redactSecrets,
  sendAisensyOtp,
} from "@/lib/whatsapp/aisensy";

const ENV_KEYS = [
  "WHATSAPP_PROVIDER",
  "AISENSY_API_KEY",
  "AISENSY_PROJECT_API_KEY",
  "AISENSY_OTP_CAMPAIGN_NAME",
  "AISENSY_API_URL",
] as const;

const originalEnv: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {};

function setEnv(values: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>>) {
  for (const key of Object.keys(values) as Array<(typeof ENV_KEYS)[number]>) {
    const value = values[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

function restoreEnv() {
  for (const key of ENV_KEYS) {
    const value = originalEnv[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

beforeEach(() => {
  for (const key of ENV_KEYS) {
    originalEnv[key] = process.env[key];
  }
  __resetAisensySendDedupeForTests();
  setEnv({
    WHATSAPP_PROVIDER: "aisensy",
    AISENSY_API_KEY: "test-api-key-abcdef123456",
    AISENSY_OTP_CAMPAIGN_NAME: "auth_otp_campaign",
    AISENSY_API_URL: "https://backend.aisensy.com/campaign/t1/api/v2",
    AISENSY_PROJECT_API_KEY: undefined,
  });
});

afterEach(() => {
  restoreEnv();
  __resetAisensySendDedupeForTests();
  vi.restoreAllMocks();
});

describe("normalizeAisensyDestination", () => {
  it("normalizes Indian numbers to 91XXXXXXXXXX", () => {
    expect(normalizeAisensyDestination("+91 98765-43210")).toEqual({
      ok: true,
      destination: "919876543210",
      local: "9876543210",
    });
    expect(normalizeAisensyDestination("9876543210").ok && normalizeAisensyDestination("9876543210").destination).toBe(
      "919876543210",
    );
  });

  it("rejects invalid Indian numbers", () => {
    expect(normalizeAisensyDestination("12345").ok).toBe(false);
    expect(normalizeAisensyDestination("5876543210").ok).toBe(false);
  });
});

describe("loadAisensyConfig", () => {
  it("fails when environment variables are missing", () => {
    setEnv({ AISENSY_API_KEY: undefined, AISENSY_OTP_CAMPAIGN_NAME: undefined });
    const result = loadAisensyConfig();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("missing_api_key");
    }
  });

  it("fails when campaign name is missing", () => {
    setEnv({ AISENSY_OTP_CAMPAIGN_NAME: undefined });
    const result = loadAisensyConfig();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("missing_campaign");
    }
  });
});

describe("isAisensySuccessResponse", () => {
  it("accepts valid API success shapes", () => {
    expect(isAisensySuccessResponse(200, { success: true })).toBe(true);
    expect(isAisensySuccessResponse(200, { submitted_message_id: "abc123xyz" })).toBe(true);
    expect(isAisensySuccessResponse(200, { status: "success" })).toBe(true);
  });

  it("rejects HTTP 200 with error payloads", () => {
    expect(isAisensySuccessResponse(200, { success: false, error: "bad campaign" })).toBe(false);
    expect(isAisensySuccessResponse(200, { error: "Invalid API Key" })).toBe(false);
    expect(isAisensySuccessResponse(200, {})).toBe(false);
    expect(isAisensySuccessResponse(500, { success: true })).toBe(false);
  });
});

describe("redactSecrets", () => {
  it("redacts API keys from log strings", () => {
    const key = "test-api-key-abcdef123456";
    const raw = `{"apiKey":"${key}","msg":"fail ${key}"}`;
    const redacted = redactSecrets(raw, key);
    expect(redacted).not.toContain(key);
    expect(redacted).toContain("[REDACTED_API_KEY]");
  });
});

describe("sendAisensyOtp", () => {
  it("returns ok for valid API response", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ submitted_message_id: "msg_12345678" }), { status: 200 }),
    ) as unknown as typeof fetch;

    const result = await sendAisensyOtp({
      phone: "9876543210",
      otp: "482913",
      fetchImpl,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.destination).toBe("919876543210");
      expect(result.campaignName).toBe("auth_otp_campaign");
    }

    const body = JSON.parse(String(fetchImpl.mock.calls[0]?.[1]?.body)) as {
      destination: string;
      apiKey: string;
      campaignName: string;
      templateParams: string[];
    };
    expect(body.destination).toBe("919876543210");
    expect(body.campaignName).toBe("auth_otp_campaign");
    expect(body.templateParams).toEqual(["482913"]);
    expect(body.apiKey).toBe("test-api-key-abcdef123456");
  });

  it("returns provider failure when AiSensy rejects", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ success: false, error: "Campaign not live" }), { status: 200 }),
    ) as unknown as typeof fetch;

    const result = await sendAisensyOtp({
      phone: "9876543210",
      otp: "482913",
      fetchImpl,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("provider_rejected");
    }
  });

  it("returns timeout on abort", async () => {
    const fetchImpl = vi.fn(async () => {
      const error = new Error("Aborted");
      error.name = "AbortError";
      throw error;
    }) as unknown as typeof fetch;

    const result = await sendAisensyOtp({
      phone: "9876543210",
      otp: "482913",
      fetchImpl,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("timeout");
    }
  });

  it("rejects invalid phone before calling provider", async () => {
    const fetchImpl = vi.fn() as unknown as typeof fetch;
    const result = await sendAisensyOtp({
      phone: "123",
      otp: "482913",
      fetchImpl,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("invalid_phone");
    }
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("fails fast when env vars are missing", async () => {
    setEnv({ AISENSY_API_KEY: undefined, AISENSY_OTP_CAMPAIGN_NAME: undefined });
    const fetchImpl = vi.fn() as unknown as typeof fetch;
    const result = await sendAisensyOtp({
      phone: "9876543210",
      otp: "482913",
      fetchImpl,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("missing_api_key");
    }
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
