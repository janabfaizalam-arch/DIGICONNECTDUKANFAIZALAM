import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { redactSecrets } from "@/lib/whatsapp/aisensy";
import {
  canAdvanceOutboxStatus,
  normalizeProviderDeliveryStatus,
} from "@/lib/communications/comms-core";
import { secretsEqual } from "@/lib/communications/secrets";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function pickString(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return null;
}

type DeliveryEvent = {
  submittedMessageId: string | null;
  providerEventId: string | null;
  deliveryStatus: string | null;
  destination: string | null;
  errorCode: string | null;
  errorMessage: string | null;
};

function parseDeliveryEvent(payload: unknown): { ok: true; event: DeliveryEvent } | { ok: false } {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false };
  }
  const root = payload as Record<string, unknown>;
  const nested =
    root.data && typeof root.data === "object" && !Array.isArray(root.data)
      ? (root.data as Record<string, unknown>)
      : root.message && typeof root.message === "object" && !Array.isArray(root.message)
        ? (root.message as Record<string, unknown>)
        : root;

  return {
    ok: true,
    event: {
      submittedMessageId:
        pickString(nested, [
          "submitted_message_id",
          "submittedMessageId",
          "message_id",
          "messageId",
          "wamid",
        ]) ||
        pickString(root, ["submitted_message_id", "submittedMessageId", "message_id", "messageId"]),
      providerEventId:
        pickString(nested, ["event_id", "eventId", "webhook_id", "webhookId"]) ||
        pickString(root, ["event_id", "eventId", "id"]),
      deliveryStatus:
        pickString(nested, [
          "delivery_status",
          "deliveryStatus",
          "status",
          "message_status",
          "messageStatus",
        ]) || pickString(root, ["delivery_status", "deliveryStatus", "status"]),
      destination:
        pickString(nested, ["destination", "phone", "to", "wa_id", "waId"]) ||
        pickString(root, ["destination", "phone", "to"]),
      errorCode:
        pickString(nested, ["error_code", "errorCode", "code"]) ||
        pickString(root, ["error_code", "errorCode"]),
      errorMessage:
        pickString(nested, ["error_message", "errorMessage", "error", "reason"]) ||
        pickString(root, ["error_message", "errorMessage", "error"]),
    },
  };
}

/**
 * AiSensy delivery-status webhook.
 * Auth: x-aisensy-webhook-secret or x-webhook-secret header only (shared secret).
 * Query-string secrets are rejected. No cryptographic signature is invented.
 * OTP path: updates delivery_* metadata only — never OTP codes/hashes/verification flags.
 */
