import { NextResponse } from "next/server";

/** Legacy signup removed — use /api/auth/customer/* */
export async function POST() {
  return NextResponse.json(
    {
      error: "This endpoint is retired. Use /customer/signup",
      redirectTo: "/customer/signup",
    },
    { status: 410 },
  );
}
