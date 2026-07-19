import { NextResponse } from "next/server";
import { z } from "zod";

import { findExistingCustomerByMobile } from "@/lib/auth/customer-lookup";
import { customerInternalEmail, normalizeIndianPhone } from "@/lib/auth/phone";
import { derivePinPassword, isValidPinFormat } from "@/lib/auth/pin";
import { getClientIp, getUserAgent } from "@/lib/auth/request-meta";
import { logAuthSecurityEvent } from "@/lib/auth/security-log";
import { signInWithPasswordCookies } from "@/lib/auth/session-cookies";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const LOCK_AFTER = 5;
const LOCK_MINUTES = 15;

const schema = z.object({
  phone: z.string().trim().min(10).max(20),
  pin: z.string(),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const phone = normalizeIndianPhone(body.phone);
    if (!phone.ok) {
      return NextResponse.json({ error: phone.error }, { status: 400 });
    }
    if (!isValidPinFormat(body.pin)) {
      return NextResponse.json({ error: "PIN exactly 6 digits hona chahiye." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
    }

    const genericError = "WhatsApp number ya PIN galat hai.";
    const lookup = await findExistingCustomerByMobile(phone.local);

    if (!lookup.ok) {
      if (lookup.reason === "ambiguous") {
        return NextResponse.json({ error: lookup.message }, { status: 409 });
      }
      await logAuthSecurityEvent({
        phone: phone.local,
        eventType: "login_failed_unknown_phone",
        ip: getClientIp(request),
        userAgent: getUserAgent(request),
      });
      return NextResponse.json({ error: genericError }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role, account_status, failed_login_attempts, locked_until, phone_verified")
      .eq("id", lookup.profileId)
      .maybeSingle();

    if (!profile) {
      await logAuthSecurityEvent({
        phone: phone.local,
        eventType: "login_failed_unknown_phone",
        ip: getClientIp(request),
        userAgent: getUserAgent(request),
      });
      return NextResponse.json({ error: genericError }, { status: 401 });
    }

    if (String(profile.role) !== "customer") {
      return NextResponse.json({ error: genericError }, { status: 401 });
    }

    if (profile.account_status === "blocked" || profile.account_status === "suspended") {
      return NextResponse.json({ error: "Aapka account suspended/blocked hai. Support se contact karein." }, { status: 403 });
    }

    if (profile.locked_until && new Date(profile.locked_until).getTime() > Date.now()) {
      return NextResponse.json(
        { error: "Bahut galat attempts. Account thodi der ke liye lock hai. Forgot / Create PIN try karein." },
        { status: 423 },
      );
    }

    const email = customerInternalEmail(phone.local);
    const password = derivePinPassword(phone.local, body.pin);
    const session = await signInWithPasswordCookies(email, password);

    if (session.error) {
      const attempts = Number(profile.failed_login_attempts ?? 0) + 1;
      const updates: Record<string, unknown> = { failed_login_attempts: attempts };
      if (attempts >= LOCK_AFTER) {
        updates.locked_until = new Date(Date.now() + LOCK_MINUTES * 60 * 1000).toISOString();
        updates.failed_login_attempts = 0;
      }
      await supabase.from("profiles").update(updates).eq("id", profile.id);

      await logAuthSecurityEvent({
        userId: profile.id as string,
        phone: phone.local,
        eventType: attempts >= LOCK_AFTER ? "login_locked" : "login_failed_pin",
        details: { attempts },
        ip: getClientIp(request),
        userAgent: getUserAgent(request),
      });

      if (attempts >= LOCK_AFTER) {
        return NextResponse.json(
          { error: "Bahut galat attempts. Account 15 minutes ke liye lock hai." },
          { status: 423 },
        );
      }
      return NextResponse.json({ error: genericError }, { status: 401 });
    }

    await supabase
      .from("profiles")
      .update({
        failed_login_attempts: 0,
        locked_until: null,
        last_login_at: new Date().toISOString(),
        phone_verified: true,
        account_status: "active",
      })
      .eq("id", profile.id);

    await logAuthSecurityEvent({
      userId: profile.id as string,
      phone: phone.local,
      eventType: "login_success",
      ip: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json({ ok: true, redirectTo: "/customer/dashboard" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid login payload" }, { status: 400 });
    }
    if (error instanceof Error && error.message.includes("AUTH_HMAC_SECRET")) {
      return NextResponse.json({ error: "Server auth misconfigured" }, { status: 503 });
    }
    console.error("[customer-login]", error);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
