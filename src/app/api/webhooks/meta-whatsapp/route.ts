import { NextResponse } from "next/server";

import { applyProviderDeliveryEvent } from "@/lib/communications/delivery-status";
import { WHATSAPP_PROVIDER } from "@/lib/communications/provider-adapter";
import { secretsEqual } from "@/lib/communications/secrets";
import { recordInboundWhatsAppMessage } from "@/lib/crm/whatsapp-inbound";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { parseMetaInboundMessages, parseMetaStatusEvents, verifyMetaSignature } from "@/lib/whatsapp/meta-cloud";
import { recordInboundInboxMessage, recordSharedInboxStatusEvent } from "@/lib/whatsapp/inbox-storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Meta WhatsApp Cloud API webhook — public by design: Meta calls it with no
 * session or JWT (middleware passes /api/* through untouched). It is
 * protected by Meta's own mechanisms instead:
 *
 * GET  — the "Verify and save" handshake: echo hub.challenge when
 *        hub.mode=subscribe and hub.verify_token equals
 *        META_WHATSAPP_WEBHOOK_VERIFY_TOKEN; otherwise 403.
 * POST — only with a valid X-Hub-Signature-256 (HMAC-SHA256 of the raw body
 *        with META_APP_SECRET). Applies delivery statuses to the outbox and
 *        puts customer messages into the CRM, both idempotent on the wamid.
 *        Answers 200 once handled; 500 only when an inbound message could not
 *        be stored, so Meta redelivers it.
 *
 * Nothing here logs a secret, a token or a message body.
 */
export async function GET(request: Request) {
  const expected = process.env.META_WHATSAPP_WEBHOOK_VERIFY_TOKEN?.trim() ?? "";
  if (!expected) {
    return NextResponse.json({ ok: false, error: "Webhook not configured." }, { status: 503 });
  }
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token") ?? "";
  const challenge = url.searchParams.get("hub.challenge") ?? "";
  if (mode === "subscribe" && token && secretsEqual(token, expected) && /^[\w-]{1,200}$/.test(challenge)) {
    return new NextResponse(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
}

export async function POST(request: Request) {
  const rate = checkRateLimit(`meta-webhook:${getClientIp(request)}`, 600, 60_000);
  if (!rate.ok) return rateLimitResponse(rate.retryAfter);

  const appSecret = process.env.META_APP_SECRET?.trim() ?? "";
  if (!appSecret) {
    return NextResponse.json({ ok: false, error: "Webhook not configured." }, { status: 503 });
  }

  const raw = await request.text();
  if (raw.length > 256_000) {
    return NextResponse.json({ ok: false, error: "Payload too large." }, { status: 413 });
  }
  if (!(await verifyMetaSignature(raw, request.headers.get("x-hub-signature-256"), appSecret))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = raw ? JSON.parse(raw) : null;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  // Only our own number — another number on the same WABA is not this app's traffic.
  const ownPhoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID?.trim() || null;
  const ownWabaId = process.env.META_WHATSAPP_WABA_ID?.trim() || null;

  // Known Phone Number / WABA IDs for DigiConnect Dukan (resilient to environment variable or Meta ID format differences)
  const KNOWN_PHONE_NUMBER_IDS = new Set(
    ["1303931342795977", "1500996433093294", ownPhoneNumberId, ownWabaId].filter(Boolean),
  );

  const statuses = parseMetaStatusEvents(payload);
  let statusesUpdated = 0;
  for (const event of statuses) {
    const result = await applyProviderDeliveryEvent(WHATSAPP_PROVIDER, {
      providerMessageId: event.messageId,
      providerEventId: `${event.messageId}:${event.status}`,
      deliveryStatus: event.status,
      errorCode: event.errorCode,
      errorMessage: event.errorMessage,
    });

    // Shared Inbox: track event deduplication and advance message status
    const inboxStatusResult = await recordSharedInboxStatusEvent(event);
    const inboxUpdated = "messageUpdated" in inboxStatusResult && Boolean(inboxStatusResult.messageUpdated);
    if (result.outboxUpdated || result.otpDeliveryMetaUpdated || inboxUpdated) {
      statusesUpdated += 1;
    }
  }

  const allInbound = parseMetaInboundMessages(payload);
  const inbound = allInbound.filter((message) => {
    if (!message.toPhoneNumberId) return true;
    if (KNOWN_PHONE_NUMBER_IDS.has(message.toPhoneNumberId)) return true;
    if (!ownPhoneNumberId) return true;
    return false;
  });

  console.info("[meta-webhook] received", {
    statusesCount: statuses.length,
    inboundTotal: allInbound.length,
    inboundAccepted: inbound.length,
    recipientPhoneIds: allInbound.map((m) => m.toPhoneNumberId),
  });
  const outcomes: Record<string, number> = {};
  let failed = 0;
  for (const message of inbound) {
    // 1. Existing CRM lead pipeline & timeline activity
    const outcome = await recordInboundWhatsAppMessage(message);
    outcomes[outcome.status] = (outcomes[outcome.status] ?? 0) + 1;
    if (outcome.status === "error") failed += 1;

    // 2. Shared Inbox conversation & message persistence
    const inboxOutcome = await recordInboundInboxMessage(message);
    if (!inboxOutcome.ok && inboxOutcome.status === "error") {
      failed += 1;
    }
  }

  if (statuses.length || inbound.length) {
    console.info("[meta-webhook] handled", {
      statuses: statuses.length,
      statusesUpdated,
      inbound: inbound.length,
      outcomes,
    });
  }

  if (failed) {
    // Meta retries non-2xx deliveries; everything above is idempotent, so a retry is safe.
    return NextResponse.json({ ok: false, error: "Inbound message not stored; retry." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, statuses: statuses.length, statusesUpdated, inbound: inbound.length });
}
