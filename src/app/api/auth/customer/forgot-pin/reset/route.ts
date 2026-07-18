import { NextResponse } from "next/server";
import { z } from "zod";

import { consumeVerificationToken } from "@/lib/auth/otp-store";
import { customerInternalEmail, normalizeIndianPhone } from "@/lib/auth/phone";
import { derivePinPassword, validateCustomerPin } from "@/lib/auth/pin";
import { getClientIp, getUserAgent } from "@/lib/auth/request-meta";
import { logAuthSecurityEvent } from "@/lib/auth/security-log";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const schema = z.object({
  phone: z.string().trim().min(10).max(20),
  verificationToken: z.string().min(20),
  pin: z.string(),
  confirmPin: z.string(),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    if (body.pin !== body.confirmPin) {
      return NextResponse.json({ error: "PIN aur Confirm PIN match nahi karte." }, { status: 400 });
    }

    const phone = normalizeIndianPhone(body.phone);
    if (!phone.ok) {
      return NextResponse.json({ error: phone.error }, { status: 400 });
    }

    const pinCheck = validateCustomerPin(body.pin, phone.local);
    if (!pinCheck.ok) {
      return NextResponse.json({ error: pinCheck.error }, { status: 400 });
    }

    const tokenResult = await consumeVerificationToken({
      phoneLocal: phone.local,
      purpose: "forgot_pin",
      verificationToken: body.verificationToken,
    });
    if (!tokenResult.ok) {
      return NextResponse.json({ error: tokenResult.error }, { status: tokenResult.status });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("phone", phone.local)
      .eq("role", "customer")
      .maybeSingle();

    if (!profile) {
      return NextResponse.json({ error: "Unable to reset PIN" }, { status: 400 });
    }

    const password = derivePinPassword(phone.local, body.pin);
    const { error } = await supabase.auth.admin.updateUserById(profile.id as string, {
      password,
      email: customerInternalEmail(phone.local),
    });

    if (error) {
      return NextResponse.json({ error: "PIN reset failed" }, { status: 500 });
    }

    await supabase.auth.admin.signOut(profile.id as string, "global");

    await supabase
      .from("profiles")
      .update({
        failed_login_attempts: 0,
        locked_until: null,
      })
      .eq("id", profile.id);

    await logAuthSecurityEvent({
      userId: profile.id as string,
      phone: phone.local,
      eventType: "pin_reset_success",
      ip: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json({ ok: true, redirectTo: "/customer/login" });
  } catch (error) {
    if (error instanceof Error && error.message.includes("AUTH_HMAC_SECRET")) {
      return NextResponse.json({ error: "Server auth misconfigured" }, { status: 503 });
    }
    return NextResponse.json({ error: "PIN reset failed" }, { status: 500 });
  }
}
