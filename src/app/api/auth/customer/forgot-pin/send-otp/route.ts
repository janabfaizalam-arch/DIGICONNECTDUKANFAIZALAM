import { NextResponse } from "next/server";
import { z } from "zod";

import { findExistingCustomerByMobile } from "@/lib/auth/customer-lookup";
import { createAndSendOtp } from "@/lib/auth/otp-store";
import { normalizeIndianPhone } from "@/lib/auth/phone";
import { getClientIp, getUserAgent } from "@/lib/auth/request-meta";
import { logAuthSecurityEvent } from "@/lib/auth/security-log";
import { getCampaignName } from "@/lib/whatsapp/aisensy";

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

    const lookup = await findExistingCustomerByMobile(phone.local);
    const ip = getClientIp(request);
    const userAgent = getUserAgent(request);
    const campaign = getCampaignName("forgot_pin");

    if (!lookup.ok && lookup.reason === "ambiguous") {
      return NextResponse.json({ error: lookup.message }, { status: 409 });
    }

    if (!lookup.ok && lookup.reason === "profile_only") {
      return NextResponse.json({ error: lookup.message }, { status: 409 });
    }

    if (!lookup.ok && lookup.reason === "service_unavailable") {
      return NextResponse.json({ error: lookup.message }, { status: 503 });
    }

    if (lookup.ok) {
      console.info("[forgot-pin/send-otp]", {
        purpose: "forgot_pin",
        campaign,
        "customer id": lookup.customerId,
        "lookup source": lookup.lookupSource,
        phone: `${phone.local.slice(0, 2)}******${phone.local.slice(-2)}`,
      });

      const result = await createAndSendOtp({
        phoneE164: phone.e164,
        phoneLocal: phone.local,
        purpose: "forgot_pin",
        ip,
        userAgent,
        metadata: { customerId: lookup.customerId, lookupSource: lookup.lookupSource },
      });

      if (!result.ok && result.status === 429) {
        return NextResponse.json({ error: result.error }, { status: 429 });
      }

      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: result.status });
      }

      await logAuthSecurityEvent({
        phone: phone.local,
        eventType: "forgot_pin_otp_sent",
        details: { customerId: lookup.customerId, campaign },
        ip,
        userAgent,
      });
    } else {
      await logAuthSecurityEvent({
        phone: phone.local,
        eventType: "forgot_pin_otp_probe",
        ip,
        userAgent,
        details: { reason: lookup.reason },
      });
    }

    return NextResponse.json({ ok: true, message: GENERIC });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid phone" }, { status: 400 });
    }
    console.error("[forgot-pin/send-otp]", error);
    return NextResponse.json({ error: "Unable to process request" }, { status: 500 });
  }
}
