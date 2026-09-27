/**
 * The WhatsApp sender for the whole app — Meta WhatsApp Cloud API.
 *
 * Every outgoing message (login/signup OTP, application updates, invoices,
 * renewal reminders, the outbox processor) goes through `sendWhatsAppTemplate`,
 * `sendWhatsAppText` or `sendWhatsAppOtp` here. Server-side only: it reads
 * META_WHATSAPP_ACCESS_TOKEN, so no client component may import it.
 *
 * OTP generation and verification stay on our server (auth_otp_requests);
 * this only delivers.
 */

import "server-only";

import { randomUUID } from "crypto";

import {
  buildMetaTemplatePayload,
  buildMetaTextPayload,
  loadMetaConfig,
  postMetaMessage,
  type MetaMessagePayload,
} from "@/lib/whatsapp/meta-cloud";
import { resolveTemplate, resolveTemplateLanguage, type WhatsAppTemplateKey } from "@/lib/whatsapp/template-registry";
import type { SendWhatsAppResult, SendWhatsAppTemplateInput, WhatsAppOtpButton } from "@/lib/whatsapp/types";
import { WHATSAPP_MOBILE_REQUIRED_ERROR } from "@/lib/whatsapp/types";

const REQUEST_TIMEOUT_MS = 15_000;
const DUPLICATE_SEND_WINDOW_MS = 5_000;

/** Safe message returned to clients — never expose provider errors. */
export const WHATSAPP_USER_FACING_SEND_ERROR = "Unable to send OTP. Please try again in a few minutes.";

export type WhatsAppOtpPurpose =
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

/* ── Numbers, masking, redaction ───────────────────────────────────────── */

/** Indian mobile → Meta's `to` format: 91 + 10 digits, no "+". */
export function normalizeWhatsAppDestination(
  input: string,
): { ok: true; destination: string; local: string } | { ok: false; error: string } {
  let local = String(input ?? "").replace(/\D/g, "");
  if (local.startsWith("91") && local.length === 12) local = local.slice(2);
  if (local.length === 11 && local.startsWith("0")) local = local.slice(1);
  if (!/^[6-9]\d{9}$/.test(local)) return { ok: false, error: WHATSAPP_MOBILE_REQUIRED_ERROR };
  return { ok: true, destination: `91${local}`, local };
}

export function maskPhoneLocal(local: string): string {
  if (local.length !== 10) return "91XXXXXXXXXX";
  return `91${local.slice(0, 2)}******${local.slice(-2)}`;
}

/** Mask template/button values for logs. Never emit full OTP digits. */
export function maskTemplateParamForLog(value: string): string {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return "[empty]";
  if (/^\d{4,8}$/.test(trimmed)) return `[OTP_${trimmed.length}]`;
  if (trimmed.length <= 2) return "**";
  if (trimmed.length <= 6) return `${trimmed.slice(0, 1)}***`;
  return `${trimmed.slice(0, 2)}***${trimmed.slice(-1)}`;
}

const SECRET_ENVS = ["META_WHATSAPP_ACCESS_TOKEN", "META_APP_SECRET", "META_WHATSAPP_WEBHOOK_VERIFY_TOKEN"] as const;