export async function POST(request: Request) {
  const rate = checkRateLimit(`aisensy-webhook:${getClientIp(request)}`, 120, 60_000);
  if (!rate.ok) return rateLimitResponse(rate.retryAfter);

  const url = new URL(request.url);
  if (url.searchParams.has("secret") || url.searchParams.has("token") || url.searchParams.has("key")) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const expected = process.env.AISENSY_WEBHOOK_SECRET?.trim() ?? "";
  if (!expected || expected.length < 16) {
    return NextResponse.json({ ok: false, error: "Webhook not configured." }, { status: 503 });
  }

  const provided =
    request.headers.get("x-aisensy-webhook-secret") ||
    request.headers.get("x-webhook-secret") ||
    "";
  if (!provided || !secretsEqual(provided, expected)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 64_000) {
    return NextResponse.json({ ok: false, error: "Payload too large." }, { status: 413 });
  }

  let payload: unknown;
  try {
    const text = await request.text();
    if (text.length > 64_000) {
      return NextResponse.json({ ok: false, error: "Payload too large." }, { status: 413 });
    }
    payload = text ? JSON.parse(text) : null;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parseDeliveryEvent(payload);
  if (!parsed.ok) {
    return NextResponse.json({ ok: true, updated: false, reason: "invalid_schema" });
  }
  const event = parsed.event;

  console.info("[aisensy-webhook] received", {
    hasMessageId: Boolean(event.submittedMessageId),
    deliveryStatus: event.deliveryStatus,
    destinationMasked: event.destination
      ? `${String(event.destination).replace(/\D/g, "").slice(0, 2)}******`
      : null,
    errorCode: event.errorCode,
  });

  if (!event.submittedMessageId) {
    return NextResponse.json({
      ok: true,
      updated: false,
      reason: "unknown_event",
    });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Service unavailable" }, { status: 503 });
  }

  const providerEventId =
    event.providerEventId || `${event.submittedMessageId}:${event.deliveryStatus || "status"}`;

  await supabase.from("communication_delivery_events").upsert(
    {
      provider: "aisensy",
      provider_event_id: providerEventId,
      provider_message_id: event.submittedMessageId,
      raw_status: event.deliveryStatus,
      normalized_status: normalizeProviderDeliveryStatus(event.deliveryStatus),
      failure_code: event.errorCode,
      failure_summary: event.errorMessage ? redactSecrets(event.errorMessage).slice(0, 300) : null,
    },
    { onConflict: "provider,provider_event_id", ignoreDuplicates: true },
  );

  // Correlate outbox — refuse ambiguous multi-row matches (legacy duplicate provider IDs)
  const { data: matches } = await supabase
    .from("whatsapp_messages")
    .select("id, status")
    .eq("provider_message_id", event.submittedMessageId)
    .limit(3);

  let outboxUpdated = false;
  const normalized = normalizeProviderDeliveryStatus(event.deliveryStatus);

  if ((matches?.length ?? 0) > 1) {
    console.error("[aisensy-webhook] ambiguous_provider_message_id", {
      code: "ambiguous_provider_message_id",
      matchCount: matches?.length,
    });
  } else if (matches?.length === 1 && normalized) {
    const outbox = matches[0];
    if (canAdvanceOutboxStatus(String(outbox.status), normalized)) {
      const patch: Record<string, unknown> = {
        status: normalized,
        provider_status: event.deliveryStatus,
        updated_at: new Date().toISOString(),
      };
      if (normalized === "delivered") patch.delivered_at = new Date().toISOString();
      if (normalized === "read") patch.read_at = new Date().toISOString();
      if (normalized === "failed") {
        patch.failed_at = new Date().toISOString();
        patch.failure_code = event.errorCode;
        patch.failure_summary = event.errorMessage
          ? redactSecrets(event.errorMessage).slice(0, 300)
          : null;
      }
      const { error } = await supabase
        .from("whatsapp_messages")
        .update(patch)
        .eq("id", outbox.id)
        .eq("provider_message_id", event.submittedMessageId);
      outboxUpdated = !error;
      if (outboxUpdated) {
        await supabase
          .from("communication_delivery_events")
          .update({ outbox_id: outbox.id })
          .eq("provider", "aisensy")
          .eq("provider_event_id", providerEventId);
      }
    }
  }

  // OTP delivery metadata only — never touch code/hash/verified/consumed authentication fields
  let otpDeliveryMetaUpdated = false;
  if (event.deliveryStatus) {
    const { data: rows } = await supabase
      .from("auth_otp_requests")
      .select("id, metadata")
      .order("created_at", { ascending: false })
      .limit(50);

    const match = (rows ?? []).find((row) => {
      const meta =
        row.metadata && typeof row.metadata === "object"
          ? (row.metadata as Record<string, unknown>)
          : {};
      return String(meta.submitted_message_id ?? "") === event.submittedMessageId;
    });

    if (match) {
      const previous =
        match.metadata && typeof match.metadata === "object"
          ? (match.metadata as Record<string, unknown>)
          : {};
      const { error } = await supabase
        .from("auth_otp_requests")
        .update({
          metadata: {
            ...previous,
            delivery_status: String(event.deliveryStatus).toLowerCase(),
            provider_delivery_status: event.deliveryStatus,
            provider_delivery_error_code: event.errorCode,
            provider_delivery_error: event.errorMessage
              ? redactSecrets(event.errorMessage).slice(0, 300)
              : null,
            provider_delivery_updated_at: new Date().toISOString(),
          },
        })
        .eq("id", match.id);
      otpDeliveryMetaUpdated = !error;
    }
  }

  return NextResponse.json({
    ok: true,
    updated: outboxUpdated || otpDeliveryMetaUpdated,
    outboxUpdated,
    otpDeliveryMetaUpdated,
  });
}
