import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error: "This endpoint is retired. Use /api/auth/customer/forgot-pin/*",
      redirectTo: "/customer/forgot-pin",
    },
    { status: 410 },
  );
}
