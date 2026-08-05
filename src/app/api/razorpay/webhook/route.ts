import crypto from "crypto";
import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { scheduleCrmSync, scheduleCrmSyncMany } from "@/lib/crmSync";
import { triggerWhatsAppNotification } from "@/lib/whatsapp-automation";
import { createCommissionForApplication } from "@/lib/ap-commission-engine";

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

    if (status === "verified") {
      // 1. Process payment links status if any matching links exist
      try {
        await Promise.all(
          applicationIds.map(async (appId) => {
            const { data: link } = await supabase
              .from("payment_links")
              .select("id, status")
              .eq("application_id", appId)
              .eq("status", "pending")
              .maybeSingle();

            if (link) {
              await supabase
                .from("payment_links")
                .update({
                  status: "paid",
                  paid_at: paidAt,
                  razorpay_order_id: payment.order_id ?? null,
                  razorpay_payment_id: payment.id,
                  updated_at: paidAt,
                })
                .eq("id", link.id);
            }
          })
        );
      } catch (err) {
        console.error("[razorpay/webhook] Failed to update payment link status:", err);
      }

      // 2. Reserve partner commissions for referred/partner applications
      try {
        await Promise.all(
          applicationIds.map(async (appId) => {
            const { data: fullApp } = await supabase
              .from("applications")
              .select("id, agency_partner_id, service_slug, service_name, amount")
              .eq("id", appId)
              .single();

            if (fullApp?.agency_partner_id) {
              const [partnerRes, serviceRes] = await Promise.all([
                supabase
                  .from("agency_partners")
                  .select("id, tier_id")
                  .eq("id", fullApp.agency_partner_id)
                  .maybeSingle(),
                supabase
                  .from("services")
                  .select("id")
                  .eq("slug", fullApp.service_slug)
                  .maybeSingle()
              ]);

              const partner = partnerRes.data;
              const service = serviceRes.data;

              if (partner) {
                const commissionRes = await createCommissionForApplication({
                  agencyPartnerId: partner.id,
                  applicationId: fullApp.id,
                  serviceSlug: fullApp.service_slug,
                  serviceName: fullApp.service_name,
                  saleAmount: Number(fullApp.amount),
                  tierId: partner.tier_id,
                  serviceId: service?.id || null,
                });
                console.info("[razorpay/webhook] Commission reserved:", commissionRes);
              }
            }
          })
        );
      } catch (err) {
        console.error("[razorpay/webhook] Failed to calculate/reserve partner commission:", err);
      }

      await scheduleCrmSyncMany(applicationIds, "payment_updated");

      try {
        for (const appId of applicationIds) {
          await triggerWhatsAppNotification("payment_success", appId, {
            paymentId: payment.id
          });
          await scheduleCrmSync(appId, "whatsapp_sent", { payload: { whatsappStatus: "Sent" } });
        }
      } catch (waError) {
        console.error("WhatsApp trigger error in Razorpay webhook:", waError);
      }
    }
  }

  return NextResponse.json({ received: true });
}
