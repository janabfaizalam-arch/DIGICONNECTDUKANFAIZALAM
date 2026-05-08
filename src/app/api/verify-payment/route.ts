import crypto from "crypto";
import { NextResponse } from "next/server";

import { getRazorpayKeySecret } from "@/lib/razorpay";

type VerifyPaymentBody = {
  razorpay_payment_id?: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message, message }, { status });
}

function isSafeRazorpayId(value: string) {
  return /^[a-zA-Z0-9_/-]+$/.test(value);
}

function timingSafeEqualHex(a: string, b: string) {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");

  if (left.length !== right.length) {
    return false;
  }

  return crypto.timingSafeEqual(left, right);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as VerifyPaymentBody | null;
    const paymentId = String(body?.razorpay_payment_id ?? "").trim();
    const orderId = String(body?.razorpay_order_id ?? "").trim();
    const signature = String(body?.razorpay_signature ?? "").trim();

    if (!paymentId || !orderId || !signature) {
      return jsonError("Payment id, order id, and signature are required.", 400);
    }

    if (!isSafeRazorpayId(paymentId) || !isSafeRazorpayId(orderId) || !/^[a-f0-9]+$/i.test(signature)) {
      return jsonError("Payment verification payload is invalid.", 400);
    }

    const keySecret = getRazorpayKeySecret();

    if (!keySecret) {
      console.error("[razorpay/verify-payment] Razorpay key secret missing");
      return jsonError("Razorpay is not configured on the server.", 500);
    }

    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    if (!timingSafeEqualHex(expectedSignature, signature)) {
      console.warn("[razorpay/verify-payment] Signature mismatch", {
        orderId,
        paymentId,
      });
      return jsonError("Payment verification failed.", 400);
    }

    console.info("[razorpay/verify-payment] Payment verified", {
      orderId,
      paymentId,
    });

    return NextResponse.json({
      success: true,
      message: "Payment verified successfully.",
      payment_id: paymentId,
      order_id: orderId,
    });
  } catch (error) {
    console.error("[razorpay/verify-payment] Verification failed", error);
    return jsonError("Payment verification failed. Please try again.", 500);
  }
}
