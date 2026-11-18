import { NextResponse } from "next/server";
import { getRazorpayKeyId } from "@/lib/razorpay";

export const dynamic = "force-dynamic";

export async function GET() {
  const keyId = getRazorpayKeyId();

  if (!keyId) {
    return NextResponse.json(
      {
        ok: false,
        error: "Razorpay is not configured on the server.",
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "private, no-cache, no-store, must-revalidate",
        },
      },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      keyId,
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    },
  );
}
