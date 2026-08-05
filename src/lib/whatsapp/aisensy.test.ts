import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  __resetAisensySendDedupeForTests,
  buildAisensyOtpPayloadParts,
  describeOtpPayloadContract,
  getCampaignName,
  isAisensySuccessResponse,
  loadAisensyConfig,
  lookupAisensyMessageStatus,
  maskTemplateParamForLog,
  normalizeAisensyDestination,
  redactSecrets,
  resolveOtpCampaign,
  sendAisensyOtp,
} from "@/lib/whatsapp/aisensy";

const ENV_KEYS = [
  "WHATSAPP_PROVIDER",
  "AISENSY_API_KEY",
  "AISENSY_PROJECT_API_KEY",
  "AISENSY_OTP_CAMPAIGN_NAME",
  "AISENSY_SIGNUP_CAMPAIGN",
  "AISENSY_CAMPAIGN_NAME_SIGNUP",
  "AISENSY_PASSWORD_RESET_CAMPAIGN",
  "AISENSY_RESET_CAMPAIGN",
  "AISENSY_CAMPAIGN_NAME_RESET",
  "AISENSY_LOGIN_CAMPAIGN",
  "AISENSY_CAMPAIGN_NAME_LOGIN",
  "AISENSY_API_URL",
  "AISENSY_BASE_URL",
  "AISENSY_OTP_INCLUDE_EXPIRY_PARAM",
  "AISENSY_OTP_EXPIRY_MINUTES",
  "AISENSY_OTP_BUTTON_MODE",
  "AISENSY_DESTINATION_FORMAT",
  "AISENSY_MESSAGE_STATUS_URL",
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
    AISENSY_API_URL: "https://backend.aisensy.com/campaign/t1/api/v2",
    AISENSY_PROJECT_API_KEY: undefined,
    AISENSY_OTP_CAMPAIGN_NAME: undefined,
    AISENSY_SIGNUP_CAMPAIGN: undefined,
    AISENSY_CAMPAIGN_NAME_SIGNUP: undefined,
    AISENSY_PASSWORD_RESET_CAMPAIGN: undefined,
    AISENSY_RESET_CAMPAIGN: undefined,
    AISENSY_CAMPAIGN_NAME_RESET: undefined,
    AISENSY_LOGIN_CAMPAIGN: undefined,
    AISENSY_CAMPAIGN_NAME_LOGIN: undefined,
    AISENSY_BASE_URL: undefined,
    AISENSY_OTP_INCLUDE_EXPIRY_PARAM: undefined,
    AISENSY_OTP_EXPIRY_MINUTES: undefined,
    AISENSY_OTP_BUTTON_MODE: undefined,
    AISENSY_DESTINATION_FORMAT: undefined,
    AISENSY_MESSAGE_STATUS_URL: undefined,
  });
});

afterEach(() => {
  restoreEnv();
  __resetAisensySendDedupeForTests();
  vi.restoreAllMocks();
});

describe("resolveOtpCampaign", () => {
  it("uses signup env resolution order without login/reset fallback", () => {
    setEnv({
      AISENSY_SIGNUP_CAMPAIGN: undefined,
      AISENSY_CAMPAIGN_NAME_SIGNUP: "prod_signup_live",
      AISENSY_LOGIN_CAMPAIGN: "must_not_use_login",
      AISENSY_PASSWORD_RESET_CAMPAIGN: "must_not_use_reset",
      AISENSY_OTP_CAMPAIGN_NAME: "shared_otp",
    });
    const resolved = resolveOtpCampaign("customer_signup");
    expect(resolved.ok).toBe(true);
    if (resolved.ok) {
      expect(resolved.campaignName).toBe("prod_signup_live");
      expect(resolved.source).toBe("AISENSY_CAMPAIGN_NAME_SIGNUP");
    }
  });

  it("does not use login campaign for signup when signup envs are unset (uses intentional default)", () => {
    setEnv({
      AISENSY_SIGNUP_CAMPAIGN: undefined,
      AISENSY_CAMPAIGN_NAME_SIGNUP: undefined,
      AISENSY_OTP_CAMPAIGN_NAME: undefined,
      AISENSY_LOGIN_CAMPAIGN: "login_only",
    });
    const resolved = resolveOtpCampaign("customer_signup");
    expect(resolved.ok).toBe(true);
    if (resolved.ok) {
      expect(resolved.campaignName).toBe("signup_otp");
      expect(resolved.campaignName).not.toBe("login_only");
    }
  });

  it("rejects forbidden work confirmation campaign for signup", () => {
    setEnv({ AISENSY_SIGNUP_CAMPAIGN: "DCD_NEW_WORK_CONFIRMATION" });
    const resolved = resolveOtpCampaign("customer_signup");
    expect(resolved.ok).toBe(false);
    if (!resolved.ok) {
      expect(resolved.code).toBe("OTP_FORBIDDEN_CAMPAIGN");
    }
  });
});

