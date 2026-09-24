import type { SupabaseClient } from "@supabase/supabase-js";

import { createCommissionForApplication } from "@/lib/ap-commission-engine";
import { scheduleCrmSync, scheduleCrmSyncMany } from "@/lib/crmSync";
import { markPaymentLinksPaid } from "@/lib/payments/mark-payment-links-paid";
import { triggerWhatsAppNotification } from "@/lib/whatsapp-automation";

/**
 * Everything that happens to a set of applications once Razorpay tells us
 * their money moved.
 *
 * This used to live inline in the Razorpay webhook, which was fine while
 * every payment arrived the same way: a checkout creates an order, the order
 * creates a `payments` row, and the webhook finds the applications by matching
 * that row.
 *
 * A UPI QR payment has no order and no checkout, so it has no `payments` row
 * to match and arrives as `qr_code.credited` instead. It still needs all of
 * this -- the application marked paid, the invoice, the link settled, the
 * partner's commission reserved, the CRM sync, the customer's WhatsApp. So the
 * work lives here and the route decides only *which* applications it applies
 * to and *how it found them*.
 */

export type PaymentStatus = "verified" | "failed" | "pending";

export type SettlementPayment = {
  id: string;
  orderId?: string | null;
  method?: string | null;
};

/**
 * The workflow statuses a payment event may still rewrite.
 *
 * Once an application has moved into processing or completion, a late or
 * replayed payment event must not drag it back to "submitted" -- or to
 * "payment_failed" after it was already paid.
 */
const PAYMENT_STAGE_STATUSES = [
  "draft",
  "new",
  "payment_pending",
  "payment_failed",
  "payment_success",
  "submitted",
];

export async function settleApplicationPayment(
  supabase: SupabaseClient,
  applicationIds: string[],
  status: PaymentStatus,
  payment: SettlementPayment,
  paidAt: string,
  logPrefix: string,
): Promise<void> {
  if (!applicationIds.length) return;

  // Payment facts (payment_status, razorpay ids, paid_at) always apply,
  // whatever stage the application has reached -- only the downgrade of a
  // verified payment is blocked.
  let applicationPaymentUpdate = supabase
    .from("applications")
    .update({
      payment_status: status,
      razorpay_order_id: payment.orderId ?? null,
      razorpay_payment_id: payment.id,
      ...(status === "verified" ? { paid_at: paidAt, submitted_at: paidAt } : {}),
      updated_at: new Date().toISOString(),
    })
    .in("id", applicationIds);

  if (status !== "verified") {
    applicationPaymentUpdate = applicationPaymentUpdate.neq("payment_status", "verified");
  }

  let applicationStatusUpdate = supabase
    .from("applications")
    .update({
      status:
        status === "verified" ? "submitted" : status === "failed" ? "payment_failed" : "payment_pending",
      updated_at: new Date().toISOString(),
    })
    .in("id", applicationIds)
    .in("status", PAYMENT_STAGE_STATUSES);

  if (status !== "verified") {
    applicationStatusUpdate = applicationStatusUpdate.neq("payment_status", "verified");
  }

  let invoicesUpdate = supabase
    .from("invoices")
    .update({ payment_status: status })
    .in("application_id", applicationIds);

  if (status !== "verified") {
    invoicesUpdate = invoicesUpdate.neq("payment_status", "verified");
  }

  await applicationPaymentUpdate;
  await Promise.all([applicationStatusUpdate, invoicesUpdate]);

  if (status !== "verified") return;

  // 1. Settle any payment links covering these applications
  await markPaymentLinksPaid(
    supabase,
    applicationIds,
    { paidAt, razorpayOrderId: payment.orderId ?? null, razorpayPaymentId: payment.id },
    logPrefix,
  );

  // 2. Reserve partner commissions for referred/partner applications
  try {
    await Promise.all(
      applicationIds.map(async (appId) => {
        const { data: fullApp } = await supabase
          .from("applications")
          .select("id, agency_partner_id, service_slug, service_name, amount")
          .eq("id", appId)
          .single();

        if (!fullApp?.agency_partner_id) return;

        const [partnerRes, serviceRes] = await Promise.all([
          supabase
            .from("agency_partners")
            .select("id, tier_id")
            .eq("id", fullApp.agency_partner_id)
            .maybeSingle(),
          supabase.from("services").select("id").eq("slug", fullApp.service_slug).maybeSingle(),
        ]);

        const partner = partnerRes.data;
        if (!partner) return;

        const commissionRes = await createCommissionForApplication({
          agencyPartnerId: partner.id,
          applicationId: fullApp.id,
          serviceSlug: fullApp.service_slug,
          serviceName: fullApp.service_name,
          saleAmount: Number(fullApp.amount),
          tierId: partner.tier_id,
          serviceId: serviceRes.data?.id || null,
        });
        console.info(`${logPrefix} Commission reserved:`, commissionRes);
      }),
    );
  } catch (err) {
    console.error(`${logPrefix} Failed to calculate/reserve partner commission:`, err);
  }

  await scheduleCrmSyncMany(applicationIds, "payment_updated");

  try {
    for (const appId of applicationIds) {
      await triggerWhatsAppNotification("payment_success", appId, { paymentId: payment.id });
      await scheduleCrmSync(appId, "whatsapp_sent", { payload: { whatsappStatus: "Sent" } });
    }
  } catch (waError) {
    console.error(`${logPrefix} WhatsApp trigger error:`, waError);
  }
}
