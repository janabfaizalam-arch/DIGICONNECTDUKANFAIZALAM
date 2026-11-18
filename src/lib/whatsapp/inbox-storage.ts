import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminNotification } from "@/lib/admin-notifications";
import { isOptOutMessage } from "@/lib/crm/whatsapp-inbound";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { redactSecrets } from "@/lib/whatsapp/client";
import { parseCustomerSupportFlowResponse, syncFlowResponseToCrm } from "@/lib/whatsapp/inbox-flow";
import type { MetaInboundMessage, MetaStatusEvent } from "@/lib/whatsapp/meta-cloud";

export const FLOW_CUSTOMER_SUPPORT_ID = "1616611156369254";

const OPT_IN_RE = /^\s*(start|unstop|opt[\s-]?in|shuru karo|yes)\s*[.!]*\s*$/i;

export function isOptInMessage(text: string | null): boolean {
  return Boolean(text && OPT_IN_RE.test(text));
}

/** Normalize sender WhatsApp ID (e.g. 919876543210 -> 9876543210 local). */
export function normalizeWhatsAppMobile(from: string): string {
  let cleaned = String(from ?? "").replace(/\D/g, "");
  if (cleaned.startsWith("91") && cleaned.length === 12) {
    cleaned = cleaned.slice(2);
  } else if (cleaned.startsWith("0") && cleaned.length === 11) {
    cleaned = cleaned.slice(1);
  }
  return cleaned;
}

export function normalizeMessageType(
  type: string,
): "text" | "image" | "document" | "audio" | "video" | "interactive" | "template" | "unknown" {
  switch (type) {
    case "text":
    case "image":
    case "document":
    case "audio":
    case "video":
    case "interactive":
    case "template":
      return type;
    case "button":
      return "interactive";
    default:
      return "unknown";
  }
}

export type InboxInboundOutcome =
  | { ok: true; status: "duplicate"; conversationId: string | null; messageId: string | null }
  | { ok: true; status: "created"; conversationId: string; messageId: string; flowSubmitted: boolean }
  | { ok: false; status: "error"; reason: string };

/**
 * Record an inbound customer WhatsApp message into the Shared Inbox.
 * Idempotent on message.messageId (Meta wamid).
 */
