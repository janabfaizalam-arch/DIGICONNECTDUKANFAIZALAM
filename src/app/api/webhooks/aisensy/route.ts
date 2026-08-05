import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { redactSecrets } from "@/lib/whatsapp/aisensy";

export const dynamic = "force-dynamic";

function secretsEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  try {
    return timingSafeEqual(left, right);
  } catch {
    return false;
  }
}

function pickString(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return null;
}

function extractEvent(payload: unknown): {
  submittedMessageId: string | null;
  deliveryStatus: string | null;
  destination: string | null;
  errorCode: string | null;
  errorMessage: string | null;
} {
  const root =
    payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const nested =
    root.data && typeof root.data === "object"
      ? (root.data as Record<string, unknown>)
      : root.message && typeof root.message === "object"
        ? (root.message as Record<string, unknown>)
        : root;

  return {
    submittedMessageId: pickString(nested, [
      "submitted_message_id",
      "submittedMessageId",
      "message_id",
      "messageId",
      "id",
      "wamid",
    ]) || pickString(root, ["submitted_message_id", "submittedMessageId", "message_id", "messageId"]),
    deliveryStatus: pickString(nested, [
      "delivery_status",
      "deliveryStatus",
      "status",
      "message_status",
      "messageStatus",
    ]) || pickString(root, ["delivery_status", "deliveryStatus", "status"]),
    destination: pickString(nested, ["destination", "phone", "to", "wa_id", "waId"]) ||
      pickString(root, ["destination", "phone", "to"]),
    errorCode: pickString(nested, ["error_code", "errorCode", "code"]) ||
      pickString(root, ["error_code", "errorCode"]),
    errorMessage: pickString(nested, ["error_message", "errorMessage", "error", "reason"]) ||
      pickString(root, ["error_message", "errorMessage", "error"]),
  };
}

/**
 * Optional AiSensy / Meta delivery-status webhook.
 * Requires AISENSY_WEBHOOK_SECRET (header x-aisensy-webhook-secret or ?secret=).
 * Updates auth_otp_requests.metadata when submitted_message_id matches.
 */
export async function POST(request: Request) {
  const expected = process.env.AISENSY_WEBHOOK_SECRET?.trim();
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "Webhook not configured (AISENSY_WEBHOOK_SECRET)." },
      { status: 503 },
    );
  }

  const headerSecret =
    request.headers.get("x-aisensy-webhook-secret") ||
    request.headers.get("x-webhook-secret") ||
    "";
  const urlSecret = new URL(request.url).searchParams.get("secret") || "";
  const provided = headerSecret || urlSecret;
  if (!provided || !secretsEqual(provided, expected)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const event = extractEvent(payload);
  const safePreview = redactSecrets(JSON.stringify(payload)).slice(0, 600);

  console.info("[aisensy-webhook] received", {
    submitted_message_id: event.submittedMessageId,
    deliveryStatus: event.deliveryStatus,
    destination: event.destination
      ? `${String(event.destination).replace(/\D/g, "").slice(0, 4)}******`
      : null,
    errorCode: event.errorCode,
    preview: safePreview,
  });

  if (!event.submittedMessageId) {
    return NextResponse.json({
      ok: true,
      updated: false,
      reason: "No submitted_message_id in payload — logged only.",
    });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Service unavailable" }, { status: 503 });
  }

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

  if (!match) {
    return NextResponse.json({
      ok: true,
      updated: false,
      reason: "No matching auth_otp_requests row for submitted_message_id.",
      submitted_message_id: event.submittedMessageId,
    });
  }

  const previous =
    match.metadata && typeof match.metadata === "object"
      ? (match.metadata as Record<string, unknown>)
      : {};

  const normalizedStatus = (event.deliveryStatus || "unknown").toLowerCase();
  const { error } = await supabase
    .from("auth_otp_requests")
    .update({
      metadata: {
        ...previous,
        delivery_status: normalizedStatus,
        provider_delivery_status: event.deliveryStatus,
        provider_delivery_error_code: event.errorCode,
        provider_delivery_error: event.errorMessage
          ? redactSecrets(event.errorMessage).slice(0, 300)
          : null,
        provider_delivery_updated_at: new Date().toISOString(),
      },
    })
    .eq("id", match.id);

  if (error) {
    console.error("[aisensy-webhook] update_failed", { id: match.id, error: error.message });
    return NextResponse.json({ ok: false, error: "Failed to update OTP metadata" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    updated: true,
    otpRequestId: match.id,
    submitted_message_id: event.submittedMessageId,
    deliveryStatus: normalizedStatus,
  });
}
