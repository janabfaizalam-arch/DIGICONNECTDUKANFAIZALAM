import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error: "Legacy WhatsApp OTP verify retired. Use /api/auth/customer/verify-signup-otp or forgot-pin/verify-otp",
    },
    { status: 410 },
  );
}
