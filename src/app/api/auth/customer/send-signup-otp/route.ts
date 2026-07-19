import { NextResponse } from "next/server";
import { z } from "zod";

import { customerMobileAlreadyRegistered } from "@/lib/auth/customer-lookup";
import { createAndSendOtp } from "@/lib/auth/otp-store";
import { normalizeIndianPhone } from "@/lib/auth/phone";
import { getClientIp, getUserAgent } from "@/lib/auth/request-meta";
import { logAuthSecurityEvent } from "@/lib/auth/security-log";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const schema = z.object({
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(10).max(20),
  address: z.string().trim().min(5).max(500),
  pincode: z.string().trim().regex(/^\d{6}$/),
  district: z.string().trim().min(2).max(100),
  state: z.string().trim().min(2).max(100),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const phone = normalizeIndianPhone(body.phone);
    if (!phone.ok) {
      return NextResponse.json({ error: phone.error }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
    }

    if (await customerMobileAlreadyRegistered(phone.local)) {
      return NextResponse.json(
        {
          error:
            "Is WhatsApp number se account pehle se registered hai. Login karein ya Forgot / Create PIN use karein.",
          redirectTo: "/customer/forgot-pin",
        },
        { status: 409 },
      );
    }

    const ip = getClientIp(request);
    const userAgent = getUserAgent(request);

    const result = await createAndSendOtp({
      phoneE164: phone.e164,
      phoneLocal: phone.local,
      purpose: "customer_signup",
      ip,
      userAgent,
      metadata: {
        fullName: body.fullName,
        address: body.address,
        pincode: body.pincode,
        district: body.district,
        state: body.state,
      },
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    await logAuthSecurityEvent({
      phone: phone.local,
      eventType: "signup_otp_sent",
      ip,
      userAgent,
    });

    return NextResponse.json({
      ok: true,
      maskedPhone: `+91 ${phone.local.slice(0, 2)}XXXXXX${phone.local.slice(-2)}`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid signup details" }, { status: 400 });
    }
    console.error("[send-signup-otp]", error);
    return NextResponse.json({ error: "Unable to send OTP" }, { status: 500 });
  }
}
