import { NextResponse } from "next/server";
import { z } from "zod";

import { findExistingCustomerByMobile } from "@/lib/auth/customer-lookup";
import { consumeVerificationToken } from "@/lib/auth/otp-store";
import { customerInternalEmail, normalizeIndianPhone } from "@/lib/auth/phone";
import { derivePinPassword, isValidPinFormat, validateCustomerPin } from "@/lib/auth/pin";
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

async function updateProfileAfterPinReset(
  profileId: string,
  localPhone: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: "Service unavailable" };

  const now = new Date().toISOString();
  const baseUpdate: Record<string, unknown> = {
    mobile: localPhone,
    phone: localPhone,
    phone_verified: true,
    failed_login_attempts: 0,
    locked_until: null,
    updated_at: now,
  };

  const withMigration = { ...baseUpdate, pin_migrated_at: now };
  const first = await supabase.from("profiles").update(withMigration).eq("id", profileId);
  if (!first.error) return { ok: true };

  // Column may not exist yet — retry without pin_migrated_at
  const message = String(first.error.message ?? "").toLowerCase();
  if (message.includes("pin_migrated_at") || message.includes("column")) {
    const second = await supabase.from("profiles").update(baseUpdate).eq("id", profileId);
    if (second.error) {
      console.error("[forgot-pin/reset] profile update failed", second.error.message);
      return { ok: false, error: "PIN reset failed" };
    }
    return { ok: true };
  }

  console.error("[forgot-pin/reset] profile update failed", first.error.message);
  return { ok: false, error: "PIN reset failed" };
}

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    if (body.pin !== body.confirmPin) {
      return NextResponse.json({ error: "PIN aur Confirm PIN match nahi karte." }, { status: 400 });
    }

    if (!isValidPinFormat(body.pin) || !/^\d{6}$/.test(body.pin)) {
      return NextResponse.json({ error: "PIN exactly 6 digits hona chahiye." }, { status: 400 });
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

    const lookup = await findExistingCustomerByMobile(phone.local);
    if (!lookup.ok) {
      const status = lookup.reason === "ambiguous" || lookup.reason === "no_auth_user" ? 409 : 400;
      return NextResponse.json(
        { error: lookup.reason === "not_found" ? "Unable to reset PIN" : lookup.message },
        { status },
      );
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
    }

    // Update existing auth user password only — never create a new auth user
    const password = derivePinPassword(phone.local, body.pin);
    const { error: authError } = await supabase.auth.admin.updateUserById(lookup.profileId, {
      password,
      email: customerInternalEmail(phone.local),
      email_confirm: true,
      phone: phone.e164,
      phone_confirm: true,
      user_metadata: {
        phone: phone.local,
        role: "customer",
      },
      app_metadata: {
        role: "customer",
      },
    });

    if (authError) {
      console.error("[forgot-pin/reset] updateUserById", authError.message);
      return NextResponse.json({ error: "PIN reset failed" }, { status: 500 });
    }

    await supabase.auth.admin.signOut(lookup.profileId, "global");

    const profileUpdate = await updateProfileAfterPinReset(lookup.profileId, phone.local);
    if (!profileUpdate.ok) {
      return NextResponse.json({ error: profileUpdate.error }, { status: 500 });
    }

    if (lookup.customerId) {
      await supabase
        .from("customers")
        .update({ user_id: lookup.profileId, mobile: phone.local })
        .eq("id", lookup.customerId);
    }

    await logAuthSecurityEvent({
      userId: lookup.profileId,
      phone: phone.local,
      eventType: "pin_reset_success",
      ip: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json({
      ok: true,
      redirectTo: "/customer/login?pinCreated=1",
      message: "PIN successfully created. Login with mobile and PIN.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    if (error instanceof Error && error.message.includes("AUTH_HMAC_SECRET")) {
      return NextResponse.json({ error: "Server auth misconfigured" }, { status: 503 });
    }
    console.error("[forgot-pin/reset]", error);
    return NextResponse.json({ error: "PIN reset failed" }, { status: 500 });
  }
}
