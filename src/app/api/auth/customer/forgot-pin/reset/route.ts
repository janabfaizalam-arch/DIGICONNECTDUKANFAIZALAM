import { NextResponse } from "next/server";
import { z } from "zod";

import { findExistingCustomerByMobile } from "@/lib/auth/customer-lookup";
import { updateCustomerHashedPin } from "@/lib/auth/customer-pin-auth";
import { consumeVerificationToken } from "@/lib/auth/otp-store";
import { normalizeIndianPhone } from "@/lib/auth/phone";
import { isValidPinFormat, validateCustomerPin } from "@/lib/auth/pin";
import { getClientIp, getUserAgent } from "@/lib/auth/request-meta";
import { logAuthSecurityEvent } from "@/lib/auth/security-log";

export const runtime = "nodejs";
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
      const status =
        lookup.reason === "ambiguous" ||
        lookup.reason === "profile_only" ||
        lookup.reason === "repair_failed"
          ? 409
          : 400;
      return NextResponse.json(
        {
          error:
            lookup.reason === "not_found"
              ? "No customer account is registered with this mobile number."
              : lookup.message,
        },
        { status },
      );
    }

    if (!lookup.isActive) {
      return NextResponse.json({ error: "Your account is inactive." }, { status: 403 });
    }

    const updated = await updateCustomerHashedPin({
      customerId: lookup.customerId,
      localPhone: phone.local,
      pin: body.pin,
      profileId: lookup.profileId,
    });

    if (!updated.ok) {
      return NextResponse.json({ error: updated.error }, { status: 500 });
    }

    console.info("[forgot-pin/reset]", {
      purpose: "forgot_pin",
      "customer id": lookup.customerId,
      "lookup source": lookup.lookupSource,
      repaired: Boolean(lookup.repaired),
    });

    await logAuthSecurityEvent({
      phone: phone.local,
      eventType: "pin_reset_success",
      details: { customerId: lookup.customerId },
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
    console.error("[forgot-pin/reset]", error);
    return NextResponse.json({ error: "PIN reset failed" }, { status: 500 });
  }
}
