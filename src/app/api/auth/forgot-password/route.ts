import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error: "Customer email password reset removed. Use /customer/forgot-pin",
      redirectTo: "/customer/forgot-pin",
    },
    { status: 410 },
  );
}
