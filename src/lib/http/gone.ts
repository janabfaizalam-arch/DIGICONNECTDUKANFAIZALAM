import { NextResponse } from "next/server";

/** Stable 410 Gone response for retired API surfaces. */
export function goneResponse(message: string, code = "GONE") {
  return NextResponse.json(
    {
      success: false,
      error: message,
      message,
      code,
    },
    { status: 410 },
  );
}
