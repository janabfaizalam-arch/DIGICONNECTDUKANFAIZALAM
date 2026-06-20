// ============================================================
// Credit API Route — Verify Razorpay Payment
// DigiConnect Dukan — Powered by RNOS India Pvt. Ltd.
// ============================================================

import crypto from "crypto";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getRazorpayKeySecret } from "@/lib/razorpay";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { creditPaymentVerifySchema } from "@/lib/credit/validators";
import { processCreditScoreCheck } from "@/lib/credit/client";

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
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(`credit-verify-payment:${ip}`, 10, 60_000);

    if (!rateLimit.ok) {
      return rateLimitResponse(rateLimit.retryAfter);
    }

    // 1. Authenticate user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please login to verify payment." }, { status: 401 });
    }

    // 2. Parse and validate verify request body
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const validation = creditPaymentVerifySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Validation failed", details: validation.error.format() }, { status: 400 });
    }

    const input = validation.data;

    // 3. Verify Razorpay signature
    const keySecret = getRazorpayKeySecret();
    if (!keySecret) {
      console.error("[credit/verify-payment] Razorpay key secret missing");
      return NextResponse.json({ error: "Razorpay is not configured on the server." }, { status: 500 });
    }

    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${input.razorpay_order_id}|${input.razorpay_payment_id}`)
      .digest("hex");

    if (!timingSafeEqualHex(expectedSignature, input.razorpay_signature)) {
      console.warn("[credit/verify-payment] Signature mismatch", {
        orderId: input.razorpay_order_id,
        paymentId: input.razorpay_payment_id,
      });
      return NextResponse.json({ error: "Payment verification signature mismatch." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "Database configuration error" }, { status: 500 });
    }

    // 4. Retrieve and validate credit report request row
    const { data: record, error: dbErr } = await supabase
      .from("credit_reports")
      .select("*")
      .eq("id", input.credit_report_id)
      .eq("customer_id", user.id)
      .single();

    if (dbErr || !record) {
      console.error("[credit/verify-payment] Record lookup failed:", dbErr);
      return NextResponse.json({ error: "Associated credit report request not found." }, { status: 404 });
    }

    if (record.razorpay_order_id !== input.razorpay_order_id) {
      console.error("[credit/verify-payment] Razorpay order id mismatch:", {
        recordOrderId: record.razorpay_order_id,
        providedOrderId: input.razorpay_order_id,
      });
      return NextResponse.json({ error: "Razorpay order ID does not match credit report request." }, { status: 400 });
    }

    const paidAt = new Date().toISOString();

    // 5. Update credit report and credit payments status
    const { error: updateErr1 } = await supabase
      .from("credit_reports")
      .update({
        status: "payment_verified",
        razorpay_payment_id: input.razorpay_payment_id,
        updated_at: paidAt,
      })
      .eq("id", record.id);

    if (updateErr1) {
      console.error("[credit/verify-payment] Failed to update credit report:", updateErr1);
      return NextResponse.json({ error: "Failed to update payment status on report." }, { status: 500 });
    }

    const { error: updateErr2 } = await supabase
      .from("credit_payments")
      .update({
        status: "verified",
        razorpay_payment_id: input.razorpay_payment_id,
        razorpay_signature: input.razorpay_signature,
        paid_at: paidAt,
        updated_at: paidAt,
      })
      .eq("credit_report_id", record.id);

    if (updateErr2) {
      console.error("[credit/verify-payment] Failed to update payment record:", updateErr2);
      // Non-blocking for the check execution, but logged
    }

    // 6. Trigger end-to-end score retrieval from Unifers
    const scoreResult = await processCreditScoreCheck(record.id, user.id);

    return NextResponse.json({
      success: true,
      message: "Payment verified and credit score fetched successfully.",
      result: scoreResult,
    });
  } catch (error) {
    const err = error as Error;
    console.error("[credit/verify-payment] Payment verification failed:", err);
    return NextResponse.json({ error: err.message || "Payment verification failed." }, { status: 500 });
  }
}
