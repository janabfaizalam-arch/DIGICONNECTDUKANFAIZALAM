import { NextResponse } from "next/server";

import { applyProviderDeliveryEvent } from "@/lib/communications/delivery-status";
import { secretsEqual } from "@/lib/communications/secrets";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { parseMetaStatusEvents, verifyMetaSignature } from "@/lib/whatsapp/meta-cloud";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Meta WhatsApp Cloud API webhook.
 *
 * GET  — the one-time "Verify and save" handshake from the Meta app
 *        dashboard: echo hub.challenge when hub.verify_token matches
 *        META_WHATSAPP_WEBHOOK_VERIFY_TOKEN.
 * POST — delivery statuses (sent / delivered / read / failed). Accepted only
 *        with a valid X-Hub-Signature-256 made with META_APP_SECRET.
 */
export async function GET(request: Request) {
  const expected = process.env.META_WHATSAPP_WEBHOOK_VERIFY_TOKEN?.trim() ?? "";
  if (expected.length < 16) {
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

  const events = parseMetaStatusEvents(payload);
  let updated = 0;
  for (const event of events) {
    const result = await applyProviderDeliveryEvent("meta", {
      providerMessageId: event.messageId,
      providerEventId: `${event.messageId}:${event.status}`,
      deliveryStatus: event.status,
      errorCode: event.errorCode,
      errorMessage: event.errorMessage,
    });
    if (result.outboxUpdated || result.otpDeliveryMetaUpdated) updated += 1;
  }

  if (events.length) console.info("[meta-webhook] statuses", { received: events.length, updated });
  // Always 200 once authenticated, or Meta keeps retrying the same batch.
  return NextResponse.json({ ok: true, received: events.length, updated });
}
