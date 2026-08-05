import { NextResponse } from "next/server";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { lookupAisensyMessageStatus } from "@/lib/whatsapp/aisensy";

export const dynamic = "force-dynamic";

function maskPhone(local: string | null | undefined): string | null {
  if (!local || local.length !== 10) return local ? "********" : null;
  return `${local.slice(0, 2)}******${local.slice(-2)}`;
}

/**
 * Admin-only diagnostic for AiSensy OTP delivery after API accept.
 * Looks up auth_otp_requests by submitted_message_id / provider_request_id,
 * then optionally calls AISENSY_MESSAGE_STATUS_URL when configured.
 *
 * Never returns OTP codes.
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isAdminRole(await getCurrentUserRole(user))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const submittedMessageId = (
    url.searchParams.get("submittedMessageId") ||
    url.searchParams.get("submitted_message_id") ||
    ""
  ).trim();
  const providerRequestId = (
    url.searchParams.get("providerRequestId") ||
    url.searchParams.get("requestId") ||
    ""
  ).trim();

  if (!submittedMessageId && !providerRequestId) {
    return NextResponse.json(
      {
        ok: false,
        error: "Provide submittedMessageId and/or providerRequestId (our request UUID).",
        code: "MISSING_ID",
      },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdmin();
  let stored: {
    otpRequestId: string;
    purpose: string | null;
    phoneMasked: string | null;
    createdAt: string | null;
    metadata: Record<string, unknown>;
  } | null = null;

  if (supabase) {
    const { data: rows } = await supabase
      .from("auth_otp_requests")
      .select("id, purpose, phone, created_at, metadata")
      .order("created_at", { ascending: false })
      .limit(40);

    const match = (rows ?? []).find((row) => {
      const meta =
        row.metadata && typeof row.metadata === "object"
          ? (row.metadata as Record<string, unknown>)
          : {};
      if (submittedMessageId && String(meta.submitted_message_id ?? "") === submittedMessageId) {
        return true;
      }
      if (providerRequestId && String(meta.provider_request_id ?? "") === providerRequestId) {
        return true;
      }
      return false;
    });

    if (match) {
      stored = {
        otpRequestId: String(match.id),
        purpose: match.purpose ?? null,
        phoneMasked: maskPhone(match.phone),
        createdAt: match.created_at ?? null,
        metadata: (match.metadata && typeof match.metadata === "object"
          ? match.metadata
          : {}) as Record<string, unknown>,
      };
    }
  }

  const idForStatus =
    submittedMessageId ||
    (typeof stored?.metadata.submitted_message_id === "string"
      ? stored.metadata.submitted_message_id
      : "");

  const providerStatus = idForStatus
    ? await lookupAisensyMessageStatus(idForStatus)
    : {
        ok: false,
        submittedMessageId: "",
        source: "unavailable" as const,
        httpStatus: null,
        deliveryStatus: null,
        providerBodyPreview: null,
        guidance:
          "No submitted_message_id available. Re-send OTP after deploy so metadata stores AiSensy id, or pass submittedMessageId explicitly.",
      };

  const storedDelivery =
    typeof stored?.metadata.delivery_status === "string" ? stored.metadata.delivery_status : null;

  console.info("[admin-otp-delivery] lookup", {
    adminId: user.id,
    submittedMessageId: idForStatus || null,
    providerRequestId: providerRequestId || null,
    foundStored: Boolean(stored),
    storedDelivery,
    providerSource: providerStatus.source,
    providerDeliveryStatus: providerStatus.deliveryStatus,
  });

  return NextResponse.json({
    ok: true,
    submittedMessageId: idForStatus || null,
    providerRequestId: providerRequestId || stored?.metadata.provider_request_id || null,
    stored: stored
      ? {
          otpRequestId: stored.otpRequestId,
          purpose: stored.purpose,
          phoneMasked: stored.phoneMasked,
          createdAt: stored.createdAt,
          deliveryStatus: storedDelivery,
          campaign: stored.metadata.campaign ?? null,
          provider: stored.metadata.provider ?? null,
          note:
            storedDelivery === "sent"
              ? "Our DB marks 'sent' when AiSensy API accepts — not when WhatsApp shows Delivered."
              : null,
        }
      : null,
    providerStatus,
    checklist: [
      "AiSensy campaign signup_otp is Live and API-enabled",
      "Linked template is Authentication category, Approved, correct language",
      "Test Campaign cURL templateParams length/order matches our payload (default: [OTP] only)",
      "Copy-code button param includes the same OTP (default buttonMode=url)",
      "Contact not opted-out / blocklisted in AiSensy",
      "WABA phone number connected; no Meta delivery / quality / pacing errors",
      "Confirm Delivered in Campaign → Sent for this submitted_message_id",
    ],
  });
}
