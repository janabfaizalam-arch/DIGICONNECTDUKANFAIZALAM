import { NextResponse } from "next/server";

/** CSC Olympiad is retired from the approved service catalog. */
export async function GET() {
  return NextResponse.json(
    { success: false, error: "CSC Olympiad is no longer available." },
    { status: 410 },
  );
}
