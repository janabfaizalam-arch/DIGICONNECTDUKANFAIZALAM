import { NextResponse } from "next/server";

import { getRazorpayClient } from "@/lib/razorpay";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

type CreateOrderBody = {
  job_id?: string;
};

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(`print-payment-order:${ip}`, 20, 60_000);

    if (!rateLimit.ok) {
      return rateLimitResponse(rateLimit.retryAfter);
    }

    const body = (await request.json().catch(() => null)) as CreateOrderBody | null;
    const jobId = String(body?.job_id ?? "").trim();

    if (!jobId) {
      return NextResponse.json({ error: "Job ID is required" }, { status: 400 });
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
      console.error("[print/create-order] Job not found:", jobError);
      return NextResponse.json({ error: "Print job not found" }, { status: 404 });
    }

    if (job.payment_status === "verified") {
      return NextResponse.json({ error: "This print job has already been paid" }, { status: 400 });
    }

    const razorpay = getRazorpayClient();
    if (!razorpay) {
      console.error("[print/create-order] Razorpay credentials missing");
      return NextResponse.json({ error: "Razorpay is not configured on the server" }, { status: 500 });
    }

    const orderAmountPaise = Math.round(Number(job.price) * 100);

    if (orderAmountPaise < 100) {
      return NextResponse.json({ error: "Amount must be at least ₹1.00" }, { status: 400 });
    }

    // Create Razorpay Order
    const order = await razorpay.orders.create({
      amount: orderAmountPaise,
      currency: "INR",
      receipt: `print-${job.job_number}-${Date.now().toString().slice(-4)}`,
    });

    if (!order || !order.id) {
      return NextResponse.json({ error: "Failed to create order with Razorpay" }, { status: 500 });
    }

    // Update job with order_id
    const { error: updateError } = await supabase
      .from("print_jobs")
      .update({
        razorpay_order_id: order.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    if (updateError) {
      console.error("[print/create-order] Error updating print job with Razorpay Order ID:", updateError);
      return NextResponse.json({ error: "Failed to link payment order to print job" }, { status: 500 });
    }

    return NextResponse.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      job_id: job.id,
      job_number: job.job_number,
    });
  } catch (error) {
    console.error("[print/create-order] Error in order creation route:", error);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
