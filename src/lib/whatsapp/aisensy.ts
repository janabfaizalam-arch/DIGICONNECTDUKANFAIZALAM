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
  | {
      ok: true;
      provider: "aisensy";
      destination: string;
      campaignName: string;
      requestId: string;
      /** AiSensy `submitted_message_id` when returned (delivery tracking). */
      providerMessageId: string | null;
    }
  | {
      ok: false;
      provider: "aisensy";
      /** Safe user-facing message (never includes provider internals). */
      error: string;
      code?: string;
      requestId?: string;
      campaignName?: string;
      httpStatus?: number | null;
      providerMessageId?: string | null;
      /** Redacted provider response / error detail for server logs only. */
      providerDetail?: string;
    };

/** How OTP Authentication templateParams / buttons are assembled. */
export type AisensyOtpPayloadContract = {
  templateParamCount: number;
  includesExpiryParam: boolean;
  expiryMinutes: number | null;
  buttonMode: "url" | "copy_code" | "none";
  destinationFormat: "digits" | "e164";
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

export type OtpCampaignResolution =
  | { ok: true; campaignName: string; source: string }
  | { ok: false; code: "OTP_PROVIDER_CONFIG_MISSING" | "OTP_FORBIDDEN_CAMPAIGN"; error: string; source: string | null };

function firstEnv(...keys: string[]): { value: string; source: string } | null {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return { value, source: key };
  }
  return null;
}

/**
 * Resolve the Live AiSensy campaign for an OTP purpose with an explicit env source.
 * Signup never falls back to login/reset campaigns.
 */
export function resolveOtpCampaign(purpose: string): OtpCampaignResolution {
  const normalized = String(purpose ?? "")
    .trim()
    .toLowerCase();

  let resolved: { value: string; source: string } | null = null;
  let intentionalDefault: string | null = null;

  switch (normalized) {
    case "customer_signup":
    case "signup":
      resolved = firstEnv(
        "AISENSY_SIGNUP_CAMPAIGN",
        "AISENSY_CAMPAIGN_NAME_SIGNUP",
        "AISENSY_OTP_CAMPAIGN_NAME",
      );
      intentionalDefault = DEFAULT_SIGNUP_CAMPAIGN;
      break;

    case "forgot_pin":
    case "forgot_password":
    case "create_pin":
    case "legacy_pin_activation":
    case "password_reset":
    case "change_phone":
    case "security_verification":
      resolved = firstEnv(
        "AISENSY_PASSWORD_RESET_CAMPAIGN",
        "AISENSY_RESET_CAMPAIGN",
        "AISENSY_CAMPAIGN_NAME_RESET",
        "AISENSY_OTP_CAMPAIGN_NAME",
      );
      intentionalDefault = DEFAULT_PASSWORD_RESET_CAMPAIGN;
      break;

    case "login":
    case "login_otp":
      resolved = firstEnv(
        "AISENSY_LOGIN_CAMPAIGN",
        "AISENSY_CAMPAIGN_NAME_LOGIN",
        "AISENSY_OTP_CAMPAIGN_NAME",
      );
      intentionalDefault = DEFAULT_LOGIN_CAMPAIGN;
      break;

    default:
      return {
        ok: false,
        code: "OTP_PROVIDER_CONFIG_MISSING",
        error: `Unsupported OTP purpose "${normalized}".`,
        source: null,
      };
  }

  const campaignName = resolved?.value || intentionalDefault || "";
  const source = resolved?.source || (intentionalDefault ? `default:${intentionalDefault}` : null);

  if (!campaignName) {
    return {
      ok: false,
      code: "OTP_PROVIDER_CONFIG_MISSING",
      error: "OTP_PROVIDER_CONFIG_MISSING: no signup/login/reset campaign configured.",
      source: null,
    };
  }

  if (campaignName === FORBIDDEN_AUTH_CAMPAIGN) {
    return {
      ok: false,
      code: "OTP_FORBIDDEN_CAMPAIGN",
      error: `Forbidden campaign "${FORBIDDEN_AUTH_CAMPAIGN}" cannot be used for authentication OTP.`,
      source,
    };
  }

  return { ok: true, campaignName, source: source || "unknown" };
}

/**
 * Select the existing AiSensy LIVE campaign for an OTP purpose.
 * Prefer resolveOtpCampaign() when failure must be explicit.
 */
