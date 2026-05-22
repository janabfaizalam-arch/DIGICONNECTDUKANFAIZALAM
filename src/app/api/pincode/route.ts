import { NextResponse } from "next/server";

import { lookupIndianPincode } from "@/lib/pincode";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pincode = String(searchParams.get("pincode") ?? "").trim();

  const lookup = await lookupIndianPincode(pincode);

  if (!lookup.ok) {
    return NextResponse.json({ ok: false, message: lookup.message }, { status: lookup.status });
  }

  return NextResponse.json({ ok: true, ...lookup.location });
}
