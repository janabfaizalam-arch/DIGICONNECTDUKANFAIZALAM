import crypto from "crypto";
import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  settleApplicationPayment,
  type PaymentStatus,
} from "@/lib/payments/settle-application-payment";

type RazorpayPaymentEntity = {
  id?: string;
  order_id?: string;
  amount?: number;
  status?: string;
  method?: string;
  created_at?: number;
};

type RazorpayQrCodeEntity = {
  id?: string;
  status?: string;
  close_reason?: string | null;
  notes?: Record<string, string | number> | null;
};

type RazorpayWebhookPayload = {
  event?: string;
  payload?: {
    payment?: { entity?: RazorpayPaymentEntity };
    qr_code?: { entity?: RazorpayQrCodeEntity };
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

function mapPaymentStatus(event: string | undefined, razorpayStatus: string | undefined): PaymentStatus {
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

  const paidAt = payment.created_at
    ? new Date(payment.created_at * 1000).toISOString()
    : new Date().toISOString();

  /*
    A UPI QR payment reaches us only here, and it arrives carrying nothing we
    normally match on.

    A checkout payment belongs to an order, which already wrote a `payments`
    row naming its application -- that row is how the branch below finds what
    to settle. Money paid into a QR has no order and no checkout, so there is
    no such row: the QR's own id is the only thread back to the applications,
    which is why the link stores it.

    Razorpay sends `qr_code.credited` with both entities, so the payment is
    recorded against the link's applications first and then settled by exactly
    the same path as any other payment.
  */
  if (payload.event === "qr_code.credited") {
    const qrCode = payload.payload?.qr_code?.entity;

    if (!qrCode?.id) {
      return NextResponse.json({ received: true });
    }

    const { data: link } = await supabase
      .from("payment_links")
      .select("id, customer_id, application_id, status")
      .eq("razorpay_qr_id", qrCode.id)
      .maybeSingle();

    if (!link) {
      console.error("[razorpay/webhook] qr_code.credited for an unknown QR:", qrCode.id);
      return NextResponse.json({ received: true });
    }

    const { data: cartRows } = await supabase
      .from("payment_link_applications")
      .select("application_id")
      .eq("payment_link_id", link.id);

    const applicationIds = (cartRows ?? []).map((row) => row.application_id as string);
    if (!applicationIds.length && link.application_id) {
      applicationIds.push(link.application_id as string);
    }

    if (!applicationIds.length) {
      console.error("[razorpay/webhook] QR link has no applications:", link.id);
      return NextResponse.json({ received: true });
    }

    /*
      Record the payment before settling, so a QR payment leaves the same
      trail as a checkout one -- and so a re-delivered webhook does not write
      a second row. Razorpay retries, and `qr_code.credited` carries no order
      to deduplicate against, so the payment id is the key.
    */
    const { data: existingPayment } = await supabase
      .from("payments")
      .select("id")
      .eq("razorpay_payment_id", payment.id)
      .maybeSingle();

    if (!existingPayment) {
      const { error: insertError } = await supabase.from("payments").insert({
        application_id: applicationIds[0],
        user_id: link.customer_id,
        amount: (payment.amount ?? 0) / 100,
        real_payment_amount: (payment.amount ?? 0) / 100,
        status: "verified",
        razorpay_payment_id: payment.id,
        razorpay_status: payment.status ?? null,
        payment_method: payment.method ?? "upi",
        paid_at: paidAt,
      });

      if (insertError) {
        console.error("[razorpay/webhook] Could not record the QR payment:", insertError);
      }
    }

    await settleApplicationPayment(
      supabase,
      applicationIds,
      "verified",
      { id: payment.id, orderId: null, method: payment.method ?? "upi" },
      paidAt,
      "[razorpay/webhook]",
    );

    return NextResponse.json({ received: true });
  }

  const status = mapPaymentStatus(payload.event, payment.status);
  const paymentMatchFilter = payment.order_id
    ? `razorpay_payment_id.eq.${payment.id},razorpay_order_id.eq.${payment.order_id}`
    : `razorpay_payment_id.eq.${payment.id}`;

  // A verified payment is terminal. Razorpay can deliver a `payment.failed` for an
  // abandoned first attempt after the retry succeeded, and re-deliver events out of
  // order, so a non-verified event must never overwrite a verified row.
  let paymentsUpdate = supabase
    .from("payments")
    .update({
      status,
      razorpay_order_id: payment.order_id ?? null,
      razorpay_payment_id: payment.id,
      razorpay_status: payment.status ?? null,
      payment_method: payment.method ?? null,
      ...(status === "verified" ? { paid_at: paidAt } : {}),
      updated_at: new Date().toISOString(),
    })
    .or(paymentMatchFilter);

  if (status !== "verified") {
    paymentsUpdate = paymentsUpdate.neq("status", "verified");
  }

  const { data: updatedPayments } = await paymentsUpdate.select("application_id");

  const applicationIds = Array.from(
    new Set((updatedPayments ?? []).map((row) => row.application_id).filter(Boolean)),
  );

  await settleApplicationPayment(
    supabase,
    applicationIds,
    status,
    { id: payment.id, orderId: payment.order_id ?? null, method: payment.method ?? null },
    paidAt,
    "[razorpay/webhook]",
  );

  return NextResponse.json({ received: true });
}
