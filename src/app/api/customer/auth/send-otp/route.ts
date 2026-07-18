import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "This endpoint is retired. Use /api/auth/customer/send-signup-otp or forgot-pin/send-otp" },
    { status: 410 },
  );
}
