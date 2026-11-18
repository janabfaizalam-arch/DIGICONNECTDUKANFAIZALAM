import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  sendWhatsAppText,
  sendWhatsAppTemplate,
  normalizeWhatsAppDestination,
  redactSecrets,
} from "@/lib/whatsapp/client";
import {
  resolveTemplate,
  type WhatsAppTemplateKey,
} from "@/lib/whatsapp/template-registry";

export const SERVICE_WINDOW_HOURS = 24;
export const SERVICE_WINDOW_MS = SERVICE_WINDOW_HOURS * 60 * 60 * 1000;

export type ServiceWindowStatus = {
  isOpen: boolean;
  lastInboundAt: string | null;
  msRemaining: number;
  hoursRemaining: number;
};

/**
 * Checks WhatsApp's 24-hour customer service window for a conversation.
 * Free-form text replies can only be sent within 24 hours of the customer's last inbound message.
 */
export async function checkServiceWindow(
  conversationId: string,
  supabaseOverride?: SupabaseClient | null,
): Promise<ServiceWindowStatus> {
  const supabase = supabaseOverride ?? getSupabaseAdmin();
  if (!supabase) {
    return { isOpen: false, lastInboundAt: null, msRemaining: 0, hoursRemaining: 0 };
  }

  // Find the most recent inbound message for this conversation
  const { data: latestInbound } = await supabase
    .from("whatsapp_messages")
    .select("created_at, timestamp")
    .eq("conversation_id", conversationId)
    .eq("direction", "inbound")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!latestInbound) {
    return { isOpen: false, lastInboundAt: null, msRemaining: 0, hoursRemaining: 0 };
  }

  const inboundTime = new Date(latestInbound.timestamp || latestInbound.created_at).getTime();
  const now = Date.now();
  const elapsed = now - inboundTime;
  const remaining = SERVICE_WINDOW_MS - elapsed;

  if (remaining <= 0) {
    return {
      isOpen: false,
      lastInboundAt: new Date(inboundTime).toISOString(),
      msRemaining: 0,
      hoursRemaining: 0,
    };
  }

  return {
    isOpen: true,
    lastInboundAt: new Date(inboundTime).toISOString(),
    msRemaining: remaining,
    hoursRemaining: Math.round((remaining / (60 * 60 * 1000)) * 10) / 10,
  };
}

export type SendInboxReplyInput = {
  conversationId: string;
  type: "text" | "template";
  textBody?: string;
  templateKey?: WhatsAppTemplateKey;
  templateName?: string;
  templateParams?: string[];
  actorId: string;
  requestId?: string;
  fetchImpl?: typeof fetch;
};

export type SendInboxReplyResult =
  | {
      ok: true;
      messageId: string;
      providerMessageId: string | null;
      type: "text" | "template";
      alreadySent?: boolean;
    }
  | {
      ok: false;
      error: string;
      code: string;
      httpStatus?: number | null;
      messageId?: string;
    };

/**
 * Send an outgoing WhatsApp reply from the Shared Inbox.
 * Validates the 24-hour service window for text messages.
 * Enforces approved templates outside the 24-hour window.
 * Saves the outbound message to the canonical whatsapp_messages table.
 */
