import { NextResponse } from "next/server";

/** Customer email/password signup retired. */
export async function POST() {
  return NextResponse.json(
    {
      error: "Email/password signup removed. Use WhatsApp OTP signup at /customer/signup",
      redirectTo: "/customer/signup",
    },
    { status: 410 },
  );
}
