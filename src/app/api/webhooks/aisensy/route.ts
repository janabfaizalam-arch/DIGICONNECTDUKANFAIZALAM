import { NextResponse } from "next/server";

import { applyProviderDeliveryEvent } from "@/lib/communications/delivery-status";
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

  const applied = await applyProviderDeliveryEvent("aisensy", {
    providerMessageId: event.submittedMessageId,
    providerEventId: event.providerEventId,
    deliveryStatus: event.deliveryStatus,
    errorCode: event.errorCode,
    errorMessage: event.errorMessage,
  });
  if (!applied.ok) {
    return NextResponse.json({ ok: false, error: "Service unavailable" }, { status: 503 });
  }
  const { outboxUpdated, otpDeliveryMetaUpdated } = applied;

  return NextResponse.json({
    ok: true,
    updated: outboxUpdated || otpDeliveryMetaUpdated,
    outboxUpdated,
    otpDeliveryMetaUpdated,
  });
}
