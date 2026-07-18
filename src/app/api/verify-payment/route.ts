import crypto from "crypto";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getRazorpayKeySecret } from "@/lib/razorpay";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { postWalletTransaction } from "@/lib/wallet-ledger";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      razorpay_order_id?: string;
      razorpay_payment_id?: string;
      razorpay_signature?: string;
      applicationId?: string;
    };

    const orderId = String(body.razorpay_order_id ?? "");
    const paymentId = String(body.razorpay_payment_id ?? "");
    const signature = String(body.razorpay_signature ?? "");
    const secret = getRazorpayKeySecret();

    if (!orderId || !paymentId || !signature || !secret) {
      return NextResponse.json({ error: "Invalid payment payload" }, { status: 400 });
    }

    const expected = crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
    if (expected !== signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
    }

    const { data: payment } = await supabase
      .from("payments")
      .select("*")
      .eq("razorpay_order_id", orderId)
      .maybeSingle();

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    if (payment.status === "paid") {
      return NextResponse.json({ ok: true, alreadyProcessed: true });
    }

    const paidAt = new Date().toISOString();
    await supabase
      .from("payments")
      .update({
        status: "paid",
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
        razorpay_status: "captured",
        paid_at: paidAt,
      })
      .eq("id", payment.id);

    const applicationId = (body.applicationId || payment.application_id) as string | null;
    if (applicationId) {
      await supabase
        .from("applications")
        .update({
          payment_status: "paid",
          razorpay_payment_id: paymentId,
          razorpay_signature: signature,
          paid_at: paidAt,
          status: "in_review",
        })
        .eq("id", applicationId);

      const cashback = Number((Number(payment.amount) * 0.2).toFixed(2));
      if (cashback > 0) {
        await postWalletTransaction({
          userId: user.id,
          type: "fresh_payment_cashback",
          amount: cashback,
          idempotencyKey: `fresh_cashback:${paymentId}`,
          description: "20% cashback on fresh payment",
          applicationId,
          paymentId: payment.id as string,
        });
      }

      const invoiceNumber = `INV-${Date.now()}`;
      await supabase.from("invoices").insert({
        application_id: applicationId,
        payment_id: payment.id,
        invoice_number: invoiceNumber,
        amount: payment.amount,
        status: "paid",
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[verify-payment]", error);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
