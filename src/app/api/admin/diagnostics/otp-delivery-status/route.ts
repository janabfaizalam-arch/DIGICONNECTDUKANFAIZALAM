import { NextResponse } from "next/server";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function maskPhone(local: string | null | undefined): string | null {
  if (!local || local.length !== 10) return local ? "********" : null;
  return `${local.slice(0, 2)}******${local.slice(-2)}`;
}

/**
 * Admin-only diagnostic for WhatsApp OTP delivery after Meta accepted the send.
 * Looks up auth_otp_requests by submitted_message_id (Meta wamid) / provider_request_id,
 * then the latest status the Meta webhook recorded for that message
 * (communication_delivery_events). Meta has no "get status by id" API.
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

  let providerStatus: {
    ok: boolean;
    submittedMessageId: string;
    source: "meta_webhook" | "unavailable";
    deliveryStatus: string | null;
    failureCode: string | null;
    failureSummary: string | null;
    receivedAt: string | null;
    guidance: string;
  } = {
    ok: false,
    submittedMessageId: idForStatus,
    source: "unavailable",
    deliveryStatus: null,
    failureCode: null,
    failureSummary: null,
    receivedAt: null,
    guidance: idForStatus
      ? "No delivery report from Meta yet for this message. If it stays empty for a few minutes, check the template status in WhatsApp Manager and that the webhook's messages field is subscribed."
      : "No WhatsApp message id available. Pass submittedMessageId (the wamid) explicitly.",
  };

  if (idForStatus && supabase) {
    const { data: events } = await supabase
      .from("communication_delivery_events")
      .select("raw_status, normalized_status, failure_code, failure_summary, received_at")
      .eq("provider_message_id", idForStatus)
      .order("received_at", { ascending: false })
      .limit(5);
    const latest = events?.[0];
    if (latest) {
      providerStatus = {
        ok: true,
        submittedMessageId: idForStatus,
        source: "meta_webhook",
        deliveryStatus: String(latest.normalized_status ?? latest.raw_status ?? "") || null,
        failureCode: latest.failure_code ?? null,
        failureSummary: latest.failure_summary ?? null,
        receivedAt: latest.received_at ?? null,
        guidance:
          latest.normalized_status === "failed"
            ? "WhatsApp refused delivery — see the failure code (e.g. 131026 = number not on WhatsApp, 132001 = template missing)."
            : "Reported by the Meta webhook. Delivered/read confirms the customer received it.",
      };
    }
  }

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
          template: stored.metadata.template ?? stored.metadata.campaign ?? null,
          provider: stored.metadata.provider ?? null,
          note:
            storedDelivery === "sent"
              ? "Our DB marks 'sent' when Meta's API accepts — not when WhatsApp shows Delivered."
              : null,
        }
      : null,
    providerStatus,
    checklist: [
      "Template (signup_otp / login_otp / password_reset) exists in WhatsApp Manager, category Authentication, status Approved",
      "Template language matches META_WHATSAPP_TEMPLATE_LANGUAGE (or the per-template override) exactly",
      "Copy-code button carries the same OTP as {{1}}",
      "Recipient number is on WhatsApp and has not blocked the business number",
      "WhatsApp Manager → Overview: number connected, quality rating and messaging limit OK, payment method valid",
      "Meta app webhook points at /api/webhooks/meta-whatsapp with the messages field subscribed",
    ],
  });
}
