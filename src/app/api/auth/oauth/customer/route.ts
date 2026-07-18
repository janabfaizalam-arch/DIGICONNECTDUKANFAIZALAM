import { NextResponse } from "next/server";

/** Customer Google/Facebook OAuth retired. */
export async function POST() {
  return NextResponse.json(
    {
      error: "Social login removed for customers. Use WhatsApp number + PIN.",
      redirectTo: "/customer/login",
    },
    { status: 410 },
  );
}
