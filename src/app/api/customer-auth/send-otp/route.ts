import { NextResponse } from "next/server";

/**
 * Legacy Auth V2 OTP send is retired.
 * Canonical customer signup OTP: POST /api/auth/customer/send-signup-otp
 * Canonical forgot-PIN OTP: POST /api/auth/customer/forgot-pin/send-otp
 */
export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      success: false,
      error: "This endpoint is retired. Use /api/auth/customer/send-signup-otp or /api/auth/customer/forgot-pin/send-otp",
      code: "ENDPOINT_RETIRED",
      canonical: {
        signup: "/api/auth/customer/send-signup-otp",
        forgotPin: "/api/auth/customer/forgot-pin/send-otp",
      },
    },
    { status: 410 },
  );
}
