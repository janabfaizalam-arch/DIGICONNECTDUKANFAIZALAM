import { NextResponse } from "next/server";

/** Legacy PIN login removed — use POST /api/auth/customer/login */
export async function POST() {
  return NextResponse.json(
    {
      error: "This endpoint is retired. Use /api/auth/customer/login",
      redirectTo: "/customer/login",
    },
    { status: 410 },
  );
}
