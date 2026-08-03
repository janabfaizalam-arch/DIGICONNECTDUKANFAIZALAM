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

import type {
  SendAisensyCampaignInput,
  SendAisensyCampaignResult,
} from "@/lib/whatsapp/types";
import { WHATSAPP_MOBILE_REQUIRED_ERROR } from "@/lib/whatsapp/types";

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
  | {
      ok: false;
      provider: "aisensy";
      /** Safe user-facing message (never includes provider internals). */
      error: string;
      code?: string;
      requestId?: string;
      campaignName?: string;
      httpStatus?: number | null;
      /** Redacted provider response / error detail for server logs only. */
      providerDetail?: string;
    };

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
 *
 * Fallback order for signup:
 *   AISENSY_SIGNUP_CAMPAIGN
 *   → AISENSY_CAMPAIGN_NAME_SIGNUP (legacy Vercel)
 *   → AISENSY_OTP_CAMPAIGN_NAME (legacy shared)
 *   → signup_otp
 */
export function getCampaignName(purpose: string): string {
  const normalized = String(purpose ?? "")
    .trim()
    .toLowerCase();

  let campaign: string;
  let fallback: string;

  switch (normalized) {
    case "customer_signup":
    case "signup":
      fallback = DEFAULT_SIGNUP_CAMPAIGN;
      campaign =
        process.env.AISENSY_SIGNUP_CAMPAIGN?.trim() ||
        process.env.AISENSY_CAMPAIGN_NAME_SIGNUP?.trim() ||
        process.env.AISENSY_OTP_CAMPAIGN_NAME?.trim() ||
        fallback;
      break;

    case "forgot_pin":
    case "forgot_password":
    case "create_pin":
    case "legacy_pin_activation":
    case "password_reset":
    case "change_phone":
    case "security_verification":
      fallback = DEFAULT_PASSWORD_RESET_CAMPAIGN;
      campaign =
        process.env.AISENSY_PASSWORD_RESET_CAMPAIGN?.trim() ||
        process.env.AISENSY_CAMPAIGN_NAME_RESET?.trim() ||
        process.env.AISENSY_OTP_CAMPAIGN_NAME?.trim() ||
        fallback;
      break;

    case "login":
    case "login_otp":
      fallback = DEFAULT_LOGIN_CAMPAIGN;
      campaign =
        process.env.AISENSY_LOGIN_CAMPAIGN?.trim() ||
        process.env.AISENSY_CAMPAIGN_NAME_LOGIN?.trim() ||
        process.env.AISENSY_OTP_CAMPAIGN_NAME?.trim() ||
        fallback;
      break;

    default:
      console.warn("[aisensy] unknown_purpose_using_password_reset", { purpose: normalized });
      fallback = DEFAULT_PASSWORD_RESET_CAMPAIGN;
      campaign =
        process.env.AISENSY_PASSWORD_RESET_CAMPAIGN?.trim() ||
        process.env.AISENSY_CAMPAIGN_NAME_RESET?.trim() ||
        process.env.AISENSY_OTP_CAMPAIGN_NAME?.trim() ||
        fallback;
      break;
  }

  if (campaign === FORBIDDEN_AUTH_CAMPAIGN) {
    console.error("[aisensy] forbidden_campaign_blocked", {
      purpose: normalized,
      campaign,
      fallback,
    });
    return fallback;
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

  if (!local || local.length !== 10) {
    return { ok: false, error: WHATSAPP_MOBILE_REQUIRED_ERROR };
  }
  if (!/^[6-9]\d{9}$/.test(local)) {
    return { ok: false, error: WHATSAPP_MOBILE_REQUIRED_ERROR };
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
  // Preserve production URL aliases used across older Vercel env sets.
  const apiUrl = (
    process.env.AISENSY_API_URL?.trim() ||
    process.env.AISENSY_API_BASE_URL?.trim() ||
    process.env.AISENSY_BASE_URL?.trim() ||
    DEFAULT_AISENSY_API_URL
  ).replace(/\/$/, "");

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

function emptyCampaignResult(
  requestId: string,
  partial: Partial<SendAisensyCampaignResult> & {
    errorCode: string;
    errorMessage: string;
  },
): SendAisensyCampaignResult {
  return {
    ok: false,
    queued: Boolean(partial.queued),
    sent: false,
    failed: !partial.queued && !partial.configuration_required,
    configuration_required: Boolean(partial.configuration_required),
    providerMessageId: partial.providerMessageId ?? null,
    errorCode: partial.errorCode,
    errorMessage: partial.errorMessage,
    campaignName: partial.campaignName ?? null,
    destination: partial.destination ?? null,
    requestId,
    httpStatus: partial.httpStatus ?? null,
  };
}

function extractProviderMessageId(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  const candidate =
    record.submitted_message_id ??
    record.submittedMessageId ??
    record.messageId ??
    record.message_id ??
    record.request_id ??
    record.requestId;
  return candidate == null ? null : String(candidate);
}

/**
 * Central AiSensy Campaign API sender (OTP + application notifications).
 * Never logs API key or OTP/template secrets.
 */
export async function sendAisensyCampaign(
  options: SendAisensyCampaignInput,
): Promise<SendAisensyCampaignResult> {
  const requestId = randomUUID();
  const campaignName = String(options.campaignName ?? "").trim();
  if (!campaignName) {
    return emptyCampaignResult(requestId, {
      errorCode: "missing_campaign",
      errorMessage: "Campaign name is required.",
    });
  }

  const loaded = loadAisensyConfig();
  if (!loaded.ok) {
    console.error("[aisensy] config_error", {
      campaign: campaignName,
      requestId,
      code: loaded.code,
      error: loaded.error,
    });
    return emptyCampaignResult(requestId, {
      configuration_required: true,
      queued: true,
      failed: false,
      errorCode: loaded.code,
      errorMessage: loaded.error,
      campaignName,
    });
  }

  const phone = normalizeAisensyDestination(options.destination);
  if (!phone.ok) {
    return emptyCampaignResult(requestId, {
      errorCode: "invalid_phone",
      errorMessage: phone.error,
      campaignName,
    });
  }

  const templateParams = (options.templateParams ?? []).map((value) => String(value ?? "").trim());
  if (templateParams.some((value) => !value)) {
    return emptyCampaignResult(requestId, {
      errorCode: "invalid_template_params",
      errorMessage: "Template parameters cannot be empty.",
      campaignName,
      destination: phone.destination,
    });
  }

  const useDedupe = options.dedupe !== false;
  if (useDedupe && !claimSendSlot(phone.destination, campaignName)) {
    console.warn("[aisensy] duplicate_send_blocked", {
      campaign: campaignName,
      phone: maskPhoneLocal(phone.local),
      requestId,
    });
    return emptyCampaignResult(requestId, {
      errorCode: "duplicate_send",
      errorMessage: "Duplicate send blocked.",
      campaignName,
      destination: phone.destination,
    });
  }

  console.info("[aisensy] send_start", {
    Campaign: campaignName,
    Phone: maskPhoneLocal(phone.local),
    "Request Id": requestId,
    Source: options.source ?? "digiconnect",
    HasMedia: Boolean(options.media?.url),
  });

  const payload: Record<string, unknown> = {
    apiKey: loaded.config.apiKey,
    campaignName,
    destination: phone.destination,
    userName: options.userName?.trim() || "Customer",
    templateParams,
    source: options.source ?? "digiconnect",
  };
  if (options.buttons?.length) payload.buttons = options.buttons;
  if (options.media?.url) {
    payload.media = {
      url: options.media.url,
      filename: options.media.filename || "document.pdf",
    };
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetchImpl(loaded.config.apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const rawText = await response.text();
    const body = parseResponseBody(rawText);
    const safeBody = redactSecrets(
      typeof body === "string" ? body : JSON.stringify(body ?? null),
      loaded.config.apiKey,
    );
    const success = isAisensySuccessResponse(response.status, body);

    console.info("[aisensy] send_result", {
      Campaign: campaignName,
      "HTTP Status": response.status,
      "Success/Failure": success ? "Success" : "Failure",
      "AiSensy Response": safeBody.slice(0, 500),
      "Request Id": requestId,
    });

    if (!success) {
      if (useDedupe) recentSendKeys.delete(sendDedupeKey(phone.destination, campaignName));
      console.error("[aisensy] provider_rejected_detail", {
        campaign: campaignName,
        requestId,
        httpStatus: response.status,
        response: safeBody.slice(0, 1000),
        phone: maskPhoneLocal(phone.local),
      });
      return emptyCampaignResult(requestId, {
        errorCode: "provider_rejected",
        errorMessage: `WhatsApp delivery failed (HTTP ${response.status}): ${safeBody.slice(0, 400)}`,
        campaignName,
        destination: phone.destination,
        httpStatus: response.status,
        providerMessageId: extractProviderMessageId(body),
      });
    }

    return {
      ok: true,
      queued: false,
      sent: true,
      failed: false,
      configuration_required: false,
      providerMessageId: extractProviderMessageId(body) ?? requestId,
      errorCode: null,
      errorMessage: null,
      campaignName,
      destination: phone.destination,
      requestId,
      httpStatus: response.status,
    };
  } catch (error) {
    if (useDedupe) recentSendKeys.delete(sendDedupeKey(phone.destination, campaignName));
    const aborted = error instanceof Error && error.name === "AbortError";
    const message = aborted
      ? "AiSensy request timed out."
      : error instanceof Error
        ? redactSecrets(error.message, loaded.config.apiKey)
        : "AiSensy request failed.";

    console.error("[aisensy] send_result", {
      Campaign: campaignName,
      "HTTP Status": aborted ? "timeout" : "network_error",
      "Success/Failure": "Failure",
      "AiSensy Response": message,
      "Request Id": requestId,
    });

    return emptyCampaignResult(requestId, {
      errorCode: aborted ? "timeout" : "network_error",
      errorMessage: message,
      campaignName,
      destination: phone.destination,
    });
  } finally {
    clearTimeout(timer);
  }
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
  const purpose = String(options.purpose ?? "").trim() || "password_reset";
  const campaignName = getCampaignName(purpose);

  if (!/^\d{6}$/.test(options.otp)) {
    return {
      ok: false,
      provider: "aisensy",
      error: AISENSY_USER_FACING_SEND_ERROR,
      code: "invalid_otp",
      campaignName,
    };
  }

  const result = await sendAisensyCampaign({
    campaignName,
    destination: options.phone,
    userName: options.userName,
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
    dedupe: true,
    fetchImpl: options.fetchImpl,
  });

  if (!result.ok) {
    const code = result.errorCode ?? "provider_rejected";
    console.error("[aisensy] otp_send_failed", {
      purpose,
      campaign: result.campaignName ?? campaignName,
      code,
      requestId: result.requestId,
      httpStatus: result.httpStatus,
      providerDetail: result.errorMessage,
      configurationRequired: result.configuration_required,
    });
    return {
      ok: false,
      provider: "aisensy",
      error:
        code === "invalid_phone"
          ? result.errorMessage || WHATSAPP_MOBILE_REQUIRED_ERROR
          : AISENSY_USER_FACING_SEND_ERROR,
      code,
      requestId: result.requestId,
      campaignName: result.campaignName ?? campaignName,
      httpStatus: result.httpStatus,
      providerDetail: result.errorMessage ?? undefined,
    };
  }

  console.info("[aisensy] otp_send_accepted", {
    purpose,
    campaign: result.campaignName || campaignName,
    requestId: result.requestId,
    providerMessageId: result.providerMessageId,
    httpStatus: result.httpStatus,
  });

  return {
    ok: true,
    provider: "aisensy",
    destination: result.destination || "",
    campaignName: result.campaignName || campaignName,
    requestId: result.requestId,
  };
}
