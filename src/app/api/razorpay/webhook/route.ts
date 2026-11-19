import crypto from "crypto";
import { NextResponse } from "next/server";

import { getRazorpayClient } from "@/lib/razorpay";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  completeCreditPayment,
  completePrintPayment,
} from "@/lib/payments/complete-non-application-payment";
import { mapPaymentStatus, safeRazorpayId } from "@/lib/payments/razorpay-events";
import { settleApplicationPayment } from "@/lib/payments/settle-application-payment";

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

/** Live status straight from Razorpay; null when it cannot be reached. */
async function fetchLivePaymentStatus(paymentId: string): Promise<string | null> {
  const razorpay = getRazorpayClient();

  if (!razorpay) return null;

  try {
    const live = (await razorpay.payments.fetch(paymentId)) as { status?: string };
    return String(live.status ?? "") || null;
  } catch (error) {
    console.warn("[razorpay/webhook] Razorpay payment lookup failed", {
      paymentId,
      message: error instanceof Error ? error.message : "Unknown Razorpay error",
    });
    return null;
  }
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

    /*
      The QR is created fixed-amount, so Razorpay should never credit less than
      the cart. Check anyway before marking anything paid: if the amount is
      short, the payment is recorded above but the applications stay unpaid
      for staff to reconcile.
    */
    const { data: owed } = await supabase
      .from("applications")
      .select("fresh_payable_amount, real_payment_amount, amount")
      .in("id", applicationIds);
    const owedPaise = Math.round(
      (owed ?? []).reduce(
        (sum, row) => sum + Number(row.fresh_payable_amount ?? row.real_payment_amount ?? row.amount ?? 0),
        0,
      ) * 100,
    );
    if (owedPaise > 0 && Number(payment.amount ?? 0) < owedPaise) {
      console.error("[razorpay/webhook] qr_underpaid", {
        paymentId: payment.id,
        paidPaise: payment.amount ?? 0,
        owedPaise,
        linkId: link.id,
      });
      return NextResponse.json({ received: true });
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

  const paymentId = safeRazorpayId(payment.id);
  const orderId = safeRazorpayId(payment.order_id);

  if (!paymentId) {
    console.error("[razorpay/webhook] Refusing to act on an implausible payment id:", payment.id);
    return NextResponse.json({ received: true });
  }

  let status = mapPaymentStatus(payload.event, payment.status);
  let razorpayStatus = payment.status ?? null;

  /*
    Auto-capture lands moments after authorization, and which events a merchant
    subscribes to is a dashboard setting this code cannot see. So when an
    authorization arrives, ask Razorpay what the payment is now rather than
    waiting for a `payment.captured` that may never be delivered -- and if it is
    still only authorized, leave it unpaid.
  */
  if (status === "pending" && payment.status === "authorized") {
    const live = await fetchLivePaymentStatus(paymentId);

    if (live === "captured") {
      status = "verified";
      razorpayStatus = live;
    } else {
      console.warn("[razorpay/webhook] Payment is authorized but not captured — not marking it paid", {
        paymentId,
        orderId,
        liveStatus: live,
      });
    }
  }

  const paymentMatchFilter = orderId
    ? `razorpay_payment_id.eq.${paymentId},razorpay_order_id.eq.${orderId}`
    : `razorpay_payment_id.eq.${paymentId}`;

  // A verified payment is terminal. Razorpay can deliver a `payment.failed` for an
  // abandoned first attempt after the retry succeeded, and re-deliver events out of
  // order, so a non-verified event must never overwrite a verified row.
  let paymentsUpdate = supabase
    .from("payments")
    .update({
      status,
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_status: razorpayStatus,
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

  if (!applicationIds.length) {
    /*
      Not an application payment. Credit reports and print jobs keep their own
      tables, so nothing above matches them and they used to be left stranded
      whenever the browser never came back from checkout: a paid credit report
      stuck at payment_pending with no bureau call, a paid print job never
      queued.
    */
    const handled =
      status === "verified" && orderId
        ? [
            await completeCreditPayment({ orderId, paymentId, source: "webhook" }),
            await completePrintPayment({ orderId, paymentId, paidAt, source: "webhook" }),
          ].some((outcome) => outcome.handled)
        : false;

    return NextResponse.json({ received: true, handled });
  }

  const settlement = await settleApplicationPayment(
    supabase,
    applicationIds,
    status,
    { id: paymentId, orderId, method: payment.method ?? null },
    paidAt,
    "[razorpay/webhook]",
  );

  if (settlement.failures.length) {
    console.error("[razorpay/webhook] Settled with retryable failures", {
      paymentId,
      orderId,
      failures: settlement.failures,
    });
  }

  return NextResponse.json({ received: true });
}
