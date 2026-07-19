/**
 * AiSensy WhatsApp Campaign API — delivery only.
 * OTP generation/verification stays on our server (auth_otp_requests).
 *
 * Live campaigns (do not create new ones):
 * - signup_otp
 * - password_reset
 * - login_otp
 *
 * Never use DCD_NEW_WORK_CONFIRMATION for authentication.
 */

import { randomUUID } from "crypto";

const DEFAULT_AISENSY_API_URL = "https://backend.aisensy.com/campaign/t1/api/v2";
const REQUEST_TIMEOUT_MS = 15_000;
const DUPLICATE_SEND_WINDOW_MS = 5_000;

const DEFAULT_SIGNUP_CAMPAIGN = "signup_otp";
const DEFAULT_PASSWORD_RESET_CAMPAIGN = "password_reset";
const DEFAULT_LOGIN_CAMPAIGN = "login_otp";
const FORBIDDEN_AUTH_CAMPAIGN = "DCD_NEW_WORK_CONFIRMATION";

/** Safe message returned to clients — never expose AiSensy API errors. */
export const AISENSY_USER_FACING_SEND_ERROR =
  "Unable to send OTP. Please try again in a few minutes.";

export type AisensyOtpPurpose =
  | "customer_signup"
  | "signup"
  | "forgot_pin"
  | "forgot_password"
  | "create_pin"
  | "legacy_pin_activation"
  | "password_reset"
  | "login"
  | "login_otp"
  | "change_phone"
  | "security_verification";

export type AisensySendResult =
  | { ok: true; provider: "aisensy"; destination: string; campaignName: string; requestId: string }
  | { ok: false; provider: "aisensy"; error: string; code?: string; requestId?: string; campaignName?: string };

type AisensyConfig = {
  apiKey: string;
  apiUrl: string;
};

/** Recent in-flight / completed sends to reduce accidental duplicate delivery. */
const recentSendKeys = new Map<string, number>();

export function getWhatsappProvider(): string {
  return (process.env.WHATSAPP_PROVIDER ?? "aisensy").trim().toLowerCase();
}

/**
 * Select the existing AiSensy LIVE campaign for an OTP purpose.
 * Defaults match dashboard campaign names when env vars are unset.
 */
export function getCampaignName(purpose: string): string {
  const normalized = String(purpose ?? "")
    .trim()
    .toLowerCase();

  let campaign: string;

  switch (normalized) {
    case "customer_signup":
    case "signup":
      campaign = process.env.AISENSY_SIGNUP_CAMPAIGN?.trim() || DEFAULT_SIGNUP_CAMPAIGN;
      break;

    case "forgot_pin":
    case "forgot_password":
    case "create_pin":
    case "legacy_pin_activation":
    case "password_reset":
    case "change_phone":
    case "security_verification":
      campaign =
        process.env.AISENSY_PASSWORD_RESET_CAMPAIGN?.trim() || DEFAULT_PASSWORD_RESET_CAMPAIGN;
      break;

    case "login":
    case "login_otp":
      campaign = process.env.AISENSY_LOGIN_CAMPAIGN?.trim() || DEFAULT_LOGIN_CAMPAIGN;
      break;

    default:
      console.warn("[aisensy] unknown_purpose_using_password_reset", { purpose: normalized });
      campaign =
        process.env.AISENSY_PASSWORD_RESET_CAMPAIGN?.trim() || DEFAULT_PASSWORD_RESET_CAMPAIGN;
      break;
  }

  if (campaign === FORBIDDEN_AUTH_CAMPAIGN) {
    console.error("[aisensy] forbidden_campaign_blocked", {
      purpose: normalized,
      campaign,
    });
    return DEFAULT_PASSWORD_RESET_CAMPAIGN;
  }

  return campaign;
}

