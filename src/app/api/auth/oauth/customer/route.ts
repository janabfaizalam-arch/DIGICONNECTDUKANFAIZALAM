import { NextResponse } from "next/server";

import {
  indianMobilePattern,
  indianPincodePattern,
  isCustomerOAuthProvider,
  normalizeIndianMobile,
  normalizeIndianPincode,
  pendingCustomerOAuthCookie,
  serializePendingCustomerOAuthData,
} from "@/lib/customer-oauth";
import { lookupIndianPincode } from "@/lib/pincode";

type CustomerOAuthBody = {
  mobile?: string;
  pincode?: string;
  provider?: string;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ ok: false, message }, { status });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as CustomerOAuthBody | null;
  const provider = body?.provider;
  const mobile = normalizeIndianMobile(String(body?.mobile ?? ""));
  const pincode = normalizeIndianPincode(String(body?.pincode ?? ""));

  if (!isCustomerOAuthProvider(provider)) {
    return jsonError("Choose Google or Facebook to continue.", 400);
  }

  if (!indianMobilePattern.test(mobile)) {
    return jsonError("Enter a valid Indian 10 digit mobile number.", 400);
  }

  if (!indianPincodePattern.test(pincode)) {
    return jsonError("A valid 6 digit Indian PIN code is required.", 400);
  }

  const lookup = await lookupIndianPincode(pincode);

  if (!lookup.ok) {
    return jsonError(lookup.message, lookup.status);
  }

  const response = NextResponse.json({ ok: true, ...lookup.location });
  response.cookies.set({
    name: pendingCustomerOAuthCookie,
    value: serializePendingCustomerOAuthData({
      mobile,
      pincode,
      provider,
      ...lookup.location,
    }),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/auth",
    maxAge: 10 * 60,
  });

  return response;
}
