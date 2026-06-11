import crypto from "crypto";
import { NextResponse } from "next/server";

import { getRazorpayKeySecret } from "@/lib/razorpay";
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

    // Fetch the print job
    const { data: job, error: jobError } = await supabase
      .from("print_jobs")
      .select("*")
      .eq("id", jobId)
      .maybeSingle();

    if (jobError || !job) {
      console.error("[print/verify] Job not found:", jobError);
      return NextResponse.json({ error: "Print job not found" }, { status: 404 });
    }

    // If order_id doesn't match the job
    if (job.razorpay_order_id !== orderId) {
      return NextResponse.json({ error: "Order ID mismatch" }, { status: 400 });
    }

    // Update job to verified & queued status
    const paidAt = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("print_jobs")
      .update({
        payment_status: "verified",
        print_status: "queued",
        razorpay_payment_id: paymentId,
        updated_at: paidAt,
      })
      .eq("id", jobId);

    if (updateError) {
      console.error("[print/verify] Failed to update print job status:", updateError);
      return NextResponse.json({ error: "Failed to update print job status in database" }, { status: 500 });
    }

    // Insert log
    await supabase.from("print_job_logs").insert({
      job_id: job.id,
      action: "payment_verified",
      actor: "system",
      details: {
        ip,
        payment_id: paymentId,
        order_id: orderId,
        paid_at: paidAt,
      },
    });

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
