// ============================================================
// Credit API Route — Create Razorpay Order
// DigiConnect Dukan — Powered by RNOS India Pvt. Ltd.
// ============================================================

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getRazorpayClient, getRazorpayKeyId } from "@/lib/razorpay";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { creditReportRequestSchema } from "@/lib/credit/validators";
import { getCreditPackage } from "@/lib/credit/constants";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(`credit-create-order:${ip}`, 10, 60_000);

    if (!rateLimit.ok) {
      return rateLimitResponse(rateLimit.retryAfter);
    }

    // 1. Authenticate user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please login to check credit score." }, { status: 401 });
    }

    // 2. Parse and validate body details
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const validation = creditReportRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Validation failed", details: validation.error.format() }, { status: 400 });
    }

    const input = validation.data;
    const pkg = getCreditPackage(input.packageType);
    if (!pkg) {
      return NextResponse.json({ error: "Invalid package type selected" }, { status: 400 });
    }

    // 3. Initiate DB record
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "Database configuration error" }, { status: 500 });
    }

    // Save pending credit score report record
    const insertPayload = {
      customer_id: user.id,
      full_name: input.fullName,
      mobile: input.mobile,
      pan: input.pan,
      dob: input.dob,
      status: "payment_pending",
      package_type: input.packageType,
      amount: pkg.price,
      provider: "unifers",
    };

    const { data: record, error: dbErr } = await supabase
      .from("credit_reports")
      .insert(insertPayload)
      .select("id")
      .single();

    if (dbErr || !record) {
      console.error({
        error: dbErr,
        table: "credit_reports",
        payload: insertPayload,
      });
      return NextResponse.json({
        error: `Failed to initialize credit check request in database: ${dbErr?.message || "Unknown database error"}`
      }, { status: 500 });
    }

    // 4. Create Razorpay order
    const razorpay = getRazorpayClient();
    if (!razorpay) {
      console.error("[credit/create-order] Razorpay credentials missing");
      return NextResponse.json({ error: "Razorpay is not configured on the server." }, { status: 500 });
    }

    const orderAmountPaise = Math.round(pkg.price * 100);

    const order = await razorpay.orders.create({
      amount: orderAmountPaise,
      currency: "INR",
      receipt: `credit-${record.id.slice(0, 8)}-${Date.now().toString().slice(-4)}`,
    });

    if (!order || !order.id) {
      return NextResponse.json({ error: "Failed to create payment order with Razorpay." }, { status: 500 });
    }

    // 5. Link Razorpay order ID to the report record
    const updatePayload = {
      razorpay_order_id: order.id,
      updated_at: new Date().toISOString(),
    };

    const { error: updateErr } = await supabase
      .from("credit_reports")
      .update(updatePayload)
      .eq("id", record.id);

    if (updateErr) {
      console.error({
        error: updateErr,
        table: "credit_reports",
        payload: updatePayload,
      });
      return NextResponse.json({
        error: `Failed to link payment order to credit report request: ${updateErr?.message || "Unknown database error"}`
      }, { status: 500 });
    }

    // Save pending credit payment record
    const paymentPayload = {
      credit_report_id: record.id,
      user_id: user.id,
      amount: pkg.price,
      status: "pending",
      razorpay_order_id: order.id,
    };

    const { error: paymentErr } = await supabase
      .from("credit_payments")
      .insert(paymentPayload);

    if (paymentErr) {
      console.error({
        error: paymentErr,
        table: "credit_payments",
        payload: paymentPayload,
      });
    }

    return NextResponse.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      credit_report_id: record.id,
      key_id: getRazorpayKeyId(),
    });
  } catch (error) {
    console.error("[credit/create-order] Error in order creation route:", error);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
