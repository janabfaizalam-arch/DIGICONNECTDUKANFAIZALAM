import crypto from "crypto";
import { NextResponse } from "next/server";

import { completePrintPayment } from "@/lib/payments/complete-non-application-payment";
import { getRazorpayClient, getRazorpayKeySecret } from "@/lib/razorpay";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

type VerifyPaymentBody = {
  razorpay_payment_id?: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
  job_id?: string;
};

function timingSafeEqualHex(a: string, b: string) {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");

  if (left.length !== right.length) {
    return false;
  }

  return crypto.timingSafeEqual(left, right);
}

/**
 * Is the money actually in? Same rule as the application checkout: captured,
 * for the amount the job costs. A Razorpay lookup that fails falls back to the
 * signature alone rather than stranding a customer who has paid.
 */
async function confirmCapture(
  paymentId: string,
  expectedPaise: number,
): Promise<{ ok: true } | { ok: false; reason: "not_captured" | "amount_mismatch"; paidPaise: number }> {
  const razorpay = getRazorpayClient();
  if (!razorpay) return { ok: true };

  try {
    const payment = (await razorpay.payments.fetch(paymentId)) as { amount?: number | string; status?: string };
    const paidPaise = Number(payment.amount ?? 0);
    if (String(payment.status ?? "") !== "captured") return { ok: false, reason: "not_captured", paidPaise };
    if (expectedPaise > 0 && paidPaise !== expectedPaise) return { ok: false, reason: "amount_mismatch", paidPaise };
    return { ok: true };
  } catch (error) {
    console.warn("[print/verify] Razorpay lookup failed, continuing on signature alone", {
      paymentId,
      message: error instanceof Error ? error.message : "Unknown Razorpay error",
    });
    return { ok: true };
  }
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(`print-payment-verify:${ip}`, 20, 60_000);

    if (!rateLimit.ok) {
      return rateLimitResponse(rateLimit.retryAfter);
    }

    const body = (await request.json().catch(() => null)) as VerifyPaymentBody | null;
    const paymentId = String(body?.razorpay_payment_id ?? "").trim();
    const orderId = String(body?.razorpay_order_id ?? "").trim();
    const signature = String(body?.razorpay_signature ?? "").trim();
    const jobId = String(body?.job_id ?? "").trim();

    if (!paymentId || !orderId || !signature || !jobId) {
      return NextResponse.json({ error: "All payment credentials are required" }, { status: 400 });
    }

    const keySecret = getRazorpayKeySecret();
    if (!keySecret) {
      console.error("[print/verify] Razorpay key secret missing");
      return NextResponse.json({ error: "Razorpay is not configured on the server" }, { status: 500 });
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    if (!timingSafeEqualHex(expectedSignature, signature)) {
      console.warn("[print/verify] Signature verification failed:", { orderId, paymentId });
      return NextResponse.json({ error: "Payment verification failed" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase service role configuration is missing" }, { status: 500 });
    }

    const { data: job, error: jobError } = await supabase
      .from("print_jobs")
      .select("id, job_number, price, razorpay_order_id, payment_status, print_status")
      .eq("id", jobId)
      .maybeSingle();

    if (jobError || !job) {
      console.error("[print/verify] Job not found:", jobError);
      return NextResponse.json({ error: "Print job not found" }, { status: 404 });
    }

    // The signature proves this payment belongs to this order — and this
    // check proves the order belongs to this job.
    if (job.razorpay_order_id !== orderId) {
      return NextResponse.json({ error: "Order ID mismatch" }, { status: 400 });
    }

    /*
      A signature says the customer authorised the money, not that it was
      captured. Ask Razorpay before printing. If it is not captured yet, the
      webhook finishes the job when it is — the customer's screen polls the
      status and moves on by itself.
    */
    const capture = await confirmCapture(paymentId, Math.round(Number(job.price) * 100));
    if (!capture.ok) {
      if (capture.reason === "amount_mismatch") {
        console.error("[print/verify] amount_mismatch", { jobId, paymentId, paidPaise: capture.paidPaise });
        return NextResponse.json({ error: "Paid amount does not match this order." }, { status: 400 });
      }
      return NextResponse.json({ success: true, pending: true, job_number: job.job_number });
    }

    const outcome = await completePrintPayment({
      orderId,
      paymentId,
      paidAt: new Date().toISOString(),
      source: "verify",
    });

    if (!outcome.handled) {
      return NextResponse.json({ error: "Failed to update print job status in database" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Payment verified successfully.",
      job_number: job.job_number,
    });
  } catch (error) {
    console.error("[print/verify] Error verifying payment:", error);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
