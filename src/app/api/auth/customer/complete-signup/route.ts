import { NextResponse } from "next/server";
import { z } from "zod";

import { consumeVerificationToken } from "@/lib/auth/otp-store";
import { customerInternalEmail, normalizeIndianPhone } from "@/lib/auth/phone";
import { derivePinPassword, validateCustomerPin } from "@/lib/auth/pin";
import { getClientIp, getUserAgent } from "@/lib/auth/request-meta";
import { logAuthSecurityEvent } from "@/lib/auth/security-log";
import { signInWithPasswordCookies } from "@/lib/auth/session-cookies";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { creditSignupBonus } from "@/lib/wallet-ledger";
import { createWalletIfMissing } from "@/lib/rewards-wallet";

export const dynamic = "force-dynamic";

const schema = z.object({
  phone: z.string().trim().min(10).max(20),
  verificationToken: z.string().min(20),
  pin: z.string(),
  confirmPin: z.string(),
  acceptedTerms: z.literal(true),
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
      purpose: "customer_signup",
      verificationToken: body.verificationToken,
    });
    if (!tokenResult.ok) {
      return NextResponse.json({ error: tokenResult.error }, { status: tokenResult.status });
    }

    const meta = tokenResult.metadata;
    const fullName = String(meta.fullName ?? "").trim();
    const address = String(meta.address ?? "").trim();
    const pincode = String(meta.pincode ?? "").trim();
    const district = String(meta.district ?? "").trim();
    const state = String(meta.state ?? "").trim();

    if (!fullName || !address || !pincode || !district || !state) {
      return NextResponse.json({ error: "Signup details missing. OTP step se dubara shuru karein." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
    }

    const { data: existing } = await supabase.from("profiles").select("id").eq("phone", phone.local).maybeSingle();
    if (existing) {
      return NextResponse.json(
        { error: "Is WhatsApp number se account pehle se registered hai. Please login karein." },
        { status: 409 },
      );
    }

    const email = customerInternalEmail(phone.local);
    const password = derivePinPassword(phone.local, body.pin);

    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      phone: phone.e164,
      phone_confirm: true,
      user_metadata: {
        full_name: fullName,
        phone: phone.local,
        role: "customer",
      },
      app_metadata: {
        role: "customer",
      },
    });

    if (createError || !created.user) {
      console.error("[complete-signup] createUser", createError?.message);
      return NextResponse.json({ error: createError?.message ?? "Account create nahi ho saka" }, { status: 500 });
    }

    const userId = created.user.id;
    const now = new Date().toISOString();

    await supabase.from("profiles").upsert({
      id: userId,
      role: "customer",
      full_name: fullName,
      email,
      phone: phone.local,
      mobile: phone.local,
      address,
      pincode,
      district,
      state,
      phone_verified: true,
      account_status: "active",
      failed_login_attempts: 0,
      locked_until: null,
      last_login_at: now,
      updated_at: now,
    });

    // customers upsert may fail if unique differs — best-effort sync
    const { data: customerRow } = await supabase.from("customers").select("id").eq("mobile", phone.local).maybeSingle();
    if (!customerRow) {
      await supabase.from("customers").insert({
        user_id: userId,
        full_name: fullName,
        mobile: phone.local,
        email: "",
        address,
        city: district,
        pincode,
        state,
        source: "online",
      });
    } else {
      await supabase
        .from("customers")
        .update({
          user_id: userId,
          full_name: fullName,
          address,
          pincode,
          state,
          city: district,
          updated_at: now,
        })
        .eq("id", customerRow.id);
    }

    try {
      await createWalletIfMissing(userId);
      await creditSignupBonus(userId);
    } catch {
      // non-blocking
    }

    const session = await signInWithPasswordCookies(email, password);
    if (session.error) {
      return NextResponse.json(
        { error: "Account ban gaya, lekin auto-login fail. Login page se PIN se login karein.", redirectTo: "/customer/login" },
        { status: 201 },
      );
    }

    await logAuthSecurityEvent({
      userId,
      phone: phone.local,
      eventType: "signup_completed",
      ip: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json({ ok: true, redirectTo: "/customer/dashboard" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid signup payload" }, { status: 400 });
    }
    if (error instanceof Error && error.message.includes("AUTH_HMAC_SECRET")) {
      return NextResponse.json({ error: "Server auth misconfigured" }, { status: 503 });
    }
    console.error("[complete-signup]", error);
    return NextResponse.json({ error: "Signup failed" }, { status: 500 });
  }
}
