import { randomUUID } from "crypto";

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
import { createAisensyAdapter } from "@/lib/communications/provider-adapter";
import { purposeClassification } from "@/lib/communications/comms-core";

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
  customerId?: string | null;
  correlationId?: string | null;
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
 * Application WhatsApp path — preserves legacy idempotency keys and sync caller contract.
 * Provider HTTP goes through the AiSensy adapter (never inside a CRM DB transaction).
 * Logs to whatsapp_messages (canonical outbox). When AiSensy is not configured,
 * status is configuration_required (API still reports queued: true for callers).
 */
export async function sendApplicationWhatsApp(
  input: SendApplicationWhatsAppInput,
): Promise<SendApplicationWhatsAppResult> {
  const supabase = getSupabaseAdmin();
  const requestId = input.correlationId || randomUUID();
  const version = input.version ?? 1;
  // Preserve production-compatible key format (do not switch to purpose:… alone).
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
    if ((status === "queued" || status === "configuration_required") && !input.forceRetry) {
      return {
        ok: false,
        code: status === "configuration_required" ? "configuration_required" : "queued",
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
    if (!input.forceRetry && (status === "failed" || status === "retryable")) {
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
    user_name: input.customerName,
    template_params: templateParams,
    document_name: input.documentName ?? null,
    document_id: input.documentId ?? null,
    notes: input.notes ?? null,
  });

  const nextAttempt = Number(existing?.attempt_count ?? 0) + 1;
  const now = new Date().toISOString();
  const classification = purposeClassification(input.eventType);

  const { data: row, error: upsertError } = await supabase
    .from("whatsapp_messages")
    .upsert(
      {
        application_id: input.applicationId,
        customer_id: input.customerId ?? null,
        channel: "whatsapp",
        provider: "aisensy",
        event_type: input.eventType,
        purpose: input.eventType,
        template_name: campaignName,
        recipient: e164,
        status: "queued",
        idempotency_key: idempotencyKey,
        classification,
        consent_basis: "transactional_ops",
        correlation_id: requestId,
        payload,
        attempt_count: nextAttempt,
        last_attempt_at: now,
        max_attempts: MAX_WHATSAPP_ATTEMPTS,
        next_attempt_at: now,
        error_message: null,
        failure_code: null,
        failure_summary: null,
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
    console.error("[whatsapp-app] log_upsert_failed", { code: "log_upsert_failed", correlationId: requestId });
  }

  const messageId = row?.id ?? existing?.id ?? null;

  // Provider call outside any open CRM transaction (caller already committed).
  const adapter = createAisensyAdapter();
  const media =
    input.eventType === "final_document" && input.documentUrl
      ? { url: input.documentUrl, filename: input.documentName || "document.pdf" }
      : undefined;

  const sendResult = await adapter.sendTemplate({
    campaignName,
    destination: e164,
    userName: input.customerName || "Customer",
    templateParams,
    source: `digiconnect-application:${input.eventType}`,
    media,
    correlationId: requestId,
  });

  if (!sendResult.ok && sendResult.retryClass === "configuration_required") {
    if (messageId) {
      await supabase
        .from("whatsapp_messages")
        .update({
          status: "configuration_required",
          failure_code: "configuration_required",
          failure_summary: "AiSensy not configured. Delivery not sent.",
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
      requestId,
      messageId,
    };
  }

  if (!sendResult.ok) {
    const terminal = sendResult.retryClass === "terminal" || nextAttempt >= MAX_WHATSAPP_ATTEMPTS;
    if (messageId) {
      await supabase
        .from("whatsapp_messages")
        .update({
          status: terminal ? "failed" : "retryable",
          failed_at: terminal ? new Date().toISOString() : null,
          failure_code: sendResult.failureCode,
          failure_summary: sendResult.failureSummary,
          error_message: sendResult.failureSummary,
          next_attempt_at: terminal
            ? null
            : new Date(Date.now() + 30_000 * 2 ** Math.max(0, nextAttempt - 1)).toISOString(),
          payload,
          updated_at: new Date().toISOString(),
        })
        .eq("id", messageId);
    }
    return {
      ok: false,
      code: sendResult.failureCode === "timeout" ? "timeout" : "send_failed",
      error: sendResult.failureSummary || "WhatsApp delivery failed.",
      requestId,
      messageId,
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
        failure_code: null,
        failure_summary: null,
        provider_message_id: sendResult.providerMessageId,
        provider_status: "submitted",
        payload,
        updated_at: new Date().toISOString(),
      })
      .eq("id", messageId);
  }

  return {
    ok: true,
    requestId,
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
    console.error("[whatsapp-app] delivery_status_update_failed", { code: "delivery_status_update_failed" });
  }

  return result;
}

export { MAX_WHATSAPP_ATTEMPTS, SIGNED_URL_TTL_SECONDS, WHATSAPP_FINAL_SIGNED_URL_TTL_SECONDS };
