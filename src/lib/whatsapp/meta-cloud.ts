/**
 * Meta WhatsApp Cloud API — the Graph API layer, and the only file that
 * talks to graph.facebook.com.
 *
 *   POST {base}/{version}/{META_WHATSAPP_PHONE_NUMBER_ID}/messages
 *   GET  {base}/{version}/{META_WHATSAPP_WABA_ID}/message_templates
 *
 * Server-only by use (the access token is read from the environment); pure
 * except for `postMetaMessage` and `fetchMetaTemplates`. Never logs the token.
 * Higher-level sending (validation, dedupe, OTP, logging) lives in
 * `src/lib/whatsapp/client.ts`.
 */

import "server-only";

import type { WhatsAppMediaPayload, WhatsAppOtpButton } from "@/lib/whatsapp/types";

export const DEFAULT_META_GRAPH_VERSION = "v23.0";

export type MetaConfig = {
  phoneNumberId: string;
  accessToken: string;
  graphVersion: string;
  apiBase: string;
  /** Needed only for the template status check. */
  wabaId: string | null;
};

export function loadMetaConfig(
  env: NodeJS.ProcessEnv = process.env,
): { ok: true; config: MetaConfig } | { ok: false; code: string; error: string } {
  const phoneNumberId = env.META_WHATSAPP_PHONE_NUMBER_ID?.trim();
  const accessToken = env.META_WHATSAPP_ACCESS_TOKEN?.trim();
  if (!phoneNumberId || !accessToken) {
    return {
      ok: false,
      code: "missing_meta_config",
      error: "META_WHATSAPP_PHONE_NUMBER_ID and META_WHATSAPP_ACCESS_TOKEN must be set.",
    };
  }
  if (!/^\d+$/.test(phoneNumberId)) {
    return { ok: false, code: "invalid_meta_config", error: "META_WHATSAPP_PHONE_NUMBER_ID must be the numeric ID." };
  }
  const wabaId = env.META_WHATSAPP_WABA_ID?.trim() || null;
  return {
    ok: true,
    config: {
      phoneNumberId,
      accessToken,
      graphVersion: (env.META_WHATSAPP_API_VERSION?.trim() || DEFAULT_META_GRAPH_VERSION).replace(/^v?/, "v"),
      apiBase: (env.META_WHATSAPP_API_BASE?.trim() || "https://graph.facebook.com").replace(/\/$/, ""),
      wabaId: wabaId && /^\d+$/.test(wabaId) ? wabaId : null,
    },
  };
}

/**
 * Meta rejects template text params containing new lines, tabs or more than
 * four consecutive spaces (error 132018), so flatten them.
 */
export function sanitizeMetaTextParam(value: string): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1024);
}

export type MetaTemplatePayloadInput = {
  /** Digits only, with country code, e.g. 919876543210 */
  to: string;
  templateName: string;
  language: string;
  bodyParams: string[];
  buttons?: WhatsAppOtpButton[];
  media?: WhatsAppMediaPayload;
};

export function buildMetaTemplatePayload(input: MetaTemplatePayloadInput) {
  const components: Array<Record<string, unknown>> = [];

  if (input.media?.url) {
    components.push({
      type: "header",
      parameters: [
        { type: "document", document: { link: input.media.url, filename: input.media.filename || "document.pdf" } },
      ],
    });
  }

  if (input.bodyParams.length) {
    components.push({
      type: "body",
      parameters: input.bodyParams.map((text) => ({ type: "text", text: sanitizeMetaTextParam(text) })),
    });
  }

  for (const button of input.buttons ?? []) {
    components.push({
      type: "button",
      // Authentication templates take the code on a url button for both
      // "copy code" and "one-tap" — Meta has no copy_code sub_type on send.
      sub_type: "url",
      index: String(button.index),
      parameters: button.parameters.map((p) => ({ type: "text", text: sanitizeMetaTextParam(p.text) })),
    });
  }

  return {
    messaging_product: "whatsapp" as const,
    recipient_type: "individual" as const,
    to: input.to,
    type: "template" as const,
    template: {
      name: input.templateName,
      language: { code: input.language },
      ...(components.length ? { components } : {}),
    },
  };
}

/**
 * Free-form text. Meta only delivers it inside the 24-hour customer service
 * window (the customer messaged us in the last 24h); outside it Meta answers
 * error 131047 and a template must be used instead.
 */
export function buildMetaTextPayload(input: { to: string; body: string; previewUrl?: boolean }) {
  return {
    messaging_product: "whatsapp" as const,
    recipient_type: "individual" as const,
    to: input.to,
    type: "text" as const,
    text: { body: String(input.body ?? "").slice(0, 4096), preview_url: Boolean(input.previewUrl) },
  };
}

export type MetaMessagePayload = ReturnType<typeof buildMetaTemplatePayload> | ReturnType<typeof buildMetaTextPayload>;

