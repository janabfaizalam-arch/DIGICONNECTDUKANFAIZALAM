/**
 * Meta WhatsApp Cloud API — send approved templates straight from Meta,
 * no BSP in between. Selected with WHATSAPP_PROVIDER=meta.
 *
 * The rest of the app still speaks in "campaign name + template params":
 * the campaign name is the Meta template name (create the template on Meta
 * with the same name the AISENSY_*_CAMPAIGN env holds), and the params fill
 * {{1}}, {{2}}, … in the template body, in order.
 *
 * Pure except for `postMetaTemplate`; never logs the access token.
 */

import type { AisensyCampaignButton, AisensyMediaPayload } from "@/lib/whatsapp/types";

export const DEFAULT_META_GRAPH_VERSION = "v23.0";
export const DEFAULT_META_TEMPLATE_LANGUAGE = "en";

export type MetaConfig = {
  phoneNumberId: string;
  accessToken: string;
  graphVersion: string;
  language: string;
  apiBase: string;
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
  const graphVersion = (env.META_WHATSAPP_API_VERSION?.trim() || DEFAULT_META_GRAPH_VERSION).replace(/^v?/, "v");
  return {
    ok: true,
    config: {
      phoneNumberId,
      accessToken,
      graphVersion,
      language: env.META_WHATSAPP_TEMPLATE_LANGUAGE?.trim() || DEFAULT_META_TEMPLATE_LANGUAGE,
      apiBase: (env.META_WHATSAPP_API_BASE?.trim() || "https://graph.facebook.com").replace(/\/$/, ""),
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
  buttons?: AisensyCampaignButton[];
  media?: AisensyMediaPayload;
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
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: input.to,
    type: "template",
    template: {
      name: input.templateName,
      language: { code: input.language },
      ...(components.length ? { components } : {}),
    },
  };
}

export type MetaSendOutcome =
  | { ok: true; messageId: string | null; httpStatus: number }
  | {
      ok: false;
      httpStatus: number | null;
      /** Our code: timeout | network_error | meta_auth_failed | meta_rate_limited | provider_rejected */
      code: string;
      /** Meta's own error code (e.g. 132001 template not found), for the log. */
      metaCode: number | null;
      message: string;
    };

type MetaErrorBody = { error?: { message?: string; code?: number; error_subcode?: number; error_data?: { details?: string } } };

export function interpretMetaResponse(status: number, body: unknown): MetaSendOutcome {
  const record = (body && typeof body === "object" ? body : {}) as { messages?: Array<{ id?: string }> } & MetaErrorBody;
  if (status >= 200 && status < 300 && Array.isArray(record.messages) && record.messages.length) {
    return { ok: true, messageId: record.messages[0]?.id ?? null, httpStatus: status };
  }

  const metaCode = typeof record.error?.code === "number" ? record.error.code : null;
  const detail = [record.error?.message, record.error?.error_data?.details].filter(Boolean).join(" — ");
  // 190 = token expired/invalid; 10/200 = permission. Nothing to retry until someone fixes the token.
  const authFailure = status === 401 || metaCode === 190 || metaCode === 10 || metaCode === 200;
  // 4/80007/130429/131048/131056 = rate / spam limits.
  const rateLimited = status === 429 || [4, 80007, 130429, 131048, 131056].includes(metaCode ?? -1);

  return {
    ok: false,
    httpStatus: status,
    code: authFailure ? "meta_auth_failed" : rateLimited ? "meta_rate_limited" : "provider_rejected",
    metaCode,
    message: (detail || `Meta WhatsApp API HTTP ${status}`).slice(0, 400),
  };
}

export async function postMetaTemplate(
  config: MetaConfig,
  payload: ReturnType<typeof buildMetaTemplatePayload>,
  options: { fetchImpl?: typeof fetch; timeoutMs?: number } = {},
): Promise<MetaSendOutcome> {
  const url = `${config.apiBase}/${config.graphVersion}/${config.phoneNumberId}/messages`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 15_000);
  try {
    const response = await (options.fetchImpl ?? fetch)(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.accessToken}` },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const text = await response.text();
    let body: unknown = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }
    return interpretMetaResponse(response.status, body);
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    return {
      ok: false,
      httpStatus: null,
      code: aborted ? "timeout" : "network_error",
      metaCode: null,
      message: aborted ? "Meta WhatsApp request timed out." : "Meta WhatsApp request failed.",
    };
  } finally {
    clearTimeout(timer);
  }
}

/* ── Webhook (delivery statuses) ───────────────────────────────────────── */

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

/** Pull every `statuses[]` entry out of a WhatsApp Business Account webhook. Ignores inbound messages. */
export function parseMetaStatusEvents(payload: unknown): MetaStatusEvent[] {
  if (!payload || typeof payload !== "object") return [];
  const root = payload as { object?: unknown; entry?: unknown };
  if (root.object !== "whatsapp_business_account" || !Array.isArray(root.entry)) return [];

  const events: MetaStatusEvent[] = [];
  for (const entry of root.entry.slice(0, 50)) {
    const changes = (entry as { changes?: unknown })?.changes;
    if (!Array.isArray(changes)) continue;
    for (const change of changes.slice(0, 50)) {
      const value = (change as { value?: { statuses?: unknown } })?.value;
      if (!value || !Array.isArray(value.statuses)) continue;
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
  }
  return events;
}
