import { randomUUID } from "crypto";

import { loadAisensyConfig, normalizeAisensyDestination, isAisensySuccessResponse } from "@/lib/whatsapp/aisensy";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  FINAL_DOCUMENT_BUCKET,
  WHATSAPP_FINAL_SIGNED_URL_TTL_SECONDS,
} from "@/lib/documents/final-document-storage";

export type ApplicationWhatsAppEvent =
  | "application_submitted"
  | "payment_pending"
  | "payment_success"
  | "documents_required"
  | "documents_received"
  | "processing_started"
  | "progress_update"
  | "objection"
  | "objection_resolved"
  | "completed"
  | "final_document";

export type SendApplicationWhatsAppInput = {
  applicationId: string;
  eventType: ApplicationWhatsAppEvent;
  recipientMobile: string;
  customerName: string;
  serviceName: string;
  notes?: string;
  documentUrl?: string;
  documentName?: string;
  documentId?: string;
  /** @deprecated prefer documentId — never logged */
  storagePath?: string;
  forceRetry?: boolean;
  version?: number;
};

const MAX_WHATSAPP_ATTEMPTS = 5;
/** @deprecated use WHATSAPP_FINAL_SIGNED_URL_TTL_SECONDS */
const SIGNED_URL_TTL_SECONDS = WHATSAPP_FINAL_SIGNED_URL_TTL_SECONDS;

function campaignForEvent(eventType: ApplicationWhatsAppEvent): string {
  if (eventType === "final_document") {
    return (
      process.env.AISENSY_FINAL_DOCUMENT_CAMPAIGN?.trim() ||
      process.env.AISENSY_APPLICATION_CAMPAIGN?.trim() ||
      "application_update"
    );
  }
  return process.env.AISENSY_APPLICATION_CAMPAIGN?.trim() || "application_update";
}

function buildMessage(input: SendApplicationWhatsAppInput): string {
  const name = input.customerName || "Customer";
  const service = input.serviceName || "your service";
  const id = input.applicationId;
  switch (input.eventType) {
    case "payment_pending":
      return `Hello ${name},\n\nPayment is pending for "${service}" (App: ${id}). Please complete payment to continue. — DigiConnect Dukan`;
    case "payment_success":
      return `Hello ${name},\n\nPayment received for "${service}" (App: ${id}). We are processing your application. — DigiConnect Dukan`;
    case "documents_required":
      return `Hello ${name},\n\nAdditional documents are required for "${service}" (App: ${id}). ${input.notes || "Please check your dashboard."} — DigiConnect Dukan`;
    case "objection":
      return `Hello ${name},\n\nAction needed on "${service}" (App: ${id}). ${input.notes || "Please review and respond."} — DigiConnect Dukan`;
    case "progress_update":
    case "processing_started":
      return `Hello ${name},\n\nUpdate on "${service}" (App: ${id}): ${input.notes || "Your application is in process."} — DigiConnect Dukan`;
    case "final_document":
    case "completed":
      return `Hello ${name},\n\nYour "${service}" application is completed (App: ${id}).${
        input.documentUrl ? `\n\nSecure document link (temporary):\n${input.documentUrl}` : ""
      }\n\n— DigiConnect Dukan / RNOS India Pvt. Ltd.`;
    default:
      return `Hello ${name},\n\nUpdate on "${service}" (App: ${id}). ${input.notes || ""} — DigiConnect Dukan`;
  }
}

function safeLogPayload(payload: Record<string, unknown>) {
  const copy = { ...payload };
  if (typeof copy.document_url === "string") {
    copy.document_url = "[redacted_signed_url]";
  }
  return copy;
}

/**
 * Sends an application WhatsApp via AiSensy campaign API when configured.
 * Logs to whatsapp_messages with unique idempotency_key.
 * When AiSensy is not configured, status stays `queued` (NOT treated as sent).
 */