export function redactSecrets(value: string, apiKey?: string): string {
  let out = value;
  const key = apiKey?.trim();
  if (key && key.length >= 8) {
    out = out.split(key).join("[REDACTED_API_KEY]");
  }
  out = out.replace(/("apiKey"\s*:\s*")[^"]+(")/gi, "$1[REDACTED_API_KEY]$2");
  out = out.replace(/(apiKey=)[^\s&]+/gi, "$1[REDACTED_API_KEY]");
  // Never leak OTP digits from accidental payload dumps
  out = out.replace(/("templateParams"\s*:\s*\[\s*")\d{4,8}(")/gi, "$1[REDACTED_OTP]$2");
  out = out.replace(/("text"\s*:\s*")\d{4,8}(")/gi, "$1[REDACTED_OTP]$2");
  return out;
}

export function normalizeAisensyDestination(
  input: string,
): { ok: true; destination: string; local: string } | { ok: false; error: string } {
  const digits = String(input ?? "").replace(/[\s\-+()]/g, "").replace(/\D/g, "");

  let local = digits;
  if (local.startsWith("91") && local.length === 12) {
    local = local.slice(2);
  }
  if (local.length === 11 && local.startsWith("0")) {
    local = local.slice(1);
  }

  if (!/^[6-9]\d{9}$/.test(local)) {
    return { ok: false, error: "Valid Indian 10-digit WhatsApp number required." };
  }

  return { ok: true, destination: `91${local}`, local };
}

function maskPhoneLocal(local: string): string {
  if (local.length !== 10) return "91XXXXXXXXXX";
  return `91${local.slice(0, 2)}******${local.slice(-2)}`;
}

export function loadAisensyConfig():
  | { ok: true; config: AisensyConfig }
  | { ok: false; error: string; code: string } {
  const provider = getWhatsappProvider();
  if (provider !== "aisensy") {
    return {
      ok: false,
      error: `Unsupported WHATSAPP_PROVIDER="${provider}". Expected "aisensy".`,
      code: "unsupported_provider",
    };
  }

  const apiKey = process.env.AISENSY_API_KEY?.trim() || process.env.AISENSY_PROJECT_API_KEY?.trim();
  const apiUrl = (process.env.AISENSY_API_URL?.trim() || DEFAULT_AISENSY_API_URL).replace(/\/$/, "");

  if (!apiKey) {
    return { ok: false, error: "AISENSY_API_KEY is not configured.", code: "missing_api_key" };
  }

  return { ok: true, config: { apiKey, apiUrl } };
}

/** Exported for unit tests — validates provider response beyond bare HTTP 200. */
export function isAisensySuccessResponse(status: number, body: unknown): boolean {
  if (status < 200 || status >= 300) return false;

  if (body == null || body === "") return false;

  if (typeof body === "string") {
    const trimmed = body.trim();
    if (!trimmed) return false;
    const lower = trimmed.toLowerCase();
    if (lower.includes("error") || lower.includes("fail") || lower.includes("invalid")) {
      return false;
    }
    if (lower === "success" || lower === "ok" || lower === "true") return true;
    try {
      return isAisensySuccessResponse(status, JSON.parse(trimmed));
    } catch {
      return /^[a-z0-9_-]{8,}$/i.test(trimmed);
    }
  }

  if (typeof body !== "object") return false;

  const record = body as Record<string, unknown>;
  if (record.success === false || record.ok === false) return false;

  const errorField = record.error ?? record.Error ?? record.message_error ?? record.err;
  if (typeof errorField === "string" && errorField.trim()) return false;
  if (errorField && typeof errorField === "object") return false;

  if (record.success === true || record.ok === true) return true;

  const statusText = String(record.status ?? record.Status ?? "").toLowerCase();
  if (statusText === "success" || statusText === "ok" || statusText === "submitted") return true;

  if (
    record.submitted_message_id ||
    record.submittedMessageId ||
    record.messageId ||
    record.message_id ||
    record.request_id ||
    record.requestId
  ) {
    return true;
  }

  return false;
}

function parseResponseBody(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return trimmed;
  }
}

function sendDedupeKey(destination: string, campaignName: string): string {
  return `${destination}:${campaignName}`;
}

function claimSendSlot(destination: string, campaignName: string): boolean {
  const key = sendDedupeKey(destination, campaignName);
  const now = Date.now();
  for (const [k, ts] of recentSendKeys) {
    if (now - ts > DUPLICATE_SEND_WINDOW_MS) recentSendKeys.delete(k);
  }
  const previous = recentSendKeys.get(key);
  if (previous && now - previous < DUPLICATE_SEND_WINDOW_MS) {
    return false;
  }
  recentSendKeys.set(key, now);
  return true;
}

/** Test helper — clears in-memory dedupe map. */
export function __resetAisensySendDedupeForTests() {
  recentSendKeys.clear();
}

export type SendAisensyOtpOptions = {
  phone: string;
  otp: string;
  purpose: AisensyOtpPurpose | string;
  userName?: string;
  source?: string;
  /** Injected for tests */
  fetchImpl?: typeof fetch;
  now?: () => number;
};

/**
 * Deliver OTP via the AiSensy campaign selected for `purpose`.
 * Does not verify OTP — our DB is source of truth.
 * Never logs the OTP value.
 */
export async function sendAisensyOtp(options: SendAisensyOtpOptions): Promise<AisensySendResult> {
  const requestId = randomUUID();
  const purpose = String(options.purpose ?? "").trim() || "password_reset";
  const campaignName = getCampaignName(purpose);

  const loaded = loadAisensyConfig();
  if (!loaded.ok) {
    console.error("[aisensy] config_error", {
      purpose,
      campaign: campaignName,
      requestId,
      code: loaded.code,
      error: loaded.error,
    });
    return {
      ok: false,
      provider: "aisensy",
      error: AISENSY_USER_FACING_SEND_ERROR,
      code: loaded.code,
      requestId,
      campaignName,
    };
  }

  const { config } = loaded;
  const phone = normalizeAisensyDestination(options.phone);
  if (!phone.ok) {
    console.error("[aisensy] invalid_phone", { purpose, campaign: campaignName, requestId });
    return {
      ok: false,
      provider: "aisensy",
      error: phone.error,
      code: "invalid_phone",
      requestId,
      campaignName,
    };
  }

  if (!/^\d{6}$/.test(options.otp)) {
    return {
      ok: false,
      provider: "aisensy",
      error: AISENSY_USER_FACING_SEND_ERROR,
      code: "invalid_otp",
      requestId,
      campaignName,
    };
  }

  if (!claimSendSlot(phone.destination, campaignName)) {
    console.warn("[aisensy] duplicate_send_blocked", {
      purpose,
      campaign: campaignName,
      phone: maskPhoneLocal(phone.local),
      requestId,
    });
    return {
      ok: false,
      provider: "aisensy",
      error: AISENSY_USER_FACING_SEND_ERROR,
      code: "duplicate_send",
      requestId,
      campaignName,
    };
  }

  console.info("[aisensy] send_start", {
    Purpose: purpose,
    Campaign: campaignName,
    Phone: maskPhoneLocal(phone.local),
    "Request Id": requestId,
  });

  const payload = {
    apiKey: config.apiKey,
    campaignName,
    destination: phone.destination,
    userName: options.userName?.trim() || "Customer",
    templateParams: [options.otp],
    source: options.source ?? `digiconnect-auth:${purpose}`,
    buttons: [
      {
        type: "button",
        sub_type: "url",
        index: 0,
        parameters: [{ type: "text", text: options.otp }],
      },
    ],
  };

  const fetchImpl = options.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetchImpl(config.apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const rawText = await response.text();
    const body = parseResponseBody(rawText);
    const safeBody = redactSecrets(
      typeof body === "string" ? body : JSON.stringify(body ?? null),
      config.apiKey,
    );

    const success = isAisensySuccessResponse(response.status, body);

    console.info("[aisensy] send_result", {
      Campaign: campaignName,
      "HTTP Status": response.status,
      "Success/Failure": success ? "Success" : "Failure",
      "AiSensy Response": safeBody.slice(0, 500),
      Purpose: purpose,
      "Request Id": requestId,
    });

    if (!success) {
      recentSendKeys.delete(sendDedupeKey(phone.destination, campaignName));
      return {
        ok: false,
        provider: "aisensy",
        error: AISENSY_USER_FACING_SEND_ERROR,
        code: "provider_rejected",
        requestId,
        campaignName,
      };
    }

    return {
      ok: true,
      provider: "aisensy",
      destination: phone.destination,
      campaignName,
      requestId,
    };
  } catch (error) {
    recentSendKeys.delete(sendDedupeKey(phone.destination, campaignName));
    const aborted = error instanceof Error && error.name === "AbortError";
    const message = aborted
      ? "AiSensy request timed out."
      : error instanceof Error
        ? redactSecrets(error.message, config.apiKey)
        : "AiSensy request failed.";

    console.error("[aisensy] send_result", {
      Campaign: campaignName,
      "HTTP Status": aborted ? "timeout" : "network_error",
      "Success/Failure": "Failure",
      "AiSensy Response": message,
      Purpose: purpose,
      "Request Id": requestId,
    });

    return {
      ok: false,
      provider: "aisensy",
      error: AISENSY_USER_FACING_SEND_ERROR,
      code: aborted ? "timeout" : "network_error",
      requestId,
      campaignName,
    };
  } finally {
    clearTimeout(timer);
  }
}