export async function recordInboundInboxMessage(
  message: MetaInboundMessage,
  supabaseOverride?: SupabaseClient | null,
): Promise<InboxInboundOutcome> {
  const supabase = supabaseOverride ?? getSupabaseAdmin();
  if (!supabase) return { ok: false, status: "error", reason: "supabase_unavailable" };

  const localMobile = normalizeWhatsAppMobile(message.from);
  const now = new Date().toISOString();
  const receivedAt = message.timestamp ? new Date(Number(message.timestamp) * 1000).toISOString() : now;

  // 1. Idempotency check: see if meta_message_id is already stored in whatsapp_messages
  const { data: existingMsg } = await supabase
    .from("whatsapp_messages")
    .select("id, conversation_id")
    .eq("meta_message_id", message.messageId)
    .maybeSingle();

  if (existingMsg) {
    return {
      ok: true,
      status: "duplicate",
      conversationId: existingMsg.conversation_id ? String(existingMsg.conversation_id) : null,
      messageId: String(existingMsg.id),
    };
  }

  // 2. Find or create conversation in whatsapp_conversations
  let conversationId: string | null = null;
  let customerId: string | null = null;
  let customerName: string = message.profileName && message.profileName.length >= 2 ? message.profileName : "WhatsApp Customer";

  // Check if conversation already exists by wa_id or phone_number
  const { data: convByWaId } = await supabase
    .from("whatsapp_conversations")
    .select("id, customer_id, customer_name, unread_count, status")
    .eq("wa_id", message.from)
    .maybeSingle();

  let existingConv = convByWaId;
  if (!existingConv && localMobile) {
    const { data: convByPhone } = await supabase
      .from("whatsapp_conversations")
      .select("id, customer_id, customer_name, unread_count, status")
      .eq("phone_number", localMobile)
      .maybeSingle();
    existingConv = convByPhone;
  }

  // If customer_id not yet linked, match against CRM customers table
  if (!existingConv?.customer_id && localMobile) {
    const { data: matchedCustomer } = await supabase
      .from("customers")
      .select("id, full_name")
      .or(`mobile.eq.${localMobile},mobile.eq.91${localMobile}`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (matchedCustomer) {
      customerId = String(matchedCustomer.id);
      if (matchedCustomer.full_name) {
        customerName = matchedCustomer.full_name;
      }
    }
  } else if (existingConv?.customer_id) {
    customerId = String(existingConv.customer_id);
    if (existingConv.customer_name) {
      customerName = existingConv.customer_name;
    }
  }

  const displayBody = message.text || (message.type ? `[${message.type}]` : "");

  if (existingConv) {
    conversationId = String(existingConv.id);
    const unread = Math.max(0, Number(existingConv.unread_count ?? 0)) + 1;
    const nextStatus = existingConv.status === "archived" ? "open" : existingConv.status;

    const patch: Record<string, unknown> = {
      last_message: displayBody.slice(0, 1000),
      last_message_at: receivedAt,
      unread_count: unread,
      status: nextStatus,
      updated_at: now,
    };
    if (customerId && !existingConv.customer_id) {
      patch.customer_id = customerId;
      patch.customer_name = customerName;
    }

    // Attempt atomic RPC increment to avoid race conditions under concurrent deliveries
    const { error: rpcErr } = await supabase.rpc("increment_whatsapp_conversation_unread", {
      p_conversation_id: conversationId,
      p_last_message: displayBody.slice(0, 1000),
      p_last_message_at: receivedAt,
    });

    if (rpcErr) {
      // Fallback to direct update if RPC is unavailable (e.g. mock test environment)
      const { error: updateErr } = await supabase.from("whatsapp_conversations").update(patch).eq("id", conversationId);
      if (updateErr && String(updateErr.message).includes("last_message")) {
        delete patch.last_message;
        patch.last_message_preview = displayBody.slice(0, 1000);
        await supabase.from("whatsapp_conversations").update(patch).eq("id", conversationId);
      }
    } else if (customerId && !existingConv.customer_id) {
      await supabase
        .from("whatsapp_conversations")
        .update({ customer_id: customerId, customer_name: customerName, updated_at: now })
        .eq("id", conversationId);
    }
  } else {
    // Create new conversation
    const newConvRow: Record<string, unknown> = {
      wa_id: message.from,
      phone_number: localMobile || message.from,
      customer_id: customerId,
      customer_name: customerName,
      last_message: displayBody.slice(0, 1000),
      last_message_at: receivedAt,
      unread_count: 1,
      status: "open",
      created_at: receivedAt,
      updated_at: now,
    };

    let { data: createdConv, error: convErr } = await supabase
      .from("whatsapp_conversations")
      .insert(newConvRow)
      .select("id")
      .single();

    if (convErr && String(convErr.message).includes("last_message")) {
      // Schema resilience fallback: table has last_message_preview instead of last_message
      delete newConvRow.last_message;
      newConvRow.last_message_preview = displayBody.slice(0, 1000);
      const retry = await supabase
        .from("whatsapp_conversations")
        .insert(newConvRow)
        .select("id")
        .single();
      createdConv = retry.data;
      convErr = retry.error;
    }

    if (convErr || !createdConv?.id) {
      console.error("[inbox-storage] Failed to insert new conversation", {
        error: convErr?.message,
        code: convErr?.code,
        details: convErr?.details,
        wa_id: message.from,
      });
      // In case of concurrent race condition on wa_id unique key, fetch it
      const { data: fallbackConv } = await supabase
        .from("whatsapp_conversations")
        .select("id")
        .eq("wa_id", message.from)
        .maybeSingle();

      if (fallbackConv?.id) {
        conversationId = String(fallbackConv.id);
      } else {
        return { ok: false, status: "error", reason: "conversation_create_failed" };
      }
    } else {
      conversationId = String(createdConv.id);
    }
  }

  // 3. Process WhatsApp Flow (nfm_reply) if present
  let flowSubmitted = false;
  let flowData: Record<string, unknown> | null = null;
  if (message.flowResponse?.responseJson) {
    try {
      flowData = JSON.parse(message.flowResponse.responseJson) as Record<string, unknown>;
      flowSubmitted = true;
    } catch {
      flowData = { raw: message.flowResponse.responseJson };
    }
  }

  // 4. Insert message into whatsapp_messages
  const msgType = normalizeMessageType(message.type);
  const safeMeta: Record<string, unknown> = {
    profile_name: message.profileName,
    to_phone_number_id: message.toPhoneNumberId,
  };
  if (message.mediaId) safeMeta.media_id = message.mediaId;
  if (message.mimeType) safeMeta.mime_type = message.mimeType;
  if (message.filename) safeMeta.filename = message.filename;
  if (flowSubmitted) {
    safeMeta.flow_name = message.flowResponse?.name ?? "DigiConnect Customer Support";
    safeMeta.flow_id = FLOW_CUSTOMER_SUPPORT_ID;
    safeMeta.flow_data = flowData;
  }

  const messageRow = {
    conversation_id: conversationId,
    customer_id: customerId,
    meta_message_id: message.messageId,
    provider_message_id: message.messageId,
    direction: "inbound",
    message_type: msgType,
    message_body: displayBody,
    media_id: message.mediaId ?? null,
    media_mime_type: message.mimeType ?? null,
    message_status: "received",
    status: "received",
    sender_type: "customer",
    recipient: message.toPhoneNumberId ?? "",
    timestamp: receivedAt,
    raw_metadata: safeMeta,
    safe_metadata: safeMeta,
    created_at: receivedAt,
  };

  const { data: insertedMsg, error: msgErr } = await supabase
    .from("whatsapp_messages")
    .insert(messageRow)
    .select("id")
    .single();

  if (msgErr || !insertedMsg?.id) {
    console.error("[inbox-storage] Failed to insert whatsapp_messages", {
      error: msgErr?.message,
      code: msgErr?.code,
      details: msgErr?.details,
      meta_message_id: message.messageId,
    });
    // If concurrent webhook delivery already inserted this exact meta_message_id, skip gracefully
    if (msgErr && (msgErr.code === "23505" || String(msgErr.message).includes("unique constraint") || String(msgErr.message).includes("duplicate key"))) {
      return { ok: true, status: "duplicate", conversationId, messageId: message.messageId };
    }
    return { ok: false, status: "error", reason: "message_insert_failed" };
  }

  const messageId = String(insertedMsg.id);

  // 5. If WhatsApp Flow submission, map to CRM lead & alert admin
  if (flowSubmitted) {
    const parsedFlow = parseCustomerSupportFlowResponse(
      message.flowResponse?.responseJson,
      message.profileName,
    );
    if (parsedFlow) {
      await syncFlowResponseToCrm({
        flow: parsedFlow,
        mobile: localMobile,
        messageId: message.messageId,
        conversationId,
        supabaseOverride: supabase,
      });
    } else {
      const flowTitle = message.flowResponse?.name || "Customer Support";
      const detail = flowData ? Object.entries(flowData).map(([k, v]) => `${k}: ${v}`).join(", ") : displayBody;
      await createAdminNotification(supabase, {
        type: "new_lead",
        title: `WhatsApp Flow: ${flowTitle}`,
        message: `${customerName} (${localMobile}): ${detail.slice(0, 150)}`,
        relatedType: "lead",
        relatedId: conversationId,
      });
    }
  }

  // 6. Handle Opt-in / Opt-out contact consents
  if (isOptOutMessage(message.text) && localMobile) {
    const { data: existingConsent } = await supabase
      .from("whatsapp_contact_consents")
      .select("id")
      .eq("phone_number", localMobile)
      .eq("consent_scope", "marketing")
      .maybeSingle();

    await supabase.from("whatsapp_contact_consents").upsert(
      {
        ...(existingConsent?.id ? { id: existingConsent.id } : {}),
        phone_number: localMobile,
        customer_id: customerId,
        consent_status: "opted_out",
        consent_scope: "marketing",
        consent_source: "whatsapp_stop_keyword",
        opted_out_at: now,
        evidence_reference: `wamid:${message.messageId}`,
        updated_at: now,
      },
      { onConflict: "phone_number,consent_scope" },
    );
  } else if (isOptInMessage(message.text) && localMobile) {
    const { data: existingConsent } = await supabase
      .from("whatsapp_contact_consents")
      .select("id")
      .eq("phone_number", localMobile)
      .eq("consent_scope", "marketing")
      .maybeSingle();

    await supabase.from("whatsapp_contact_consents").upsert(
      {
        ...(existingConsent?.id ? { id: existingConsent.id } : {}),
        phone_number: localMobile,
        customer_id: customerId,
        consent_status: "opted_in",
        consent_scope: "marketing",
        consent_source: "whatsapp_inbound_message",
        evidence_reference: `wamid:${message.messageId}`,
        updated_at: now,
      },
      { onConflict: "phone_number,consent_scope" },
    );
  }

  return {
    ok: true,
    status: "created",
    conversationId,
    messageId,
    flowSubmitted,
  };
}

export type StatusEventOutcome =
  | { ok: true; deduplicated: boolean; eventId: string | null; messageUpdated: boolean }
  | { ok: false; reason: string };

/**
 * Record delivery/read/failed status events from Meta webhooks into
 * whatsapp_message_events (deduplicated) and advance whatsapp_messages.
 */
export async function recordSharedInboxStatusEvent(
  event: MetaStatusEvent,
  supabaseOverride?: SupabaseClient | null,
): Promise<StatusEventOutcome> {
  const supabase = supabaseOverride ?? getSupabaseAdmin();
  if (!supabase) return { ok: false, reason: "supabase_unavailable" };

  const validStatuses = new Set(["sent", "delivered", "read", "failed"]);
  const normalizedStatus = validStatuses.has(event.status) ? event.status : "sent";
  const now = new Date().toISOString();
  const eventTime = event.timestamp ? new Date(Number(event.timestamp) * 1000).toISOString() : now;
  const safeError = event.errorMessage ? redactSecrets(event.errorMessage).slice(0, 300) : null;

  // 1. Check deduplication in whatsapp_message_events
  const { data: seenEvent } = await supabase
    .from("whatsapp_message_events")
    .select("id")
    .eq("meta_message_id", event.messageId)
    .eq("event_type", normalizedStatus)
    .maybeSingle();

  if (seenEvent) {
    return { ok: true, deduplicated: true, eventId: String(seenEvent.id), messageUpdated: false };
  }

  // 2. Correlate with whatsapp_messages
  const { data: matchedMessages } = await supabase
    .from("whatsapp_messages")
    .select("id, message_status, status")
    .or(`meta_message_id.eq.${event.messageId},provider_message_id.eq.${event.messageId}`)
    .limit(2);

  let matchedMessage = matchedMessages?.[0] ?? null;

  // If not matched by ID, check if there is an outbound message awaiting reconciliation (ambiguous timeout / status = unknown)
  if (!matchedMessage && event.recipientId) {
    const rawDest = String(event.recipientId).replace(/\D/g, "");
    const local10 = rawDest.length >= 10 ? rawDest.slice(-10) : rawDest;
    const dest91 = "91" + local10;

    const { data: unknownRows } = await supabase
      .from("whatsapp_messages")
      .select("id, message_status, status, created_at, recipient")
      .eq("direction", "outbound")
      .or(`recipient.eq.${rawDest},recipient.eq.${local10},recipient.eq.${dest91},recipient.eq.+${dest91}`)
      .or("status.eq.unknown,message_status.eq.unknown")
      .order("created_at", { ascending: true }) // Chronological matching: reconcile oldest unknown message first
      .limit(1);

    if (unknownRows?.[0]) {
      matchedMessage = unknownRows[0];
      await supabase
        .from("whatsapp_messages")
        .update({
          meta_message_id: event.messageId,
          provider_message_id: event.messageId,
          updated_at: now,
        })
        .eq("id", matchedMessage.id);
    }
  }

  // 3. Insert into whatsapp_message_events
  const eventRow = {
    message_id: matchedMessage ? String(matchedMessage.id) : null,
    meta_message_id: event.messageId,
    event_type: normalizedStatus,
    timestamp: eventTime,
    error_code: event.errorCode,
    error_message: safeError,
    raw_event: {
      status: event.status,
      errorCode: event.errorCode,
      errorMessage: safeError,
    },
    created_at: now,
  };

  const { data: insertedEvent } = await supabase
    .from("whatsapp_message_events")
    .insert(eventRow)
    .select("id")
    .single();

  let messageUpdated = false;

  // 4. Advance status on matched message if present
  if (matchedMessage) {
    const patch: Record<string, unknown> = {
      status: normalizedStatus,
      message_status: normalizedStatus,
      updated_at: now,
    };
    if (normalizedStatus === "delivered") patch.delivered_at = eventTime;
    if (normalizedStatus === "read") patch.read_at = eventTime;
    if (normalizedStatus === "failed") {
      patch.failed_at = eventTime;
      patch.error_details = safeError;
      if (event.errorCode) patch.failure_code = event.errorCode;
      if (safeError) patch.failure_summary = safeError;
    }

    const { error: updateErr } = await supabase
      .from("whatsapp_messages")
      .update(patch)
      .eq("id", matchedMessage.id);

    messageUpdated = !updateErr;
  }

  return {
    ok: true,
    deduplicated: false,
    eventId: insertedEvent?.id ? String(insertedEvent.id) : null,
    messageUpdated,
  };
}