export function getCampaignName(purpose: string): string {
  const resolved = resolveOtpCampaign(purpose);
  if (!resolved.ok) {
    console.error("[aisensy] campaign_resolve_failed", {
      purpose,
      code: resolved.code,
      error: resolved.error,
    });
    // Backward-compatible string API for callers that still expect a name —
    // OTP send path must check resolveOtpCampaign() and fail hard.
    if (purpose === "customer_signup" || purpose === "signup") return DEFAULT_SIGNUP_CAMPAIGN;
    if (purpose === "login" || purpose === "login_otp") return DEFAULT_LOGIN_CAMPAIGN;
    return DEFAULT_PASSWORD_RESET_CAMPAIGN;
  }
  return resolved.campaignName;
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

function getDestinationFormat(): "digits" | "e164" {
  const raw = (process.env.AISENSY_DESTINATION_FORMAT ?? "digits").trim().toLowerCase();
  return raw === "e164" || raw === "+e164" || raw === "plus" ? "e164" : "digits";
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

  const destination =
    getDestinationFormat() === "e164" ? `+91${local}` : `91${local}`;
  return { ok: true, destination, local };
}

function maskPhoneLocal(local: string): string {
  if (local.length !== 10) return "91XXXXXXXXXX";
  return `91${local.slice(0, 2)}******${local.slice(-2)}`;
}

/**
 * Mask template/button values for logs. Never emit full OTP digits in production logs.
 */
export function maskTemplateParamForLog(value: string): string {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return "[empty]";
  if (/^\d{4,8}$/.test(trimmed)) {
    return `[OTP_${trimmed.length}]`;
  }
  if (trimmed.length <= 2) return "**";
  if (trimmed.length <= 6) return `${trimmed.slice(0, 1)}***`;
  return `${trimmed.slice(0, 2)}***${trimmed.slice(-1)}`;
}

export function describeOtpPayloadContract(): AisensyOtpPayloadContract {
  const includeExpiry =
    (process.env.AISENSY_OTP_INCLUDE_EXPIRY_PARAM ?? "").trim().toLowerCase() === "true" ||
    (process.env.AISENSY_OTP_INCLUDE_EXPIRY_PARAM ?? "").trim() === "1";
  const expiryRaw = Number.parseInt(process.env.AISENSY_OTP_EXPIRY_MINUTES ?? "5", 10);
  const expiryMinutes = Number.isFinite(expiryRaw) && expiryRaw > 0 ? expiryRaw : 5;
  const buttonRaw = (process.env.AISENSY_OTP_BUTTON_MODE ?? "url").trim().toLowerCase();
  const buttonMode: AisensyOtpPayloadContract["buttonMode"] =
    buttonRaw === "none" || buttonRaw === "off"
      ? "none"
      : buttonRaw === "copy_code"
        ? "copy_code"
        : "url";

  return {
    templateParamCount: includeExpiry ? 2 : 1,
    includesExpiryParam: includeExpiry,
    expiryMinutes: includeExpiry ? expiryMinutes : null,
    buttonMode,
    destinationFormat: getDestinationFormat(),
  };
}

/**
 * Build OTP campaign templateParams + buttons to match the approved Auth template.
 *
 * Default (AiSensy Authentication / Copy-Code docs + Test Campaign):
 * - templateParams: [OTP]  → fills {{1}}
 * - buttons: url/index 0 with the same OTP text (Copy Code interactive action)
 *
 * Enable AISENSY_OTP_INCLUDE_EXPIRY_PARAM=true only when the Live campaign's
 * Test Campaign cURL shows a second template param (e.g. expiry minutes).
 * OTP expiry text baked into the Meta template itself is NOT a templateParam.
 */
export function buildAisensyOtpPayloadParts(otp: string): {
  templateParams: string[];
  buttons: SendAisensyCampaignInput["buttons"];
  contract: AisensyOtpPayloadContract;
} {
  const contract = describeOtpPayloadContract();
  const templateParams = contract.includesExpiryParam
    ? [otp, String(contract.expiryMinutes)]
    : [otp];

  let buttons: SendAisensyCampaignInput["buttons"];
  if (contract.buttonMode === "none") {
    buttons = undefined;
  } else {
    buttons = [
      {
        type: "button",
        sub_type: contract.buttonMode === "copy_code" ? "copy_code" : "url",
        index: 0,
        parameters: [{ type: "text", text: otp }],
      },
    ];
  }

  return { templateParams, buttons, contract };
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
  // AiSensy sometimes returns success as the string "true".
  if (String(record.success).toLowerCase() === "true" || String(record.ok).toLowerCase() === "true") {
    return true;
  }

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

  const buttonSummaries = (options.buttons ?? []).map((button) => ({
    sub_type: button.sub_type,
    index: button.index,
    parameterCount: button.parameters?.length ?? 0,
    parametersMasked: (button.parameters ?? []).map((parameter) =>
      maskTemplateParamForLog(parameter.text),
    ),
  }));

  console.info("[aisensy] send_start", {
    Campaign: campaignName,
    Phone: maskPhoneLocal(phone.local),
    Destination: phone.destination.startsWith("+")
      ? `+91${phone.local.slice(0, 2)}******${phone.local.slice(-2)}`
      : maskPhoneLocal(phone.local),
    DestinationFormat: phone.destination.startsWith("+") ? "e164" : "digits",
    "Request Id": requestId,
    Source: options.source ?? "digiconnect",
    HasMedia: Boolean(options.media?.url),
    TemplateParamCount: templateParams.length,
    TemplateParamsMasked: templateParams.map(maskTemplateParamForLog),
    ButtonCount: buttonSummaries.length,
    ButtonsMasked: buttonSummaries,
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

    const submittedMessageId = extractProviderMessageId(body);

    console.info("[aisensy] send_result", {
      Campaign: campaignName,
      "HTTP Status": response.status,
      "Success/Failure": success ? "Success" : "Failure",
      "AiSensy Response": safeBody.slice(0, 500),
      "Request Id": requestId,
      submitted_message_id: submittedMessageId,
      TemplateParamCount: templateParams.length,
      TemplateParamsMasked: templateParams.map(maskTemplateParamForLog),
      Destination: maskPhoneLocal(phone.local),
      Note: success
        ? "API accept ≠ WhatsApp Delivered. Confirm Sent tab / webhook / inbox."
        : undefined,
    });

    if (!success) {
      if (useDedupe) recentSendKeys.delete(sendDedupeKey(phone.destination, campaignName));
      console.error("[aisensy] provider_rejected_detail", {
        campaign: campaignName,
        requestId,
        httpStatus: response.status,
        response: safeBody.slice(0, 1000),
        phone: maskPhoneLocal(phone.local),
        submitted_message_id: submittedMessageId,
      });
      return emptyCampaignResult(requestId, {
        errorCode: "provider_rejected",
        errorMessage: `WhatsApp delivery failed (HTTP ${response.status}): ${safeBody.slice(0, 400)}`,
        campaignName,
        destination: phone.destination,
        httpStatus: response.status,
        providerMessageId: submittedMessageId,
      });
    }

    return {
      ok: true,
      queued: false,
      sent: true,
      failed: false,
      configuration_required: false,
      // Prefer real AiSensy id; do not invent one from our request UUID.
      providerMessageId: submittedMessageId,
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
  const campaign = resolveOtpCampaign(purpose);

  if (!campaign.ok) {
    console.error("[aisensy] otp_campaign_missing", {
      purpose,
      code: campaign.code,
      error: campaign.error,
    });
    return {
      ok: false,
      provider: "aisensy",
      error: AISENSY_USER_FACING_SEND_ERROR,
      code: campaign.code,
      campaignName: undefined,
      providerDetail: campaign.error,
    };
  }

  const campaignName = campaign.campaignName;

  if (!/^\d{6}$/.test(options.otp)) {
    return {
      ok: false,
      provider: "aisensy",
      error: AISENSY_USER_FACING_SEND_ERROR,
      code: "invalid_otp",
      campaignName,
      providerDetail: "OTP must be exactly 6 digits before provider send.",
    };
  }

  const { templateParams, buttons, contract } = buildAisensyOtpPayloadParts(options.otp);

  console.info("[aisensy] otp_campaign_resolved", {
    purpose,
    campaign: campaignName,
    source: campaign.source,
    templateParamCount: contract.templateParamCount,
    includesExpiryParam: contract.includesExpiryParam,
    buttonMode: contract.buttonMode,
    destinationFormat: contract.destinationFormat,
    templateParamsMasked: templateParams.map(maskTemplateParamForLog),
  });

  const result = await sendAisensyCampaign({
    campaignName,
    destination: options.phone,
    userName: options.userName,
    templateParams,
    source: options.source ?? `digiconnect-auth:${purpose}`,
    buttons,
    dedupe: true,
    fetchImpl: options.fetchImpl,
  });

  if (!result.ok) {
    const code = result.errorCode ?? "provider_rejected";
    console.error("[aisensy] otp_send_failed", {
      purpose,
      campaign: result.campaignName ?? campaignName,
      campaignSource: campaign.source,
      code,
      requestId: result.requestId,
      submitted_message_id: result.providerMessageId,
      httpStatus: result.httpStatus,
      providerDetail: result.errorMessage,
      configurationRequired: result.configuration_required,
      templateParamCount: contract.templateParamCount,
      buttonMode: contract.buttonMode,
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
      providerMessageId: result.providerMessageId ?? null,
      providerDetail: result.errorMessage ?? undefined,
    };
  }

  console.info("[aisensy] otp_send_accepted", {
    purpose,
    campaign: result.campaignName || campaignName,
    campaignSource: campaign.source,
    requestId: result.requestId,
    submitted_message_id: result.providerMessageId,
    destination: (() => {
      const normalized = normalizeAisensyDestination(options.phone);
      return normalized.ok ? maskPhoneLocal(normalized.local) : null;
    })(),
    httpStatus: result.httpStatus,
    templateParamCount: contract.templateParamCount,
    templateParamsMasked: templateParams.map(maskTemplateParamForLog),
    buttonMode: contract.buttonMode,
    deliveryNote:
      "API success=true is submit-accepted only. Confirm Delivered in AiSensy Sent tab / webhook.",
  });

  return {
    ok: true,
    provider: "aisensy",
    destination: result.destination || "",
    campaignName: result.campaignName || campaignName,
    requestId: result.requestId,
    providerMessageId: result.providerMessageId,
  };
}

export type AisensyMessageStatusLookup = {
  ok: boolean;
  submittedMessageId: string;
  source: "status_api" | "unavailable";
  httpStatus: number | null;
  /** Provider delivery status when a status API is configured and responds. */
  deliveryStatus: string | null;
  /** Redacted provider body snippet for admins/logs — never includes OTP. */
  providerBodyPreview: string | null;
  guidance: string;
};

/**
 * Optional delivery-status lookup.
 * AiSensy does not document a public GET-by-submitted_message_id API.
 * Set AISENSY_MESSAGE_STATUS_URL with `{id}` placeholder when AiSensy/support provides one.
 */
export async function lookupAisensyMessageStatus(
  submittedMessageId: string,
  options?: { fetchImpl?: typeof fetch },
): Promise<AisensyMessageStatusLookup> {
  const id = String(submittedMessageId ?? "").trim();
  const guidanceUnavailable =
    "No public AiSensy delivery-status API is documented. Check Campaign → Sent for this submitted_message_id, Meta message errors, opt-out/blocklist, and WABA connection. Configure AISENSY_MESSAGE_STATUS_URL or AISENSY_WEBHOOK_SECRET delivery webhook when available.";

  if (!id) {
    return {
      ok: false,
      submittedMessageId: "",
      source: "unavailable",
      httpStatus: null,
      deliveryStatus: null,
      providerBodyPreview: null,
      guidance: "submittedMessageId is required.",
    };
  }

  const statusUrlTemplate = process.env.AISENSY_MESSAGE_STATUS_URL?.trim();
  if (!statusUrlTemplate) {
    return {
      ok: false,
      submittedMessageId: id,
      source: "unavailable",
      httpStatus: null,
      deliveryStatus: null,
      providerBodyPreview: null,
      guidance: guidanceUnavailable,
    };
  }

  const loaded = loadAisensyConfig();
  if (!loaded.ok) {
    return {
      ok: false,
      submittedMessageId: id,
      source: "unavailable",
      httpStatus: null,
      deliveryStatus: null,
      providerBodyPreview: null,
      guidance: loaded.error,
    };
  }

  const url = statusUrlTemplate.includes("{id}")
    ? statusUrlTemplate.replaceAll("{id}", encodeURIComponent(id))
    : `${statusUrlTemplate.replace(/\/$/, "")}/${encodeURIComponent(id)}`;

  const fetchImpl = options?.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetchImpl(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${loaded.config.apiKey}`,
        "x-api-key": loaded.config.apiKey,
      },
      signal: controller.signal,
    });
    const rawText = await response.text();
    const safeBody = redactSecrets(rawText, loaded.config.apiKey).slice(0, 800);
    const body = parseResponseBody(rawText);
    let deliveryStatus: string | null = null;
    if (body && typeof body === "object") {
      const record = body as Record<string, unknown>;
      const candidate =
        record.delivery_status ??
        record.deliveryStatus ??
        record.status ??
        record.Status ??
        record.message_status ??
        record.messageStatus;
      if (candidate != null) deliveryStatus = String(candidate);
    }

    console.info("[aisensy] message_status_lookup", {
      submitted_message_id: id,
      httpStatus: response.status,
      deliveryStatus,
      bodyPreview: safeBody.slice(0, 300),
    });

    return {
      ok: response.ok,
      submittedMessageId: id,
      source: "status_api",
      httpStatus: response.status,
      deliveryStatus,
      providerBodyPreview: safeBody,
      guidance: response.ok
        ? "Status API responded. Treat Delivered/read as confirmation; API accept alone is not enough."
        : "Status API returned a non-OK response. Verify AISENSY_MESSAGE_STATUS_URL with AiSensy support.",
    };
  } catch (error) {
    const message =
      error instanceof Error ? redactSecrets(error.message, loaded.config.apiKey) : "status lookup failed";
    return {
      ok: false,
      submittedMessageId: id,
      source: "status_api",
      httpStatus: null,
      deliveryStatus: null,
      providerBodyPreview: message.slice(0, 400),
      guidance: "Status API request failed. Fall back to AiSensy Sent tab.",
    };
  } finally {
    clearTimeout(timer);
  }
}