export async function sendInboxReply(
  input: SendInboxReplyInput,
  supabaseOverride?: SupabaseClient | null,
): Promise<SendInboxReplyResult> {
  const supabase = supabaseOverride ?? getSupabaseAdmin();
  if (!supabase) {
    return { ok: false, error: "Database unavailable", code: "database_unavailable" };
  }

  // 1. Fetch conversation
  const { data: conv, error: convErr } = await supabase
    .from("whatsapp_conversations")
    .select("id, wa_id, phone_number, customer_id, customer_name, status")
    .eq("id", input.conversationId)
    .maybeSingle();

  if (convErr || !conv) {
    return { ok: false, error: "Conversation not found", code: "conversation_not_found" };
  }

  const phone = normalizeWhatsAppDestination(conv.phone_number || conv.wa_id);
  if (!phone.ok) {
    return { ok: false, error: phone.error, code: "invalid_phone" };
  }
  const destination = phone.destination;

  // 2. Check marketing opt-out consent
  const { data: consent } = await supabase
    .from("whatsapp_contact_consents")
    .select("consent_status, consent_scope")
    .eq("phone_number", phone.local)
    .eq("consent_scope", "marketing")
    .maybeSingle();

  const isOptedOutMarketing = consent?.consent_status === "opted_out";

  // 3. Service Window Check
  const windowStatus = await checkServiceWindow(input.conversationId, supabase);

  let renderedBody = "";
  const messageType: "text" | "template" = input.type;
  let templateName: string | undefined;
  let templateParams: string[] | undefined;

  if (input.type === "text") {
    const body = String(input.textBody ?? "").trim();
    if (!body) {
      return { ok: false, error: "Message text cannot be empty", code: "empty_text" };
    }

    if (!windowStatus.isOpen) {
      return {
        ok: false,
        error:
          "The 24-hour customer service window has expired. You must send an approved template instead of free-form text.",
        code: "outside_service_window",
      };
    }

    renderedBody = body;
  } else {
    // Template reply
    const templateKey = input.templateKey;
    templateName = input.templateName || (templateKey ? resolveTemplate(templateKey).name : "");

    if (!templateName) {
      return { ok: false, error: "Template name is required", code: "missing_template" };
    }

    templateParams = (input.templateParams ?? []).map((p) => String(p ?? "").trim());

    // Promotional templates blocked if opted out
    if (isOptedOutMarketing && input.templateKey && resolveTemplate(input.templateKey).definition.category !== "UTILITY") {
      return {
        ok: false,
        error: "This contact has opted out of promotional WhatsApp messages. Only utility templates are allowed.",
        code: "marketing_opt_out_enforced",
      };
    }

    renderedBody = `[Template: ${templateName}] ${templateParams.join(" | ")}`.trim();
  }

  const now = new Date().toISOString();
  const requestId = input.requestId?.trim() || "";
  const idempotencyKey = requestId
    ? `inbox_send:${conv.id}:${requestId}`
    : `inbox_send:${conv.id}:${renderedBody.slice(0, 64)}:${Math.floor(Date.now() / 15000)}`;

  // 4. Atomically insert initial intent record before calling Meta API
  const initialRow = {
    conversation_id: conv.id,
    customer_id: conv.customer_id,
    idempotency_key: idempotencyKey,
    direction: "outbound",
    message_type: messageType,
    message_body: renderedBody,
    message_status: "processing",
    status: "processing",
    sender_type: "staff",
    sender_id: input.actorId,
    recipient: destination,
    timestamp: now,
    raw_metadata: {
      template_name: templateName ?? null,
      template_params: templateParams ?? null,
      request_id: requestId || null,
    },
    safe_metadata: {
      source: "shared_inbox",
      actor_id: input.actorId,
    },
    created_at: now,
  };

  const { data: insertedMsg, error: insertErr } = await supabase
    .from("whatsapp_messages")
    .insert(initialRow)
    .select("id, status, message_status, meta_message_id, provider_message_id, error_details")
    .single();

  // If insert failed due to duplicate idempotency_key (e.g. concurrent Vercel request or resubmission)
  if (insertErr || !insertedMsg?.id) {
    const { data: existingMsg } = await supabase
      .from("whatsapp_messages")
      .select("id, status, message_status, meta_message_id, provider_message_id, error_details")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (existingMsg) {
      const existingStatus = existingMsg.status || existingMsg.message_status;
      if (existingStatus === "processing") {
        return {
          ok: false,
          error: "A reply with this request ID is currently being sent. Please wait.",
          code: "duplicate_send_in_progress",
          messageId: String(existingMsg.id),
        };
      }
      if (existingStatus === "sent" || existingStatus === "delivered" || existingStatus === "read") {
        return {
          ok: true,
          messageId: String(existingMsg.id),
          providerMessageId: existingMsg.meta_message_id || existingMsg.provider_message_id || null,
          type: messageType,
          alreadySent: true,
        };
      }
      if (existingStatus === "unknown") {
        return {
          ok: false,
          error: "Previous send attempt is awaiting delivery confirmation. Please wait.",
          code: "previous_attempt_unknown",
          messageId: String(existingMsg.id),
        };
      }
      if (existingStatus === "failed") {
        return {
          ok: false,
          error: existingMsg.error_details || "Previous send attempt failed.",
          code: "previous_attempt_failed",
          messageId: String(existingMsg.id),
        };
      }
    }

    return {
      ok: false,
      error: "Unable to record message dispatch intent.",
      code: "idempotency_intent_failed",
    };
  }

  const messageId = String(insertedMsg.id);

  // 5. Dispatch to Meta Cloud API
  let sendOutcome: Awaited<ReturnType<typeof sendWhatsAppText>>;
  try {
    if (input.type === "text") {
      sendOutcome = await sendWhatsAppText({
        destination,
        body: renderedBody,
        source: "shared_inbox_reply",
        fetchImpl: input.fetchImpl,
      });
    } else {
      sendOutcome = await sendWhatsAppTemplate({
        destination,
        templateName: templateName!,
        templateParams: templateParams!,
        source: "shared_inbox_template",
        fetchImpl: input.fetchImpl,
      });
    }
  } catch (err: unknown) {
    const errString = err instanceof Error ? err.message : String(err);
    await supabase
      .from("whatsapp_messages")
      .update({
        status: "unknown",
        message_status: "unknown",
        error_details: `Ambiguous error: ${redactSecrets(errString)}. Awaiting webhook reconciliation.`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", messageId);

    return {
      ok: false,
      error: "The request timed out or connection was interrupted while communicating with Meta. The message may have been delivered.",
      code: "meta_api_ambiguous_timeout",
      messageId,
    };
  }

  // 6. Handle Meta API Outcome
  if (sendOutcome.ok) {
    await supabase
      .from("whatsapp_messages")
      .update({
        status: "sent",
        message_status: "sent",
        meta_message_id: sendOutcome.providerMessageId,
        provider_message_id: sendOutcome.providerMessageId,
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", messageId);

    await supabase
      .from("whatsapp_conversations")
      .update({
        last_message: renderedBody.slice(0, 1000),
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", conv.id);

    if (sendOutcome.providerMessageId) {
      await supabase.from("whatsapp_message_events").insert({
        message_id: messageId,
        meta_message_id: sendOutcome.providerMessageId,
        event_type: "sent",
        timestamp: new Date().toISOString(),
        raw_event: { source: "outbound_send_accepted" },
        created_at: new Date().toISOString(),
      });
    }

    return {
      ok: true,
      messageId,
      providerMessageId: sendOutcome.providerMessageId,
      type: messageType,
    };
  }

  // Check if failure is an ambiguous network/timeout error
  const isAmbiguous =
    sendOutcome.errorCode === "network_error" ||
    sendOutcome.errorMessage?.toLowerCase().includes("timeout") ||
    sendOutcome.errorMessage?.toLowerCase().includes("aborted");

  if (isAmbiguous) {
    await supabase
      .from("whatsapp_messages")
      .update({
        status: "unknown",
        message_status: "unknown",
        error_details: `Ambiguous timeout: ${redactSecrets(sendOutcome.errorMessage || "Network error")}. Awaiting webhook reconciliation.`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", messageId);

    return {
      ok: false,
      error: "The request timed out while communicating with Meta. The message may have been delivered. Awaiting confirmation.",
      code: "meta_api_ambiguous_timeout",
      messageId,
    };
  }

  // Definite failure (e.g. 4xx from Meta, paused template, invalid payload)
  await supabase
    .from("whatsapp_messages")
    .update({
      status: "failed",
      message_status: "failed",
      error_details: redactSecrets(sendOutcome.errorMessage || "Delivery failed"),
      failed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", messageId);

  return {
    ok: false,
    error: sendOutcome.errorMessage || "WhatsApp send failed",
    code: sendOutcome.errorCode || "send_failed",
    httpStatus: sendOutcome.httpStatus,
    messageId,
  };
}
