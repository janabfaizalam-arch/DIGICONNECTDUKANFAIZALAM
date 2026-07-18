import { NextResponse } from "next/server";
import { z } from "zod";

import { verifyOtpRequest } from "@/lib/auth/otp-store";
import { normalizeIndianPhone } from "@/lib/auth/phone";

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
      purpose: "forgot_pin",
      otp: body.otp,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      ok: true,
      verificationToken: result.verificationToken,
    });
  } catch {
    return NextResponse.json({ error: "Unable to verify OTP" }, { status: 500 });
  }
}
