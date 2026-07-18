/**
 * AiSensy WhatsApp Campaign API — delivery only.
 * OTP generation/verification stays on our server (auth_otp_requests).
 */

const DEFAULT_AISENSY_API_URL = "https://backend.aisensy.com/campaign/t1/api/v2";
const REQUEST_TIMEOUT_MS = 15_000;
const DUPLICATE_SEND_WINDOW_MS = 5_000;

export type AisensySendResult =
  | { ok: true; provider: "aisensy"; destination: string; campaignName: string }
  | { ok: false; provider: "aisensy"; error: string; code?: string };

type AisensyConfig = {
  apiKey: string;
  campaignName: string;
  apiUrl: string;
};

/** Recent in-flight / completed sends to reduce accidental duplicate delivery. */
const recentSendKeys = new Map<string, number>();

export function getWhatsappProvider(): string {
  return (process.env.WHATSAPP_PROVIDER ?? "aisensy").trim().toLowerCase();
}

export function redactSecrets(value: string, apiKey?: string): string {
  let out = value;
  const key = apiKey?.trim();
  if (key && key.length >= 8) {
    out = out.split(key).join("[REDACTED_API_KEY]");
  }
  // Common env leak patterns
  out = out.replace(/("apiKey"\s*:\s*")[^"]+(")/gi, "$1[REDACTED_API_KEY]$2");
  out = out.replace(/(apiKey=)[^\s&]+/gi, "$1[REDACTED_API_KEY]");
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
  const campaignName = process.env.AISENSY_OTP_CAMPAIGN_NAME?.trim();
  const apiUrl = (process.env.AISENSY_API_URL?.trim() || DEFAULT_AISENSY_API_URL).replace(/\/$/, "");

  if (!apiKey) {
    return { ok: false, error: "AISENSY_API_KEY is not configured.", code: "missing_api_key" };
  }
  if (!campaignName) {
    return {
      ok: false,
      error: "AISENSY_OTP_CAMPAIGN_NAME is not configured.",
      code: "missing_campaign",
    };
  }

  return { ok: true, config: { apiKey, campaignName, apiUrl } };
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
    // Plain success tokens / message ids
    if (lower === "success" || lower === "ok" || lower === "true") return true;
    try {
      return isAisensySuccessResponse(status, JSON.parse(trimmed));
    } catch {
      // Non-JSON non-error body with content — treat as success only if looks like an id
      return /^[a-z0-9_-]{8,}$/i.test(trimmed);
    }
  }

  if (typeof body !== "object") return false;

  const record = body as Record<string, unknown>;
  if (record.success === false || record.ok === false) return false;

  const errorField = record.error ?? record.Error ?? record.message_error ?? record.err;
  // Any explicit error field means failure (even on HTTP 200)
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

  // Reject empty objects / unknown shapes even on HTTP 200
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
  userName?: string;
  source?: string;
  /** Injected for tests */
  fetchImpl?: typeof fetch;
  now?: () => number;
};

/**
 * Deliver OTP via AiSensy Authentication-category campaign.
 * Does not verify OTP — our DB is source of truth.
 */
export async function sendAisensyOtp(options: SendAisensyOtpOptions): Promise<AisensySendResult> {
  const loaded = loadAisensyConfig();
  if (!loaded.ok) {
    console.error("[aisensy] config_error", { code: loaded.code, error: loaded.error });
    return { ok: false, provider: "aisensy", error: loaded.error, code: loaded.code };
  }

  const { config } = loaded;
  const phone = normalizeAisensyDestination(options.phone);
  if (!phone.ok) {
    console.error("[aisensy] invalid_phone");
    return { ok: false, provider: "aisensy", error: phone.error, code: "invalid_phone" };
  }

  if (!/^\d{6}$/.test(options.otp)) {
    return { ok: false, provider: "aisensy", error: "OTP must be 6 digits.", code: "invalid_otp" };
  }

  if (!claimSendSlot(phone.destination, config.campaignName)) {
    console.warn("[aisensy] duplicate_send_blocked", { destination: phone.destination.slice(0, 4) + "******" });
    return {
      ok: false,
      provider: "aisensy",
      error: "Duplicate OTP send blocked. Please wait a few seconds.",
      code: "duplicate_send",
    };
  }

  const payload = {
    apiKey: config.apiKey,
    campaignName: config.campaignName,
    destination: phone.destination,
    userName: options.userName?.trim() || "Customer",
    templateParams: [options.otp],
    source: options.source ?? "digiconnect-auth",
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
    console.info("[aisensy] send_start", {
      url: config.apiUrl,
      campaignName: config.campaignName,
      destination: `91${phone.local.slice(0, 2)}******${phone.local.slice(-2)}`,
    });

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

    if (!isAisensySuccessResponse(response.status, body)) {
      console.error("[aisensy] send_failed", {
        httpStatus: response.status,
        body: safeBody.slice(0, 500),
      });
      // Allow retry after failure
      recentSendKeys.delete(sendDedupeKey(phone.destination, config.campaignName));
      return {
        ok: false,
        provider: "aisensy",
        error: "AiSensy OTP delivery failed.",
        code: "provider_rejected",
      };
    }

    console.info("[aisensy] send_ok", {
      httpStatus: response.status,
      campaignName: config.campaignName,
    });

    return {
      ok: true,
      provider: "aisensy",
      destination: phone.destination,
      campaignName: config.campaignName,
    };
  } catch (error) {
    recentSendKeys.delete(sendDedupeKey(phone.destination, config.campaignName));
    const aborted = error instanceof Error && error.name === "AbortError";
    const message = aborted
      ? "AiSensy request timed out."
      : error instanceof Error
        ? redactSecrets(error.message, config.apiKey)
        : "AiSensy request failed.";

    console.error("[aisensy] send_exception", {
      code: aborted ? "timeout" : "network_error",
      error: message,
    });

    return {
      ok: false,
      provider: "aisensy",
      error: message,
      code: aborted ? "timeout" : "network_error",
    };
  } finally {
    clearTimeout(timer);
  }
}