describe("getCampaignName", () => {
  it("maps signup purposes to signup_otp by default", () => {
    expect(getCampaignName("customer_signup")).toBe("signup_otp");
    expect(getCampaignName("signup")).toBe("signup_otp");
  });

  it("maps forgot/create/reset PIN purposes to password_reset by default", () => {
    expect(getCampaignName("forgot_pin")).toBe("password_reset");
    expect(getCampaignName("forgot_password")).toBe("password_reset");
    expect(getCampaignName("create_pin")).toBe("password_reset");
    expect(getCampaignName("legacy_pin_activation")).toBe("password_reset");
    expect(getCampaignName("password_reset")).toBe("password_reset");
  });

  it("maps login purposes to login_otp by default", () => {
    expect(getCampaignName("login")).toBe("login_otp");
    expect(getCampaignName("login_otp")).toBe("login_otp");
  });

  it("uses environment overrides when set", () => {
    setEnv({
      AISENSY_SIGNUP_CAMPAIGN: "signup_otp",
      AISENSY_PASSWORD_RESET_CAMPAIGN: "password_reset",
      AISENSY_LOGIN_CAMPAIGN: "login_otp",
    });
    expect(getCampaignName("customer_signup")).toBe("signup_otp");
    expect(getCampaignName("forgot_pin")).toBe("password_reset");
    expect(getCampaignName("login")).toBe("login_otp");
  });

  it("never returns DCD_NEW_WORK_CONFIRMATION for auth", () => {
    setEnv({ AISENSY_SIGNUP_CAMPAIGN: "DCD_NEW_WORK_CONFIRMATION" });
    // Falls back to purpose-appropriate default (signup_otp), not password_reset
    expect(getCampaignName("customer_signup")).toBe("signup_otp");
  });

  it("uses legacy AISENSY_OTP_CAMPAIGN_NAME when purpose-specific env is unset", () => {
    setEnv({
      AISENSY_SIGNUP_CAMPAIGN: undefined,
      AISENSY_CAMPAIGN_NAME_SIGNUP: undefined,
      AISENSY_OTP_CAMPAIGN_NAME: "legacy_signup_campaign",
    });
    expect(getCampaignName("customer_signup")).toBe("legacy_signup_campaign");
  });

  it("prefers AISENSY_CAMPAIGN_NAME_SIGNUP over shared OTP campaign name", () => {
    setEnv({
      AISENSY_SIGNUP_CAMPAIGN: undefined,
      AISENSY_CAMPAIGN_NAME_SIGNUP: "prod_signup_live",
      AISENSY_OTP_CAMPAIGN_NAME: "shared_otp",
    });
    expect(getCampaignName("customer_signup")).toBe("prod_signup_live");
  });
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
  it("fails when API key is missing", () => {
    setEnv({ AISENSY_API_KEY: undefined });
    const result = loadAisensyConfig();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("missing_api_key");
    }
  });

  it("succeeds without legacy AISENSY_OTP_CAMPAIGN_NAME", () => {
    setEnv({ AISENSY_OTP_CAMPAIGN_NAME: undefined });
    const result = loadAisensyConfig();
    expect(result.ok).toBe(true);
  });
});

