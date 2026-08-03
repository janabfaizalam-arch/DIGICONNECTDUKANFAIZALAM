import { NextResponse } from "next/server";
import { z } from "zod";

import { verifyOtpRequest } from "@/lib/auth/otp-store";
import { normalizeIndianPhone } from "@/lib/auth/phone";
import { getClientIp, getUserAgent } from "@/lib/auth/request-meta";
import { logAuthSecurityEvent } from "@/lib/auth/security-log";

export const dynamic = "force-dynamic";

const schema = z.object({
  phone: z.string().trim().min(10).max(20),
  otp: z.string().regex(/^\d{6}$/),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const phone = normalizeIndianPhone(body.phone);
    if (!phone.ok) {
      return NextResponse.json({ error: phone.error }, { status: 400 });
    }

    const result = await verifyOtpRequest({
      phoneLocal: phone.local,
      purpose: "customer_signup",
      otp: body.otp,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    await logAuthSecurityEvent({
      phone: phone.local,
      eventType: "signup_otp_verified",
      ip: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json({
      ok: true,
      verificationToken: result.verificationToken,
      maskedPhone: `+91 ${phone.local.slice(0, 2)}XXXXXX${phone.local.slice(-2)}`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid OTP payload" }, { status: 400 });
    }
    console.error("[verify-signup-otp] unexpected_error", error);
    return NextResponse.json({ error: "Unable to verify OTP" }, { status: 500 });
  }
}