/** Strip every Meta secret (and stray OTP digits) from a string before it is logged or stored. */
export function redactSecrets(value: string, env: NodeJS.ProcessEnv = process.env): string {
  let out = String(value ?? "");
  for (const name of SECRET_ENVS) {
    const secret = env[name]?.trim();
    if (secret && secret.length >= 8) out = out.split(secret).join(`[REDACTED_${name}]`);
  }
  out = out.replace(/(Bearer\s+)[A-Za-z0-9._\-]{12,}/g, "$1[REDACTED]");
  out = out.replace(/(access_token=)[^\s&"]+/gi, "$1[REDACTED]");
  out = out.replace(/\bEAA[A-Za-z0-9]{20,}/g, "[REDACTED_TOKEN]");
  out = out.replace(/("text"\s*:\s*")\d{4,8}(")/gi, "$1[REDACTED_OTP]$2");
  return out;
}

/* ── Config ────────────────────────────────────────────────────────────── */

export function isWhatsAppConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return loadMetaConfig(env).ok;
}

/* ── In-memory double-send guard (a double click, a retried request) ───── */

const recentSendKeys = new Map<string, number>();

function claimSendSlot(key: string): boolean {
  const now = Date.now();
  for (const [k, ts] of recentSendKeys) {
    if (now - ts > DUPLICATE_SEND_WINDOW_MS) recentSendKeys.delete(k);
  }
  const previous = recentSendKeys.get(key);
  if (previous && now - previous < DUPLICATE_SEND_WINDOW_MS) return false;
  recentSendKeys.set(key, now);
  return true;
}

/** Test helper — clears the in-memory dedupe map. */
export function __resetWhatsAppSendDedupeForTests() {
  recentSendKeys.clear();
}

function failed(
  requestId: string,
  partial: Partial<SendWhatsAppResult> & { errorCode: string; errorMessage: string },
): SendWhatsAppResult {
  return {
    ok: false,
    queued: Boolean(partial.queued),
    sent: false,
    failed: !partial.queued && !partial.configuration_required,
    configuration_required: Boolean(partial.configuration_required),
    providerMessageId: partial.providerMessageId ?? null,
    errorCode: partial.errorCode,
    errorMessage: partial.errorMessage,
    templateName: partial.templateName ?? null,
    destination: partial.destination ?? null,
    requestId,
    httpStatus: partial.httpStatus ?? null,
  };
}

/* ── Sending ───────────────────────────────────────────────────────────── */

async function deliver(input: {
  requestId: string;
  kind: "template" | "text";
  templateName: string | null;
  destination: string;
  dedupeKey: string | null;
  source: string;
  logDetail: Record<string, unknown>;
  build: (to: string) => MetaMessagePayload;
  fetchImpl?: typeof fetch;
}): Promise<SendWhatsAppResult> {
  const { requestId, templateName } = input;

  const loaded = loadMetaConfig();
  if (!loaded.ok) {
    console.error("[whatsapp] config_error", { kind: input.kind, template: templateName, requestId, code: loaded.code });
    return failed(requestId, {
      configuration_required: true,
      queued: true,
      errorCode: loaded.code,
      errorMessage: loaded.error,
      templateName,
    });
  }

  const phone = normalizeWhatsAppDestination(input.destination);
  if (!phone.ok) {
    return failed(requestId, { errorCode: "invalid_phone", errorMessage: phone.error, templateName });
  }
  const to = phone.destination;

  const slot = input.dedupeKey ? `${to}:${input.dedupeKey}` : null;
  if (slot && !claimSendSlot(slot)) {
    console.warn("[whatsapp] duplicate_send_blocked", { template: templateName, phone: maskPhoneLocal(phone.local), requestId });
    return failed(requestId, {
      errorCode: "duplicate_send",
      errorMessage: "Duplicate send blocked.",
      templateName,
      destination: to,
    });
  }

  console.info("[whatsapp] send_start", {
    kind: input.kind,
    template: templateName,
    phone: maskPhoneLocal(phone.local),
    requestId,
    source: input.source,
    ...input.logDetail,
  });

  const outcome = await postMetaMessage(loaded.config, input.build(to), {
    fetchImpl: input.fetchImpl,
    timeoutMs: REQUEST_TIMEOUT_MS,
  });

  if (!outcome.ok) {
    if (slot) recentSendKeys.delete(slot);
    const detail = redactSecrets(outcome.message);
    console.error("[whatsapp] send_failed", {
      kind: input.kind,
      template: templateName,
      requestId,
      httpStatus: outcome.httpStatus,
      code: outcome.code,
      metaCode: outcome.metaCode,
      detail,
      phone: maskPhoneLocal(phone.local),
    });
    return failed(requestId, {
      errorCode: outcome.code,
      errorMessage: `WhatsApp delivery failed: ${detail}`,
      templateName,
      destination: to,
      // Rate limits come back as HTTP 400 with a Meta code; report 429 so the outbox retries later.
      httpStatus: outcome.code === "meta_rate_limited" ? 429 : outcome.httpStatus,
    });
  }

  console.info("[whatsapp] send_accepted", {
    kind: input.kind,
    template: templateName,
    requestId,
    messageId: outcome.messageId,
    phone: maskPhoneLocal(phone.local),
    note: "API accept ≠ delivered. Delivery arrives on /api/webhooks/meta-whatsapp.",
  });

  return {
    ok: true,
    queued: false,
    sent: true,
    failed: false,
    configuration_required: false,
    providerMessageId: outcome.messageId,
    errorCode: null,
    errorMessage: null,
    templateName,
    destination: to,
    requestId,
    httpStatus: outcome.httpStatus,
  };
}

/**
 * Send an approved template. The name must come from the template registry
 * (server-side), never from a browser. Params fill {{1}}, {{2}}, … in order.
 */
export async function sendWhatsAppTemplate(options: SendWhatsAppTemplateInput): Promise<SendWhatsAppResult> {
  const requestId = randomUUID();
  const templateName = String(options.templateName ?? "").trim();
  if (!templateName) {
    return failed(requestId, { errorCode: "missing_template", errorMessage: "Template name is required." });
  }

  const templateParams = (options.templateParams ?? []).map((value) => String(value ?? "").trim());
  if (templateParams.some((value) => !value)) {
    return failed(requestId, {
      errorCode: "invalid_template_params",
      errorMessage: "Template parameters cannot be empty.",
      templateName,
    });
  }

  const language = options.language?.trim() || resolveTemplateLanguage(templateName);
  return deliver({
    requestId,
    kind: "template",
    templateName,
    destination: options.destination,
    dedupeKey: options.dedupe === false ? null : `template:${templateName}`,
    source: options.source ?? "digiconnect",
    logDetail: {
      language,
      hasMedia: Boolean(options.media?.url),
      templateParamCount: templateParams.length,
      templateParamsMasked: templateParams.map(maskTemplateParamForLog),
      buttonCount: options.buttons?.length ?? 0,
    },
    build: (to) =>
      buildMetaTemplatePayload({
        to,
        templateName,
        language,
        bodyParams: templateParams,
        buttons: options.buttons,
        media: options.media,
      }),
    fetchImpl: options.fetchImpl,
  });
}

/**
 * Free-form text. Only delivered inside the 24-hour window after the
 * customer's last message to us; otherwise the result is
 * `outside_service_window` and a template must be sent instead.
 */
export async function sendWhatsAppText(options: {
  destination: string;
  body: string;
  source?: string;
  dedupe?: boolean;
  fetchImpl?: typeof fetch;
}): Promise<SendWhatsAppResult> {
  const requestId = randomUUID();
  const body = String(options.body ?? "").trim();
  if (!body) return failed(requestId, { errorCode: "empty_text", errorMessage: "Message text is required." });

  return deliver({
    requestId,
    kind: "text",
    templateName: null,
    destination: options.destination,
    dedupeKey: options.dedupe === false ? null : `text:${body.slice(0, 64)}`,
    source: options.source ?? "digiconnect",
    logDetail: { textLength: body.length },
    build: (to) => buildMetaTextPayload({ to, body }),
    fetchImpl: options.fetchImpl,
  });
}

/* ── OTP ───────────────────────────────────────────────────────────────── */

export type OtpTemplateResolution =
  | { ok: true; key: WhatsAppTemplateKey; templateName: string; language: string; source: string }
  | { ok: false; code: "OTP_PROVIDER_CONFIG_MISSING"; error: string; source: null };

/** Which Authentication template an OTP purpose uses. Signup never falls back to login/reset. */
export function resolveOtpTemplate(purpose: string, env: NodeJS.ProcessEnv = process.env): OtpTemplateResolution {
  const normalized = String(purpose ?? "").trim().toLowerCase();
  let key: WhatsAppTemplateKey;
  switch (normalized) {
    case "customer_signup":
    case "signup":
      key = "signup_otp";
      break;
    case "login":
    case "login_otp":
      key = "login_otp";
      break;
    case "forgot_pin":
    case "forgot_password":
    case "create_pin":
    case "legacy_pin_activation":
    case "password_reset":
    case "change_phone":
    case "security_verification":
      key = "password_reset";
      break;
    default:
      return {
        ok: false,
        code: "OTP_PROVIDER_CONFIG_MISSING",
        error: `Unsupported OTP purpose "${normalized}".`,
        source: null,
      };
  }
  const resolved = resolveTemplate(key, env);
  return { ok: true, key, templateName: resolved.name, language: resolved.language, source: resolved.nameSource };
}

export type OtpPayloadContract = { templateParamCount: 1; buttonMode: "url" };

/** Meta Authentication template: the code fills {{1}} and button 0 (copy code / one-tap). */
export function describeOtpPayloadContract(): OtpPayloadContract {
  return { templateParamCount: 1, buttonMode: "url" };
}

export function buildOtpPayloadParts(otp: string): { templateParams: string[]; buttons: WhatsAppOtpButton[] } {
  return {
    templateParams: [otp],
    buttons: [{ type: "button", sub_type: "url", index: 0, parameters: [{ type: "text", text: otp }] }],
  };
}

export type WhatsAppOtpSendResult =
  | {
      ok: true;
      provider: "meta";
      destination: string;
      templateName: string;
      requestId: string;
      /** Meta wamid for delivery tracking. */
      providerMessageId: string | null;
    }
  | {
      ok: false;
      provider: "meta";
      /** Safe user-facing message (never includes provider internals). */
      error: string;
      code?: string;
      requestId?: string;
      templateName?: string;
      httpStatus?: number | null;
      providerMessageId?: string | null;
      /** Redacted provider detail for server logs only. */
      providerDetail?: string;
    };

/**
 * Deliver an OTP with the Authentication template for `purpose`.
 * Does not verify — our DB is the source of truth. Never logs the code.
 */
export async function sendWhatsAppOtp(options: {
  phone: string;
  otp: string;
  purpose: WhatsAppOtpPurpose | string;
  source?: string;
  fetchImpl?: typeof fetch;
}): Promise<WhatsAppOtpSendResult> {
  const purpose = String(options.purpose ?? "").trim() || "password_reset";
  const template = resolveOtpTemplate(purpose);
  if (!template.ok) {
    console.error("[whatsapp] otp_template_missing", { purpose, code: template.code });
    return {
      ok: false,
      provider: "meta",
      error: WHATSAPP_USER_FACING_SEND_ERROR,
      code: template.code,
      providerDetail: template.error,
    };
  }

  if (!/^\d{6}$/.test(options.otp)) {
    return {
      ok: false,
      provider: "meta",
      error: WHATSAPP_USER_FACING_SEND_ERROR,
      code: "invalid_otp",
      templateName: template.templateName,
      providerDetail: "OTP must be exactly 6 digits before provider send.",
    };
  }

  const { templateParams, buttons } = buildOtpPayloadParts(options.otp);
  const result = await sendWhatsAppTemplate({
    templateName: template.templateName,
    language: template.language,
    destination: options.phone,
    templateParams,
    buttons,
    source: options.source ?? `digiconnect-auth:${purpose}`,
    dedupe: true,
    fetchImpl: options.fetchImpl,
  });

  if (!result.ok) {
    const code = result.errorCode ?? "provider_rejected";
    return {
      ok: false,
      provider: "meta",
      error: code === "invalid_phone" ? result.errorMessage || WHATSAPP_MOBILE_REQUIRED_ERROR : WHATSAPP_USER_FACING_SEND_ERROR,
      code,
      requestId: result.requestId,
      templateName: template.templateName,
      httpStatus: result.httpStatus,
      providerMessageId: result.providerMessageId ?? null,
      providerDetail: result.errorMessage ?? undefined,
    };
  }

  return {
    ok: true,
    provider: "meta",
    destination: result.destination || "",
    templateName: template.templateName,
    requestId: result.requestId,
    providerMessageId: result.providerMessageId,
  };
}