describe("isAisensySuccessResponse", () => {
  it("accepts valid API success shapes", () => {
    expect(isAisensySuccessResponse(200, { success: true })).toBe(true);
    expect(isAisensySuccessResponse(200, { submitted_message_id: "abc123xyz" })).toBe(true);
    expect(isAisensySuccessResponse(200, { status: "success" })).toBe(true);
    expect(
      isAisensySuccessResponse(200, {
        success: "true",
        submitted_message_id: "38f7abbe-c01a-47d5-b075-9c228c2e401b",
      }),
    ).toBe(true);
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

describe("sendAisensyOtp campaign selection", () => {
  it("signup sends using signup_otp", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ submitted_message_id: "msg_12345678" }), { status: 200 }),
    ) as unknown as typeof fetch;

    const result = await sendAisensyOtp({
      phone: "9876543210",
      otp: "482913",
      purpose: "customer_signup",
      fetchImpl,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.campaignName).toBe("signup_otp");
      expect(result.destination).toBe("919876543210");
    }

    const body = JSON.parse(String(fetchImpl.mock.calls[0]?.[1]?.body)) as {
      campaignName: string;
      templateParams: string[];
    };
    expect(body.campaignName).toBe("signup_otp");
    expect(body.templateParams).toEqual(["482913"]);
  });

  it("forgot/create PIN sends using password_reset", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ submitted_message_id: "msg_abcdef12" }), { status: 200 }),
    ) as unknown as typeof fetch;

    const result = await sendAisensyOtp({
      phone: "9876543210",
      otp: "482913",
      purpose: "forgot_pin",
      fetchImpl,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.campaignName).toBe("password_reset");
    }

    const body = JSON.parse(String(fetchImpl.mock.calls[0]?.[1]?.body)) as { campaignName: string };
    expect(body.campaignName).toBe("password_reset");
  });

  it("login OTP sends using login_otp", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ submitted_message_id: "msg_login123" }), { status: 200 }),
    ) as unknown as typeof fetch;

    const result = await sendAisensyOtp({
      phone: "9876543210",
      otp: "482913",
      purpose: "login_otp",
      fetchImpl,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.campaignName).toBe("login_otp");
    }

    const body = JSON.parse(String(fetchImpl.mock.calls[0]?.[1]?.body)) as { campaignName: string };
    expect(body.campaignName).toBe("login_otp");
  });

  it("returns generic user-facing error when AiSensy rejects", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ success: false, error: "Campaign not live" }), { status: 200 }),
    ) as unknown as typeof fetch;

    const result = await sendAisensyOtp({
      phone: "9876543210",
      otp: "482913",
      purpose: "forgot_pin",
      fetchImpl,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("provider_rejected");
      expect(result.error).toBe("Unable to send OTP. Please try again in a few minutes.");
      expect(result.error).not.toContain("Campaign not live");
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
      purpose: "customer_signup",
      fetchImpl,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("timeout");
      expect(result.error).toBe("Unable to send OTP. Please try again in a few minutes.");
    }
  });

  it("rejects invalid phone before calling provider", async () => {
    const fetchImpl = vi.fn() as unknown as typeof fetch;
    const result = await sendAisensyOtp({
      phone: "123",
      otp: "482913",
      purpose: "login",
      fetchImpl,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("invalid_phone");
    }
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("fails fast when API key is missing", async () => {
    setEnv({ AISENSY_API_KEY: undefined });
    const fetchImpl = vi.fn() as unknown as typeof fetch;
    const result = await sendAisensyOtp({
      phone: "9876543210",
      otp: "482913",
      purpose: "customer_signup",
      fetchImpl,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("missing_api_key");
    }
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it.each([
    [400, "provider_rejected"],
    [401, "provider_rejected"],
    [403, "provider_rejected"],
    [429, "provider_rejected"],
    [500, "provider_rejected"],
  ] as const)("maps AiSensy HTTP %s to failure", async (status, expectedCode) => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ error: `http_${status}` }), { status }),
    ) as unknown as typeof fetch;

    const result = await sendAisensyOtp({
      phone: "9876543210",
      otp: "482913",
      purpose: "customer_signup",
      fetchImpl,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe(expectedCode);
      expect(result.httpStatus).toBe(status);
    }
  });

  it("rejects malformed provider JSON on HTTP 200", async () => {
    const fetchImpl = vi.fn(async () => new Response("not-json{", { status: 200 })) as unknown as typeof fetch;
    const result = await sendAisensyOtp({
      phone: "9876543210",
      otp: "482913",
      purpose: "customer_signup",
      fetchImpl,
    });
    expect(result.ok).toBe(false);
  });

  it("builds signup payload with OTP in templateParams[0]", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ submitted_message_id: "msg_payload12" }), { status: 200 }),
    ) as unknown as typeof fetch;

    setEnv({ AISENSY_CAMPAIGN_NAME_SIGNUP: "approved_signup_campaign" });

    await sendAisensyOtp({
      phone: "+919876543210",
      otp: "654321",
      purpose: "customer_signup",
      fetchImpl,
    });

    const body = JSON.parse(String(fetchImpl.mock.calls[0]?.[1]?.body)) as {
      campaignName: string;
      destination: string;
      templateParams: string[];
      buttons: Array<{ sub_type: string; parameters: Array<{ text: string }> }>;
      apiKey: string;
    };
    expect(body.campaignName).toBe("approved_signup_campaign");
    expect(body.destination).toBe("919876543210");
    expect(body.templateParams).toEqual(["654321"]);
    expect(body.buttons?.[0]?.sub_type).toBe("url");
    expect(body.buttons?.[0]?.parameters?.[0]?.text).toBe("654321");
    expect(body.apiKey).toBe("test-api-key-abcdef123456");
  });

  it("returns submitted_message_id separately from requestId", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({ success: "true", submitted_message_id: "38f7abbe-c01a-47d5-b075-9c228c2e401b" }),
        { status: 200 },
      ),
    ) as unknown as typeof fetch;

    const result = await sendAisensyOtp({
      phone: "9876543210",
      otp: "482913",
      purpose: "customer_signup",
      fetchImpl,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.providerMessageId).toBe("38f7abbe-c01a-47d5-b075-9c228c2e401b");
      expect(result.requestId).not.toBe(result.providerMessageId);
    }
  });
});

