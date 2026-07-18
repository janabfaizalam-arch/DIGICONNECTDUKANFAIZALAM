import crypto from "crypto";
import { NextResponse } from "next/server";

import { getRazorpayKeySecret } from "@/lib/razorpay";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || getRazorpayKeySecret();

  if (!secret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  if (expected !== signature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const payload = JSON.parse(rawBody) as {
    event?: string;
    payload?: { payment?: { entity?: Record<string, unknown> } };
  };

  if (payload.event !== "payment.captured") {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const entity = payload.payload?.payment?.entity;
  const orderId = String(entity?.order_id ?? "");
  const paymentId = String(entity?.id ?? "");
  if (!orderId || !paymentId) {
    return NextResponse.json({ ok: true });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  const { data: payment } = await supabase
    .from("payments")
    .select("id, status, application_id")
    .eq("razorpay_order_id", orderId)
    .maybeSingle();

  if (!payment || payment.status === "paid") {
    return NextResponse.json({ ok: true, alreadyProcessed: true });
  }

  await supabase
    .from("payments")
    .update({
      status: "paid",
      razorpay_payment_id: paymentId,
      razorpay_status: "captured",
      paid_at: new Date().toISOString(),
    })
    .eq("id", payment.id);

  if (payment.application_id) {
    await supabase
      .from("applications")
      .update({
        payment_status: "paid",
        razorpay_payment_id: paymentId,
        paid_at: new Date().toISOString(),
        status: "in_review",
      })
      .eq("id", payment.application_id);
  }

  return NextResponse.json({ ok: true });
}
