import { randomUUID } from "crypto";

import { sendAisensyCampaign } from "@/lib/whatsapp/aisensy";
import { normalizeAisensyDestination } from "@/lib/whatsapp/aisensy";
import {
  buildApplicationTemplateParams,
  getApplicationCampaignName,
} from "@/lib/whatsapp/templates";
import type { ApplicationWhatsAppEvent } from "@/lib/whatsapp/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  FINAL_DOCUMENT_BUCKET,
  WHATSAPP_FINAL_SIGNED_URL_TTL_SECONDS,
} from "@/lib/documents/final-document-storage";

export type { ApplicationWhatsAppEvent } from "@/lib/whatsapp/types";

export type SendApplicationWhatsAppInput = {
  applicationId: string;
  eventType: ApplicationWhatsAppEvent;
  recipientMobile: string;
  customerName: string;
  serviceName: string;
  notes?: string;
  amount?: string | number | null;
  status?: string;
  requiredDocuments?: string;
  objectionMessage?: string;
  progressMessage?: string;
  customMessage?: string;
  actionLink?: string;
  documentUrl?: string;
  documentName?: string;
  documentId?: string;
  /** @deprecated prefer documentId — never logged */
  storagePath?: string;
  forceRetry?: boolean;
  version?: number;
};

export type SendApplicationWhatsAppResult =
  | {
      ok: true;
      requestId: string;
      messageId: string | null;
      campaignName?: string;
      deduped?: boolean;
      providerMessageId?: string | null;
      error?: string;
    }
  | {
      ok: false;
      code:
        | "invalid_mobile"
        | "supabase_missing"
        | "database_upgrade_required"
        | "configuration_required"
        | "queued"
        | "failed"
        | "retry_limit"
        | "send_failed"
        | "send_error"
        | "timeout";
      error: string;
      requestId: string;
      messageId?: string | null;
      queued?: boolean;
      upgradeRequired?: boolean;
      providerMessageId?: string | null;
    };

const MAX_WHATSAPP_ATTEMPTS = 5;
/** @deprecated use WHATSAPP_FINAL_SIGNED_URL_TTL_SECONDS */
const SIGNED_URL_TTL_SECONDS = WHATSAPP_FINAL_SIGNED_URL_TTL_SECONDS;

function safeLogPayload(payload: Record<string, unknown>) {
  const copy = { ...payload };
  for (const key of Object.keys(copy)) {
    const value = copy[key];
    if (typeof value === "string" && /https?:\/\/\S+/i.test(value)) {
      copy[key] = "[redacted_url]";
    }
  }
  if ("document_url" in copy) copy.document_url = "[redacted_signed_url]";
  if ("signed_url" in copy) copy.signed_url = "[redacted_signed_url]";
  if ("provider_response" in copy) delete copy.provider_response;
  return copy;
}

/**
 * Sends an application WhatsApp via the central AiSensy campaign client.
 * Logs to whatsapp_messages with unique idempotency_key `${applicationId}:${eventType}:${version}`.
 * When AiSensy is not configured, status stays `queued` (NOT treated as sent).
 */
