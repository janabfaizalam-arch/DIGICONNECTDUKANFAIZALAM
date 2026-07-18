import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "This endpoint is retired. Use /api/auth/customer/verify-signup-otp or forgot-pin/verify-otp" },
    { status: 410 },
  );
}