export type MetaSendOutcome =
  | { ok: true; messageId: string | null; httpStatus: number }
  | {
      ok: false;
      httpStatus: number | null;
      /** timeout | network_error | meta_auth_failed | meta_rate_limited | outside_service_window | template_not_approved | provider_rejected */
      code: string;
      /** Meta's own error code (e.g. 132001 template not found), for the log. */
      metaCode: number | null;
      message: string;
    };

type MetaErrorBody = {
  error?: { message?: string; code?: number; error_subcode?: number; error_data?: { details?: string } };
};

// 190 = token expired/invalid; 10/200 = permission.
const AUTH_CODES = [190, 10, 200];
// 4/80007/130429/131048/131056 = rate / spam limits.
const RATE_CODES = [4, 80007, 130429, 131048, 131056];
// 132000–132016: template missing, not approved, paused, wrong params/language.
const TEMPLATE_CODES = [132000, 132001, 132005, 132007, 132012, 132015, 132016];

export function interpretMetaResponse(status: number, body: unknown): MetaSendOutcome {
  const record = (body && typeof body === "object" ? body : {}) as { messages?: Array<{ id?: string }> } & MetaErrorBody;
  if (status >= 200 && status < 300 && Array.isArray(record.messages) && record.messages.length) {
    return { ok: true, messageId: record.messages[0]?.id ?? null, httpStatus: status };
  }

  const metaCode = typeof record.error?.code === "number" ? record.error.code : null;
  const detail = [record.error?.message, record.error?.error_data?.details].filter(Boolean).join(" — ");
  const code =
    status === 401 || AUTH_CODES.includes(metaCode ?? -1)
      ? "meta_auth_failed"
      : status === 429 || RATE_CODES.includes(metaCode ?? -1)
        ? "meta_rate_limited"
        : metaCode === 131047
          ? "outside_service_window"
          : TEMPLATE_CODES.includes(metaCode ?? -1)
            ? "template_not_approved"
            : "provider_rejected";

  return {
    ok: false,
    httpStatus: status,
    code,
    metaCode,
    message: (detail || `Meta WhatsApp API HTTP ${status}`).slice(0, 400),
  };
}

async function graphFetch(
  url: string,
  init: RequestInit,
  options: { fetchImpl?: typeof fetch; timeoutMs?: number },
): Promise<{ status: number; body: unknown } | { error: "timeout" | "network_error" }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 15_000);
  try {
    const response = await (options.fetchImpl ?? fetch)(url, { ...init, signal: controller.signal });
    const text = await response.text();
    let body: unknown = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }
    return { status: response.status, body };
  } catch (error) {
    return { error: error instanceof Error && error.name === "AbortError" ? "timeout" : "network_error" };
  } finally {
    clearTimeout(timer);
  }
}

