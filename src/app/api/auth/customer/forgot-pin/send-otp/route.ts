import { NextResponse } from "next/server";
import { z } from "zod";

import { createAndSendOtp } from "@/lib/auth/otp-store";
import { normalizeIndianPhone } from "@/lib/auth/phone";
import { getClientIp, getUserAgent } from "@/lib/auth/request-meta";
import { logAuthSecurityEvent } from "@/lib/auth/security-log";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const schema = z.object({
  phone: z.string().trim().min(10).max(20),
});

const GENERIC =
  "Agar is number se account registered hai, to WhatsApp par OTP bhej diya gaya hai.";

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

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role, account_status")
      .eq("mobile", phone.local)
      .eq("role", "customer")
      .maybeSingle();

    const ip = getClientIp(request);
    const userAgent = getUserAgent(request);

    if (profile && profile.account_status !== "blocked") {
      const result = await createAndSendOtp({
        phoneE164: phone.e164,
        phoneLocal: phone.local,
        purpose: "forgot_pin",
        ip,
        userAgent,
        metadata: { userId: profile.id },
      });

      if (!result.ok && result.status === 429) {
        return NextResponse.json({ error: result.error }, { status: 429 });
      }

      await logAuthSecurityEvent({
        userId: profile.id as string,
        phone: phone.local,
        eventType: "forgot_pin_otp_sent",
        ip,
        userAgent,
      });
    } else {
      await logAuthSecurityEvent({
        phone: phone.local,
        eventType: "forgot_pin_otp_probe",
        ip,
        userAgent,
      });
    }

    return NextResponse.json({ ok: true, message: GENERIC });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid phone" }, { status: 400 });
    }
    return NextResponse.json({ error: "Unable to process request" }, { status: 500 });
  }
}