describe("OTP payload contract + masking", () => {
  it("masks OTP digits without leaking the code", () => {
    expect(maskTemplateParamForLog("482913")).toBe("[OTP_6]");
    expect(maskTemplateParamForLog("482913")).not.toContain("482913");
  });

  it("defaults to single OTP param + url button", () => {
    const contract = describeOtpPayloadContract();
    expect(contract.templateParamCount).toBe(1);
    expect(contract.buttonMode).toBe("url");
    const parts = buildAisensyOtpPayloadParts("123456");
    expect(parts.templateParams).toEqual(["123456"]);
    expect(parts.buttons?.[0]?.sub_type).toBe("url");
  });

  it("adds expiry param only when explicitly enabled", () => {
    setEnv({ AISENSY_OTP_INCLUDE_EXPIRY_PARAM: "true", AISENSY_OTP_EXPIRY_MINUTES: "5" });
    const parts = buildAisensyOtpPayloadParts("123456");
    expect(parts.templateParams).toEqual(["123456", "5"]);
    expect(parts.contract.templateParamCount).toBe(2);
  });

  it("lookup reports unavailable when status URL is unset", async () => {
    const status = await lookupAisensyMessageStatus("38f7abbe-c01a-47d5-b075-9c228c2e401b");
    expect(status.source).toBe("unavailable");
    expect(status.ok).toBe(false);
  });
});