export async function postMetaMessage(
  config: MetaConfig,
  payload: MetaMessagePayload,
  options: { fetchImpl?: typeof fetch; timeoutMs?: number } = {},
): Promise<MetaSendOutcome> {
  const result = await graphFetch(
    `${config.apiBase}/${config.graphVersion}/${config.phoneNumberId}/messages`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.accessToken}` },
      body: JSON.stringify(payload),
    },
    options,
  );
  if ("error" in result) {
    return {
      ok: false,
      httpStatus: null,
      code: result.error,
      metaCode: null,
      message: result.error === "timeout" ? "Meta WhatsApp request timed out." : "Meta WhatsApp request failed.",
    };
  }
  return interpretMetaResponse(result.status, result.body);
}

export type MetaTemplateRow = { name?: string; language?: string; status?: string; category?: string };

/** GET /{waba-id}/message_templates — what Meta actually has, with approval status. */
export async function fetchMetaTemplates(
  config: MetaConfig,
  options: { fetchImpl?: typeof fetch; timeoutMs?: number } = {},
): Promise<{ ok: true; templates: MetaTemplateRow[] } | { ok: false; error: string }> {
  if (!config.wabaId) return { ok: false, error: "META_WHATSAPP_WABA_ID is not set." };
  const result = await graphFetch(
    `${config.apiBase}/${config.graphVersion}/${config.wabaId}/message_templates?fields=name,language,status,category&limit=200`,
    { method: "GET", headers: { Authorization: `Bearer ${config.accessToken}` } },
    options,
  );
  if ("error" in result) return { ok: false, error: `Meta request ${result.error}.` };
  const body = (result.body ?? {}) as { data?: MetaTemplateRow[] } & MetaErrorBody;
  if (result.status >= 300 || !Array.isArray(body.data)) {
    return { ok: false, error: (body.error?.message || `Meta HTTP ${result.status}`).slice(0, 300) };
  }
  return { ok: true, templates: body.data };
}

/* ── Webhook ───────────────────────────────────────────────────────────── */

/**
 * Meta signs every webhook POST with the app secret:
 * `X-Hub-Signature-256: sha256=<hex HMAC-SHA256 of the raw body>`.
 */
export async function verifyMetaSignature(
  rawBody: string,
  header: string | null,
  appSecret: string,
): Promise<boolean> {
  const match = /^sha256=([0-9a-f]{64})$/i.exec(String(header ?? "").trim());
  if (!match || !appSecret) return false;
  const { createHmac, timingSafeEqual } = await import("crypto");
  const expected = createHmac("sha256", appSecret).update(rawBody, "utf8").digest();
  const given = Buffer.from(match[1], "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export type MetaStatusEvent = {
  messageId: string;
  status: string;
  timestamp: string | null;
  errorCode: string | null;
  errorMessage: string | null;
};

export type MetaInboundMessage = {
  /** wamid — the idempotency key. */
  messageId: string;
  /** Sender, digits with country code, e.g. 919876543210 */
  from: string;
  /** WhatsApp profile name, when Meta sends it. */
  profileName: string | null;
  /** text | button | interactive | image | document | audio | video | location | … */
  type: string;
  /** Readable body: the text, button/list title, or media caption. */
  text: string | null;
  timestamp: string | null;
  /** The phone number ID it was sent to. */
  toPhoneNumberId: string | null;
};

type ChangeValue = {
  metadata?: { phone_number_id?: unknown };
  statuses?: unknown;
  messages?: unknown;
  contacts?: Array<{ wa_id?: unknown; profile?: { name?: unknown } }>;
};

function webhookChangeValues(payload: unknown): ChangeValue[] {
  if (!payload || typeof payload !== "object") return [];
  const root = payload as { object?: unknown; entry?: unknown };
  if (root.object !== "whatsapp_business_account" || !Array.isArray(root.entry)) return [];
  const values: ChangeValue[] = [];
  for (const entry of root.entry.slice(0, 50)) {
    const changes = (entry as { changes?: unknown })?.changes;
    if (!Array.isArray(changes)) continue;
    for (const change of changes.slice(0, 50)) {
      const value = (change as { value?: unknown })?.value;
      if (value && typeof value === "object") values.push(value as ChangeValue);
    }
  }
  return values;
}

/** Every `statuses[]` entry (sent / delivered / read / failed) in a webhook. */
export function parseMetaStatusEvents(payload: unknown): MetaStatusEvent[] {
  const events: MetaStatusEvent[] = [];
  for (const value of webhookChangeValues(payload)) {
    if (!Array.isArray(value.statuses)) continue;
    for (const raw of value.statuses.slice(0, 100)) {
      const s = raw as {
        id?: unknown;
        status?: unknown;
        timestamp?: unknown;
        errors?: Array<{ code?: unknown; title?: unknown; message?: unknown; error_data?: { details?: unknown } }>;
      };
      if (typeof s?.id !== "string" || typeof s.status !== "string") continue;
      const error = Array.isArray(s.errors) ? s.errors[0] : undefined;
      events.push({
        messageId: s.id,
        status: s.status,
        timestamp: typeof s.timestamp === "string" ? s.timestamp : null,
        errorCode: error?.code != null ? String(error.code) : null,
        errorMessage: error
          ? [error.title, error.message, error.error_data?.details].filter((v) => typeof v === "string").join(" — ") || null
          : null,
      });
    }
  }
  return events;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/** Every inbound customer message (`messages[]`) in a webhook, flattened to what the CRM needs. */
export function parseMetaInboundMessages(payload: unknown): MetaInboundMessage[] {
  const out: MetaInboundMessage[] = [];
  for (const value of webhookChangeValues(payload)) {
    if (!Array.isArray(value.messages)) continue;
    const contacts = Array.isArray(value.contacts) ? value.contacts : [];
    for (const raw of value.messages.slice(0, 100)) {
      const m = raw as Record<string, unknown> & {
        text?: { body?: unknown };
        button?: { text?: unknown };
        interactive?: { button_reply?: { title?: unknown }; list_reply?: { title?: unknown } };
      };
      const id = str(m?.id);
      const from = str(m?.from);
      if (!id || !from) continue;
      const type = str(m.type) ?? "unknown";
      const media = m[type] as { caption?: unknown; filename?: unknown } | undefined;
      const text =
        str(m.text?.body) ??
        str(m.button?.text) ??
        str(m.interactive?.button_reply?.title) ??
        str(m.interactive?.list_reply?.title) ??
        str(media?.caption) ??
        str(media?.filename);
      const contact = contacts.find((c) => str(c?.wa_id) === from) ?? contacts[0];
      out.push({
        messageId: id,
        from,
        profileName: str(contact?.profile?.name),
        type,
        text: text ? text.slice(0, 2000) : null,
        timestamp: str(m.timestamp),
        toPhoneNumberId: str(value.metadata?.phone_number_id),
      });
    }
  }
  return out;
}
