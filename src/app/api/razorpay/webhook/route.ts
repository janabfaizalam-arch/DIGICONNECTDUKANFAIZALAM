import crypto from "crypto";
import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase/admin";

type RazorpayWebhookPayload = {
  event?: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
        amount?: number;
        status?: string;
        method?: string;
        created_at?: number;
      };
    };
  };
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function verifyWebhookSignature(body: string, signature: string, secret: string) {
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  const left = Buffer.from(expected, "hex");
  const right = Buffer.from(signature, "hex");

  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function mapPaymentStatus(event: string | undefined, razorpayStatus: string | undefined) {
  if (event === "payment.failed" || razorpayStatus === "failed") {
    return "failed";
  }

  if (event === "payment.captured" || razorpayStatus === "captured" || razorpayStatus === "authorized") {
    return "verified";
  }

  return "pending";
}

export async function POST(request: Request) {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return jsonError("Razorpay webhook secret is not configured.", 500);
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";

  if (!/^[a-f0-9]+$/i.test(signature) || !verifyWebhookSignature(rawBody, signature, webhookSecret)) {
    return jsonError("Invalid Razorpay webhook signature.", 400);
  }

  let payload: RazorpayWebhookPayload;

  try {
    payload = JSON.parse(rawBody) as RazorpayWebhookPayload;
  } catch {
    return jsonError("Invalid Razorpay webhook payload.", 400);
  }
  const payment = payload.payload?.payment?.entity;

  if (!payment?.id) {
    return NextResponse.json({ received: true });
  }

  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return jsonError("Supabase service role key is missing.", 500);
  }

  const status = mapPaymentStatus(payload.event, payment.status);
  const paidAt = payment.created_at ? new Date(payment.created_at * 1000).toISOString() : new Date().toISOString();
  const paymentMatchFilter = payment.order_id
    ? `razorpay_payment_id.eq.${payment.id},razorpay_order_id.eq.${payment.order_id}`
    : `razorpay_payment_id.eq.${payment.id}`;
  const { data: updatedPayments } = await supabase
    .from("payments")
    .update({
      status,
      razorpay_order_id: payment.order_id ?? null,
      razorpay_payment_id: payment.id,
      razorpay_status: payment.status ?? null,
      payment_method: payment.method ?? null,
      paid_at: status === "verified" ? paidAt : null,
      updated_at: new Date().toISOString(),
    })
    .or(paymentMatchFilter)
    .select("application_id");

  const applicationIds = Array.from(new Set((updatedPayments ?? []).map((row) => row.application_id).filter(Boolean)));

  if (applicationIds.length) {
    await Promise.all([
      supabase
        .from("applications")
        .update({
          payment_status: status,
          status: status === "verified" ? "submitted" : status === "failed" ? "payment_failed" : "payment_pending",
          razorpay_order_id: payment.order_id ?? null,
          razorpay_payment_id: payment.id,
          paid_at: status === "verified" ? paidAt : null,
          submitted_at: status === "verified" ? paidAt : null,
          updated_at: new Date().toISOString(),
        })
        .in("id", applicationIds),
      supabase.from("invoices").update({ payment_status: status }).in("application_id", applicationIds),
    ]);
  }

  return NextResponse.json({ received: true });
}
