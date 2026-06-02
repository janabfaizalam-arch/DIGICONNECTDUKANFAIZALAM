import { NextResponse } from "next/server";
import { validateCoupon } from "@/lib/coupons";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const rateLimit = checkRateLimit(`coupon-validate:${getClientIp(request)}`, 30, 60_000);
    if (!rateLimit.ok) {
      return rateLimitResponse(rateLimit.retryAfter);
    }

    const body = await request.json().catch(() => null);
    const serviceSlug = String(body?.serviceSlug ?? "").trim();
    const couponCode = String(body?.couponCode ?? "").trim();
    const userId = String(body?.userId ?? "").trim();
    const amount = Number(body?.amount ?? 0);

    const validation = validateCoupon({
      couponCode,
      serviceSlug,
      userId,
      amount,
    });

    return NextResponse.json({
      success: true,
      ...validation,
    });
  } catch (error) {
    console.error("[api/coupons/validate] Error validating coupon:", error);
    return NextResponse.json(
      {
        success: false,
        valid: false,
        discountAmount: 0,
        message: "An internal server error occurred while validating the coupon.",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const serviceSlug = String(searchParams.get("serviceSlug") ?? "").trim();
    const couponCode = String(searchParams.get("couponCode") ?? "").trim();
    const userId = String(searchParams.get("userId") ?? "").trim();
    const amount = Number(searchParams.get("amount") ?? 0);

    const validation = validateCoupon({
      couponCode,
      serviceSlug,
      userId,
      amount,
    });

    return NextResponse.json({
      success: true,
      ...validation,
    });
  } catch (error) {
    console.error("[api/coupons/validate] Error validating coupon:", error);
    return NextResponse.json(
      {
        success: false,
        valid: false,
        discountAmount: 0,
        message: "An internal server error occurred while validating the coupon.",
      },
      { status: 500 }
    );
  }
}
