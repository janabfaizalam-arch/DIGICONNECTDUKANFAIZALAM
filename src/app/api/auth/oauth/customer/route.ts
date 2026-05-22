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
  city?: string;
  district?: string;
  state?: string;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ ok: false, message }, { status });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as CustomerOAuthBody | null;
  const provider = body?.provider;
  const mobile = normalizeIndianMobile(String(body?.mobile ?? ""));
  const pincode = normalizeIndianPincode(String(body?.pincode ?? ""));
  const manualLocation = {
    city: String(body?.city ?? "").trim(),
    district: String(body?.district ?? "").trim(),
    state: String(body?.state ?? "").trim(),
  };

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
  const location = lookup.ok
    ? lookup.location
    : manualLocation.city && manualLocation.district && manualLocation.state
      ? manualLocation
      : null;

  if (!location) {
    return jsonError(lookup.ok ? "City, district and state are required." : `${lookup.message} Enter city, district and state manually to continue.`, lookup.ok ? 400 : lookup.status);
  }

  const response = NextResponse.json({ ok: true, success: true, pincode, ...location });
  response.cookies.set({
    name: pendingCustomerOAuthCookie,
    value: serializePendingCustomerOAuthData({
      mobile,
      pincode,
      provider,
      ...location,
    }),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/auth",
    maxAge: 10 * 60,
  });

  return response;
}
