import { NextResponse } from "next/server";

import { getRazorpayClient, getRazorpayKeyId } from "@/lib/razorpay";
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

    if (job.payment_status === "refunded" || job.print_status === "cancelled") {
      return NextResponse.json({ error: "This print job was cancelled." }, { status: 409 });
    }

    const orderAmountPaise = Math.round(Number(job.price) * 100);

    if (orderAmountPaise < 100) {
      return NextResponse.json({ error: "Amount must be at least ₹1.00" }, { status: 400 });
    }

    /*
      One order per job.

      A customer who closed the checkout and pressed Pay again used to get a
      fresh order that overwrote the first one's id. A UPI payment against
      the first order that cleared a minute later then matched no job at all:
      the money was taken and nothing printed. Reusing the order keeps every
      payment attempt pointing at this job.
    */
    if (job.razorpay_order_id) {
      return NextResponse.json({
        order_id: job.razorpay_order_id,
        amount: orderAmountPaise,
        currency: "INR",
        job_id: job.id,
        job_number: job.job_number,
        key_id: getRazorpayKeyId(),
      });
    }

    // Create Razorpay Order
    const order = await razorpay.orders.create({
      amount: orderAmountPaise,
      currency: "INR",
      receipt: `print-${job.job_number}-${Date.now().toString().slice(-4)}`,
      notes: { kind: "digi_print", print_job_id: String(job.id) },
    });

    if (!order || !order.id) {
      return NextResponse.json({ error: "Failed to create order with Razorpay" }, { status: 500 });
    }

    // Link the order to the job — only if no other tap linked one first.
    const { data: linked, error: updateError } = await supabase
      .from("print_jobs")
      .update({
        razorpay_order_id: order.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId)
      .is("razorpay_order_id", null)
      .select("id");

    if (updateError) {
      console.error("[print/create-order] Error updating print job with Razorpay Order ID:", updateError);
      return NextResponse.json({ error: "Failed to link payment order to print job" }, { status: 500 });
    }

    if (!linked || linked.length === 0) {
      // Lost the race: hand back the order that is actually linked.
      const { data: current } = await supabase
        .from("print_jobs")
        .select("razorpay_order_id")
        .eq("id", jobId)
        .maybeSingle();
      if (!current?.razorpay_order_id) {
        return NextResponse.json({ error: "Failed to link payment order to print job" }, { status: 500 });
      }
      return NextResponse.json({
        order_id: current.razorpay_order_id,
        amount: orderAmountPaise,
        currency: "INR",
        job_id: job.id,
        job_number: job.job_number,
        key_id: getRazorpayKeyId(),
      });
    }

    return NextResponse.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      job_id: job.id,
      job_number: job.job_number,
      key_id: getRazorpayKeyId(),
    });
  } catch (error) {
    console.error("[print/create-order] Error in order creation route:", error);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
