import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { checkCoupon } from "@/lib/coupons-store";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

/**
 * Preview a coupon before checkout. Nothing is consumed here.
 *
 * The caller's identity comes from the session, never from the request: this
 * endpoint used to take `userId` from the body, so anyone could pass a
 * stranger's id — or omit it — to dodge the per-customer limit in the quoted
 * price. The binding discount is still decided server-side at checkout, but
 * the preview should not lie either.
 */
async function respond(input: { couponCode: string; serviceSlug: string; amount: number }) {
  const user = await getCurrentUser();
  const validation = await checkCoupon({
    code: input.couponCode,
    serviceSlug: input.serviceSlug || null,
    amount: input.amount,
    userId: user?.id ?? null,
  });

  return NextResponse.json({ success: true, ...validation });
}

function failure() {
  return NextResponse.json(
    {
      success: false,
      valid: false,
      discountAmount: 0,
      message: "An internal server error occurred while validating the coupon.",
    },
    { status: 500 },
  );
}

export async function POST(request: Request) {
  try {
    const rateLimit = checkRateLimit(`coupon-validate:${getClientIp(request)}`, 30, 60_000);
    if (!rateLimit.ok) return rateLimitResponse(rateLimit.retryAfter);

    const body = await request.json().catch(() => null);
    return await respond({
      couponCode: String(body?.couponCode ?? "").trim(),
      serviceSlug: String(body?.serviceSlug ?? "").trim(),
      amount: Number(body?.amount ?? 0),
    });
  } catch (error) {
    console.error("[api/coupons/validate] Error validating coupon:", error);
    return failure();
  }
}

export async function GET(request: Request) {
  try {
    const rateLimit = checkRateLimit(`coupon-validate:${getClientIp(request)}`, 30, 60_000);
    if (!rateLimit.ok) return rateLimitResponse(rateLimit.retryAfter);

    const { searchParams } = new URL(request.url);
    return await respond({
      couponCode: String(searchParams.get("couponCode") ?? "").trim(),
      serviceSlug: String(searchParams.get("serviceSlug") ?? "").trim(),
      amount: Number(searchParams.get("amount") ?? 0),
    });
  } catch (error) {
    console.error("[api/coupons/validate] Error validating coupon:", error);
    return failure();
  }
}