export async function sendApplicationWhatsApp(
  input: SendApplicationWhatsAppInput,
): Promise<SendApplicationWhatsAppResult> {
  const supabase = getSupabaseAdmin();
  const requestId = randomUUID();
  const version = input.version ?? 1;
  const idempotencyKey = `${input.applicationId}:${input.eventType}:${version}`;
  const destination = normalizeAisensyDestination(input.recipientMobile);

  if (!destination.ok) {
    return { ok: false, code: "invalid_mobile", error: destination.error, requestId };
  }

  const e164 = destination.destination;

  if (!supabase) {
    return { ok: false, code: "supabase_missing", error: "Database unavailable.", requestId };
  }

  const { data: existing, error: existingError } = await supabase
    .from("whatsapp_messages")
    .select("id, status, attempt_count")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (
    existingError &&
    /PGRST205|42P01|does not exist|schema cache/i.test(`${existingError.code ?? ""} ${existingError.message}`)
  ) {
    return {
      ok: false,
      code: "database_upgrade_required",
      error: "Database upgrade required before WhatsApp delivery logging can run.",
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
        ok: true,
        deduped: true,
        requestId,
        messageId: existing.id,
        error: input.forceRetry ? "Already delivered — retry rejected." : undefined,
      };
    }
    if (status === "queued" && !input.forceRetry) {
      return {
        ok: false,
        code: "queued",
        error: "WhatsApp delivery is queued. Configure AiSensy or retry later.",
        requestId,
        messageId: existing.id,
        queued: true,
      };
    }
    const attempts = Number(existing.attempt_count ?? 1);
    if (input.forceRetry && attempts >= MAX_WHATSAPP_ATTEMPTS) {
      return {
        ok: false,
        code: "retry_limit",
        error: `Retry limit (${MAX_WHATSAPP_ATTEMPTS}) reached.`,
        requestId,
        messageId: existing.id,
      };
    }
    if (!input.forceRetry && status === "failed") {
      return {
        ok: false,
        code: "failed",
        error: "Previous send failed. Use Retry WhatsApp.",
        requestId,
        messageId: existing.id,
      };
    }
  }

  const campaignName = getApplicationCampaignName(input.eventType);
  const templateParams = buildApplicationTemplateParams(input.eventType, {
    customerName: input.customerName,
    serviceName: input.serviceName,
    applicationId: input.applicationId,
    status: input.status,
    amount: input.amount,
    requiredDocuments: input.requiredDocuments,
    objectionMessage: input.objectionMessage,
    progressMessage: input.progressMessage,
    customMessage: input.customMessage,
    actionLink: input.actionLink,
    notes: input.notes,
  });

  const payload = safeLogPayload({
    customer_name: input.customerName,
    service_name: input.serviceName,
    event_type: input.eventType,
    template_params: templateParams,
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
    if (/PGRST205|42P01|does not exist|schema cache/i.test(`${upsertError.code ?? ""} ${upsertError.message}`)) {
      return {
        ok: false,
        code: "database_upgrade_required",
        error: "Database upgrade required before WhatsApp delivery logging can run.",
        requestId,
        messageId: null,
        upgradeRequired: true,
        queued: true,
      };
    }
    console.error("[whatsapp-app] log_upsert_failed", upsertError.message);
  }

  const messageId = row?.id ?? existing?.id ?? null;

  const sendResult = await sendAisensyCampaign({
    campaignName,
    destination: e164,
    userName: input.customerName || "Customer",
    templateParams,
    source: `digiconnect-application:${input.eventType}`,
    media:
      input.eventType === "final_document" && input.documentUrl
        ? { url: input.documentUrl, filename: input.documentName || "document.pdf" }
        : undefined,
    // Application idempotency is DB-backed; skip short in-memory OTP dedupe.
    dedupe: false,
  });

  if (sendResult.configuration_required) {
    if (messageId) {
      await supabase
        .from("whatsapp_messages")
        .update({
          status: "queued",
          error_message: "AiSensy not configured. Delivery not sent.",
          updated_at: new Date().toISOString(),
        })
        .eq("id", messageId);
    }
    return {
      ok: false,
      code: "configuration_required",
      error: "WhatsApp is not configured. Message queued — configure AiSensy and retry.",
      queued: true,
      requestId: sendResult.requestId || requestId,
      messageId,
    };
  }

  if (!sendResult.ok) {
    if (messageId) {
      await supabase
        .from("whatsapp_messages")
        .update({
          status: "failed",
          failed_at: new Date().toISOString(),
          error_message: sendResult.errorMessage || "WhatsApp delivery failed.",
          provider_message_id: sendResult.providerMessageId,
          // Never persist signed URLs or raw provider bodies.
          payload,
          updated_at: new Date().toISOString(),
        })
        .eq("id", messageId);
    }
    return {
      ok: false,
      code: sendResult.errorCode === "timeout" ? "timeout" : "send_failed",
      error: sendResult.errorMessage || "WhatsApp delivery failed.",
      requestId: sendResult.requestId || requestId,
      messageId,
      providerMessageId: sendResult.providerMessageId,
    };
  }

  if (messageId) {
    await supabase
      .from("whatsapp_messages")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        failed_at: null,
        error_message: null,
        provider_message_id: sendResult.providerMessageId,
        payload,
        updated_at: new Date().toISOString(),
      })
      .eq("id", messageId);
  }

  return {
    ok: true,
    requestId: sendResult.requestId || requestId,
    messageId,
    campaignName,
    providerMessageId: sendResult.providerMessageId,
  };
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
    return { ok: false as const, error: "Database unavailable.", code: "supabase_missing" as const };
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
    return { ok: false as const, error: "Could not create secure document link.", code: "signed_url_failed" as const };
  }

  // Signed URL lives only in request memory for this send.
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
