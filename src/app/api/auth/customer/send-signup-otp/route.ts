import { NextResponse } from "next/server";
import { z } from "zod";

import { customerMobileAlreadyRegistered } from "@/lib/auth/customer-lookup";
import { createAndSendOtp } from "@/lib/auth/otp-store";
import { maskPhone, normalizeIndianPhone } from "@/lib/auth/phone";
import { getClientIp, getUserAgent } from "@/lib/auth/request-meta";
import { logAuthSecurityEvent } from "@/lib/auth/security-log";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const PURPOSE = "customer_signup" as const;
const ROUTE = "/api/auth/customer/send-signup-otp";

const schema = z.object({
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(10).max(20),
  address: z.string().trim().min(5).max(500),
  pincode: z.string().trim().regex(/^\d{6}$/),
  district: z.string().trim().min(2).max(100),
  state: z.string().trim().min(2).max(100),
});

function newRequestId(): string {
  return `signup_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function POST(request: Request) {
  const requestId = newRequestId();

  try {
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      console.warn("[signup-otp] validation_failed", {
        requestId,
        purpose: PURPOSE,
        reason: "invalid_json",
      });
      return NextResponse.json(
        { ok: false, error: "Invalid JSON body", code: "INVALID_JSON", requestId },
        { status: 400 },
      );
    }

    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      console.warn("[signup-otp] validation_failed", {
        requestId,
        purpose: PURPOSE,
        reason: "schema",
      });
      return NextResponse.json(
        { ok: false, error: "Invalid signup details", code: "INVALID_DETAILS", requestId },
        { status: 400 },
      );
    }

    const body = parsed.data;
    const phone = normalizeIndianPhone(body.phone);
    if (!phone.ok) {
      console.warn("[signup-otp] validation_failed", {
        requestId,
        purpose: PURPOSE,
        reason: "phone",
      });
      return NextResponse.json(
        { ok: false, error: phone.error, code: "INVALID_PHONE", requestId },
        { status: 400 },
      );
    }

    const masked = maskPhone(phone.local);
    console.info("[signup-otp] request_received", {
      requestId,
      purpose: PURPOSE,
      route: ROUTE,
      maskedPhone: masked,
    });

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      console.error("[signup-otp] send_failed", {
        requestId,
        purpose: PURPOSE,
        code: "SERVICE_UNAVAILABLE",
        maskedPhone: masked,
      });
      return NextResponse.json(
        { ok: false, error: "Service unavailable", code: "SERVICE_UNAVAILABLE", requestId },
        { status: 503 },
      );
    }

    if (await customerMobileAlreadyRegistered(phone.local)) {
      console.warn("[signup-otp] validation_failed", {
        requestId,
        purpose: PURPOSE,
        reason: "already_registered",
        maskedPhone: masked,
      });
      return NextResponse.json(
        {
          ok: false,
          error:
            "Is WhatsApp number se account pehle se registered hai. Login karein ya Forgot / Create PIN use karein.",
          code: "ALREADY_REGISTERED",
          redirectTo: "/customer/forgot-pin",
          requestId,
        },
        { status: 409 },
      );
    }

    const ip = getClientIp(request);
    const userAgent = getUserAgent(request);

    console.info("[signup-otp] otp_generated", {
      requestId,
      purpose: PURPOSE,
      maskedPhone: masked,
      note: "otp_created_in_store_pending_provider",
    });

    console.info("[signup-otp] provider_call_started", {
      requestId,
      purpose: PURPOSE,
      maskedPhone: masked,
    });

    const result = await createAndSendOtp({
      phoneE164: phone.e164,
      phoneLocal: phone.local,
      purpose: PURPOSE,
      ip,
      userAgent,
      metadata: {
        fullName: body.fullName,
        address: body.address,
        pincode: body.pincode,
        district: body.district,
        state: body.state,
        clientRequestId: requestId,
      },
    });

    if (!result.ok) {
      console.error("[signup-otp] send_failed", {
        requestId,
        purpose: PURPOSE,
        maskedPhone: masked,
        status: result.status,
        error: result.error,
      });
      console.error("[signup-otp] provider_call_result", {
        requestId,
        purpose: PURPOSE,
        accepted: false,
        httpStatus: result.status,
      });
      return NextResponse.json(
        {
          ok: false,
          error: result.error,
          code: result.status === 429 ? "RATE_LIMITED" : "OTP_SEND_FAILED",
          requestId,
        },
        { status: result.status },
      );
    }

    console.info("[signup-otp] provider_call_result", {
      requestId,
      purpose: PURPOSE,
      accepted: true,
      providerRequestId: result.requestId,
      campaignName: result.campaignName,
    });

    console.info("[signup-otp] send_accepted", {
      requestId,
      purpose: PURPOSE,
      maskedPhone: masked,
      providerRequestId: result.requestId,
      campaignName: result.campaignName,
    });

    await logAuthSecurityEvent({
      phone: phone.local,
      eventType: "signup_otp_sent",
      ip,
      userAgent,
    });

    return NextResponse.json({
      ok: true,
      success: true,
      maskedPhone: masked,
      requestId,
    });
  } catch (error) {
    console.error("[signup-otp] unexpected_error", {
      requestId,
      purpose: PURPOSE,
      error: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { ok: false, error: "Unable to send OTP", code: "UNEXPECTED_ERROR", requestId },
      { status: 500 },
    );
  }
}
