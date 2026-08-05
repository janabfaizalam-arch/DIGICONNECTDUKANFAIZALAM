import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { createAndSendOtp } from "@/lib/auth/otp-store";
import { maskPhone, normalizeIndianPhone } from "@/lib/auth/phone";
import { getClientIp, getUserAgent } from "@/lib/auth/request-meta";
import { checkRateLimit } from "@/lib/auth-v2/rate-limit";

export const dynamic = "force-dynamic";

const schema = z.object({
  phone: z.string().trim().min(10).max(20),
  /** Explicit confirmation required to send a real WhatsApp OTP. */
  confirm: z.literal(true),
});

/**
 * Admin-only test send for signup OTP (real WhatsApp delivery).
 * Rate-limited and audited via structured logs.
 */
export async function POST(request: Request) {
  const admin = await getCurrentUser();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!isAdminRole(await getCurrentUserRole(admin))) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const rate = checkRateLimit(`admin_otp_test_${admin.id}`, 3, 60 * 60 * 1000);
  if (!rate.success) {
    return NextResponse.json(
      { ok: false, error: "Too many test OTP sends. Try again later.", code: "RATE_LIMITED" },
      { status: 429 },
    );
  }

  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await request.json());
  } catch {
    return NextResponse.json(
      { ok: false, error: "Provide { phone, confirm: true }", code: "INVALID_BODY" },
      { status: 400 },
    );
  }

  const phone = normalizeIndianPhone(body.phone);
  if (!phone.ok) {
    return NextResponse.json({ ok: false, error: phone.error, code: "INVALID_PHONE" }, { status: 400 });
  }

  const masked = maskPhone(phone.local);
  console.info("[admin-otp-test] send_started", {
    adminId: admin.id,
    purpose: "customer_signup",
    maskedPhone: masked,
  });

  const result = await createAndSendOtp({
    phoneE164: phone.e164,
    phoneLocal: phone.local,
    purpose: "customer_signup",
    ip: getClientIp(request),
    userAgent: getUserAgent(request),
    metadata: { triggeredByAdminTest: admin.id },
  });

  if (!result.ok) {
    console.error("[admin-otp-test] send_failed", {
      adminId: admin.id,
      maskedPhone: masked,
      status: result.status,
      error: result.error,
    });
    return NextResponse.json(
      { ok: false, error: result.error, code: "OTP_SEND_FAILED" },
      { status: result.status },
    );
  }

  console.info("[admin-otp-test] send_accepted", {
    adminId: admin.id,
    maskedPhone: masked,
    providerRequestId: result.requestId,
    submitted_message_id: result.providerMessageId,
    campaignName: result.campaignName,
  });

  return NextResponse.json({
    ok: true,
    maskedPhone: masked,
    requestId: result.requestId,
    submittedMessageId: result.providerMessageId ?? null,
    campaignName: result.campaignName,
    note:
      "submittedMessageId is AiSensy accept id — confirm Delivered in Campaign → Sent or GET /api/admin/diagnostics/otp-delivery-status",
  });
}