export async function sendApplicationWhatsApp(input: SendApplicationWhatsAppInput) {
  const supabase = getSupabaseAdmin();
  const requestId = randomUUID();
  const version = input.version ?? 1;
  const idempotencyKey = `${input.applicationId}:${input.eventType}:${version}`;
  const destination = normalizeAisensyDestination(input.recipientMobile);

  if (!destination.ok) {
    return { ok: false as const, code: "invalid_mobile", error: destination.error, requestId };
  }

  const e164 = destination.destination;

  if (!supabase) {
    return { ok: false as const, code: "supabase_missing", error: "Database unavailable.", requestId };
  }

  const { data: existing, error: existingError } = await supabase
    .from("whatsapp_messages")
    .select("id, status, attempt_count")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (existingError && /PGRST205|42P01|does not exist|schema cache/i.test(`${existingError.code ?? ""} ${existingError.message}`)) {
    const loaded = loadAisensyConfig();
    return {
      ok: false as const,
      code: "database_upgrade_required" as const,
      error: loaded.ok
        ? "Database upgrade required before WhatsApp delivery logging can run."
        : "Database upgrade required. WhatsApp table missing and AiSensy not configured.",
      queued: true,
      requestId,
      messageId: null,
      upgradeRequired: true,
    };
  }

  if (existing) {
    const status = String(existing.status ?? "").toLowerCase();
    if (status === "sent" || status === "delivered" || status === "read") {
      return {
        ok: true as const,
        deduped: true,
        requestId,
        messageId: existing.id,
        error: input.forceRetry ? "Already delivered — retry rejected." : undefined,
      };
    }
    if (status === "queued" && !input.forceRetry) {
      return { ok: false as const, code: "queued", error: "WhatsApp delivery is queued. Configure AiSensy or retry later.", requestId, messageId: existing.id };
    }
    const attempts = Number(existing.attempt_count ?? 1);
    if (input.forceRetry && attempts >= MAX_WHATSAPP_ATTEMPTS) {
      return { ok: false as const, code: "retry_limit", error: `Retry limit (${MAX_WHATSAPP_ATTEMPTS}) reached.`, requestId, messageId: existing.id };
    }
    if (!input.forceRetry && status === "failed") {
      return { ok: false as const, code: "failed", error: "Previous send failed. Use Retry WhatsApp.", requestId, messageId: existing.id };
    }
  }

  const campaignName = campaignForEvent(input.eventType);
  const message = buildMessage(input);
  const payload = safeLogPayload({
    customer_name: input.customerName,
    service_name: input.serviceName,
    message,
    document_name: input.documentName ?? null,
    document_id: input.documentId ?? null,
    notes: input.notes ?? null,
  });

  const nextAttempt = Number(existing?.attempt_count ?? 0) + 1;
  const now = new Date().toISOString();

  const { data: row, error: upsertError } = await supabase
    .from("whatsapp_messages")
    .upsert(
      {
        application_id: input.applicationId,
        channel: "whatsapp",
        event_type: input.eventType,
        template_name: campaignName,
        recipient: e164,
        status: "queued",
        idempotency_key: idempotencyKey,
        payload,
        attempt_count: nextAttempt,
        last_attempt_at: now,
        error_message: null,
        updated_at: now,
      },
      { onConflict: "idempotency_key" },
    )
    .select("id")
    .maybeSingle();

  if (upsertError) {
    // Pre-migration: whatsapp_messages table may not exist yet.
    if (/PGRST205|42P01|does not exist|schema cache/i.test(`${upsertError.code ?? ""} ${upsertError.message}`)) {
      const loaded = loadAisensyConfig();
      if (!loaded.ok) {
        return {
          ok: false as const,
          code: "configuration_required",
          error: "WhatsApp logging table missing and AiSensy not configured. Apply migrations and configure AiSensy.",
          queued: true,
          requestId,
          messageId: null,
          upgradeRequired: true,
        };
      }
      // Config present but log table missing — still refuse false "sent"; require upgrade for auditability.
      return {
        ok: false as const,
        code: "database_upgrade_required",
        error: "Database upgrade required before WhatsApp delivery logging can run.",
        requestId,
        messageId: null,
        upgradeRequired: true,
      };
    }
    console.error("[whatsapp-app] log_upsert_failed", upsertError.message);
  }

  const messageId = row?.id ?? existing?.id ?? null;
  const loaded = loadAisensyConfig();

  if (!loaded.ok) {
    // Do NOT mark as sent — there is no guaranteed worker for application campaigns.
    if (messageId) {
      await supabase
        .from("whatsapp_messages")
        .update({
          status: "queued",
          error_message: "AiSensy not configured. Delivery not sent.",
          updated_at: now,
        })
        .eq("id", messageId);
    }
    return {
      ok: false as const,
      code: "configuration_required",
      error: "WhatsApp is not configured. Message queued — configure AiSensy and retry.",
      queued: true,
      requestId,
      messageId,
    };
  }

  try {
    const body: Record<string, unknown> = {
      apiKey: loaded.config.apiKey,
      campaignName,
      destination: e164,
      userName: input.customerName || "Customer",
      templateParams: [
        input.customerName || "Customer",
        input.serviceName || "Service",
        input.applicationId,
        input.notes || message.slice(0, 120),
      ],
      source: "digiconnect-application",
    };
    if (input.documentUrl) {
      body.media = { url: input.documentUrl, filename: input.documentName || "document.pdf" };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    const response = await fetch(loaded.config.apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const text = await response.text();
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }

    const success = isAisensySuccessResponse(response.status, parsed);
    if (messageId) {
      await supabase
        .from("whatsapp_messages")
        .update({
          status: success ? "sent" : "failed",
          sent_at: success ? new Date().toISOString() : null,
          failed_at: success ? null : new Date().toISOString(),
          error_message: success ? null : `HTTP ${response.status}`,
          provider_message_id: requestId,
          payload: {
            ...payload,
            provider_response: typeof parsed === "object" && parsed ? parsed : { raw: text.slice(0, 500) },
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", messageId);
    }

    if (!success) {
      return { ok: false as const, code: "send_failed", error: "WhatsApp delivery failed.", requestId, messageId };
    }
    return { ok: true as const, requestId, messageId, campaignName };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "send_error";
    if (messageId) {
      await supabase
        .from("whatsapp_messages")
        .update({
          status: "failed",
          failed_at: new Date().toISOString(),
          error_message: msg,
          updated_at: new Date().toISOString(),
        })
        .eq("id", messageId);
    }
    return { ok: false as const, code: "send_error", error: msg, requestId, messageId };
  }
}

export async function completeAndSendFinalDocumentWhatsApp(options: {
  applicationId: string;
  storagePath: string;
  storageBucket?: string;
  documentName: string;
  documentId?: string;
  recipientMobile: string;
  customerName: string;
  serviceName: string;
  forceRetry?: boolean;
}) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { ok: false as const, error: "Database unavailable.", code: "supabase_missing" };
  }

  const bucket = options.storageBucket || FINAL_DOCUMENT_BUCKET;
  const { data: signed } = await supabase.storage
    .from(bucket)
    .createSignedUrl(options.storagePath, WHATSAPP_FINAL_SIGNED_URL_TTL_SECONDS);

  // Legacy fallback: object may still live in `documents`
  let documentUrl = signed?.signedUrl;
  if (!documentUrl && bucket !== "documents") {
    const legacy = await supabase.storage
      .from("documents")
      .createSignedUrl(options.storagePath, WHATSAPP_FINAL_SIGNED_URL_TTL_SECONDS);
    documentUrl = legacy.data?.signedUrl;
  }

  if (!documentUrl) {
    return { ok: false as const, error: "Could not create secure document link.", code: "signed_url_failed" };
  }

  const result = await sendApplicationWhatsApp({
    applicationId: options.applicationId,
    eventType: "final_document",
    recipientMobile: options.recipientMobile,
    customerName: options.customerName,
    serviceName: options.serviceName,
    documentUrl,
    documentName: options.documentName,
    documentId: options.documentId,
    forceRetry: options.forceRetry,
  });

  const deliveryStatus = result.ok
    ? "sent"
    : "code" in result && result.code === "configuration_required"
      ? "queued"
      : "failed";

  const { error: deliveryUpdateError } = await supabase
    .from("applications")
    .update({
      whatsapp_final_delivery_status: deliveryStatus,
      whatsapp_final_delivered_at: result.ok ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", options.applicationId);

  if (
    deliveryUpdateError &&
    !/42703|column .* does not exist/i.test(`${deliveryUpdateError.code ?? ""} ${deliveryUpdateError.message}`)
  ) {
    console.error("[whatsapp-app] delivery_status_update_failed", deliveryUpdateError.message);
  }

  return result;
}

export { MAX_WHATSAPP_ATTEMPTS, SIGNED_URL_TTL_SECONDS, WHATSAPP_FINAL_SIGNED_URL_TTL_SECONDS };
