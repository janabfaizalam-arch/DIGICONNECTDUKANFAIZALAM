import type { SupabaseClient } from "@supabase/supabase-js";

import { createCommissionForApplication } from "@/lib/ap-commission-engine";
import { createInvoiceForApplication } from "@/lib/crm";
import { scheduleCrmSync, scheduleCrmSyncMany } from "@/lib/crmSync";
import { markPaymentLinksPaid } from "@/lib/payments/mark-payment-links-paid";
import { processRewardsOnPaymentVerified } from "@/lib/rewards-wallet";
import { redeemWalletForApplication } from "@/lib/wallet";
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
 *
 * It also owns the money side of settling -- debiting the wallet credits the
 * discount was based on, crediting cashback and referral rewards, and raising
 * the invoice. Those used to run only in /api/verify-payment, which the browser
 * calls on its way back from checkout. A customer who closed the tab during the
 * redirect therefore kept their wallet balance, never got cashback and had no
 * invoice, while the webhook still marked the application paid. Keeping every
 * step here means whichever path arrives first completes the order.
 *
 * Every step is idempotent, so the second path to arrive is a no-op:
 *   wallet debit      -> wallet_transactions.idempotency_key
 *   cashback/referral -> process_rewards_on_payment_verified (already_processed)
 *   commission        -> existing-row check + unique constraint
 *   invoice           -> returns the application's existing invoice
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

export type SettlementResult = {
  /** Applications that crossed into paid on this call. */
  transitionedIds: string[];
  cashback: {
    processed?: boolean;
    cashback_amount?: number;
    first_service?: boolean;
  } | null;
  /** Steps that threw. The payment itself stands; these are retryable. */
  failures: string[];
  /** Set when the applications could not be marked paid at all. */
  updateError: string | null;
};

export async function settleApplicationPayment(
  supabase: SupabaseClient,
  applicationIds: string[],
  status: PaymentStatus,
  payment: SettlementPayment,
  paidAt: string,
  logPrefix: string,
): Promise<SettlementResult> {
  const result: SettlementResult = {
    transitionedIds: [],
    cashback: null,
    failures: [],
    updateError: null,
  };

  if (!applicationIds.length) return result;

  /*
    Which applications are crossing into paid on this event? Read it before any
    update, because the money steps below must run exactly once and a replayed
    webhook (or a verify call racing the webhook) must not send a second
    WhatsApp or re-raise an invoice.
  */
  const { data: priorRows } = await supabase
    .from("applications")
    .select("id, payment_status, metadata, wallet_reserve_id")
    .in("id", applicationIds);

  const transitionedIds = (priorRows ?? [])
    .filter((row) => row.payment_status !== "verified")
    .map((row) => row.id as string);

  /*
    A DC Partner who paid part of the price from their wallet left a hold on
    the first application (create-order). The payment is real now, so the
    application claims it; an unclaimed hold would be given back at the
    partner's next checkout.
  */
  if (status === "verified") {
    for (const row of priorRows ?? []) {
      if (row.payment_status === "verified" || row.wallet_reserve_id) continue;
      const held = (row.metadata as { partner_wallet?: { reserve_id?: string; amount?: number } } | null)?.partner_wallet;
      const reserveId = held?.reserve_id;
      if (!reserveId) continue;
      const claimId = await liveReserveId(supabase, reserveId, Number(held?.amount) || 0, String(row.id), logPrefix);
      if (!claimId) continue;
      const { error: claimError } = await supabase
        .from("applications")
        .update({ wallet_reserve_id: claimId })
        .eq("id", row.id)
        .is("wallet_reserve_id", null);
      if (claimError) {
        console.error(`${logPrefix} partner_wallet_claim_failed`, { applicationId: row.id, message: claimError.message });
      }
    }
  }

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

  const { error: paymentUpdateError } = await applicationPaymentUpdate;

  if (paymentUpdateError) {
    console.error(`${logPrefix} Could not mark applications paid:`, paymentUpdateError);
    result.updateError = paymentUpdateError.message;
    return result;
  }

  await Promise.all([applicationStatusUpdate, invoicesUpdate]);

  if (status !== "verified") return result;

  result.transitionedIds = transitionedIds;

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

  // 3. The money steps, once per application, for the ones that just became paid
  if (transitionedIds.length) {
    const { data: paidRows } = await supabase
      .from("applications")
      .select(
        "id, user_id, customer_id, customer_email, customer_mobile, customer_details, service_name, amount, total_amount, wallet_redeemed_amount, fresh_payable_amount",
      )
      .in("id", transitionedIds);

    const rows = (paidRows ?? []) as SettlementApplicationRow[];

    if (rows.length) {
      const primary = rows[0];
      const userId = primary.user_id ?? null;
      const serviceAmount = rows.reduce((total, row) => total + Number(row.amount ?? 0), 0);
      const walletRedeemed = rows.reduce((total, row) => total + Number(row.wallet_redeemed_amount ?? 0), 0);
      const serviceNames = rows.map((row) => row.service_name).filter(Boolean).join(", ");

      /*
        Take the wallet credits out. The discount they paid for was already
        applied to the Razorpay amount, so skipping this hands the customer
        their credits back for free.
      */
      if (walletRedeemed > 0 && userId) {
        try {
          await redeemWalletForApplication({
            userId,
            applicationId: primary.id,
            serviceName: serviceNames,
            orderAmount: serviceAmount,
            requestedAmount: walletRedeemed,
            maxRedemptionPercent: 50,
          });
        } catch (walletError) {
          console.error(`${logPrefix} Wallet debit failed:`, walletError);
          result.failures.push("wallet_debit");
        }
      }

      if (userId) {
        try {
          const rewards = await processRewardsOnPaymentVerified(primary.id, userId);
          result.cashback = rewards
            ? {
                processed: rewards.processed,
                cashback_amount: rewards.cashback_amount,
                first_service: rewards.first_service,
              }
            : null;
        } catch (rewardError) {
          console.error(`${logPrefix} Cashback/referral rewards failed:`, rewardError);
          result.failures.push("rewards");
        }
      }

      try {
        const details = (primary.customer_details ?? {}) as { name?: string; email?: string; mobile?: string };
        await createInvoiceForApplication({
          applicationId: primary.id,
          userId,
          customerId: primary.customer_id ?? null,
          customerName: details.name?.trim() || "Customer",
          customerEmail: (primary.customer_email || details.email || "").trim() || "no-reply@digiconnect.in",
          customerMobile: (primary.customer_mobile || details.mobile || "").trim() || "0000000000",
          serviceName: serviceNames,
          amount: serviceAmount,
          paymentStatus: "verified",
        });
      } catch (invoiceError) {
        console.error(`${logPrefix} Invoice creation failed:`, invoiceError);
        result.failures.push("invoice");
      }
    }
  }

  await scheduleCrmSyncMany(applicationIds, "payment_updated");

  // Only the applications that just became paid get a message; a replayed
  // webhook must not tell the customer twice.
  try {
    for (const appId of transitionedIds) {
      await triggerWhatsAppNotification("payment_success", appId, { paymentId: payment.id });
      await scheduleCrmSync(appId, "whatsapp_sent", { payload: { whatsappStatus: "Sent" } });
    }
  } catch (waError) {
    console.error(`${logPrefix} WhatsApp trigger error:`, waError);
    result.failures.push("whatsapp");
  }

  return result;
}

type SettlementApplicationRow = {
  id: string;
  user_id: string | null;
  customer_id: string | null;
  customer_email: string | null;
  customer_mobile: string | null;
  customer_details: Record<string, unknown> | null;
  service_name: string | null;
  amount: number | null;
  total_amount: number | null;
  wallet_redeemed_amount: number | null;
  fresh_payable_amount: number | null;
};

/**
 * The hold to claim for a paid application. Normally the one taken at
 * checkout; if that was given back meanwhile (the partner started another
 * checkout a day later), the customer still paid only the rest, so the wallet
 * share is debited again and that entry is claimed instead.
 */
async function liveReserveId(
  supabase: SupabaseClient,
  reserveId: string,
  amount: number,
  applicationId: string,
  logPrefix: string,
): Promise<string | null> {
  const { data: refund } = await supabase
    .from("ap_wallet_ledger")
    .select("id")
    .eq("reference_type", "wallet_refund")
    .eq("reference_id", reserveId)
    .maybeSingle();
  if (!refund) return reserveId;

  const { data: original } = await supabase
    .from("ap_wallet_ledger")
    .select("agency_partner_id, amount, description")
    .eq("id", reserveId)
    .maybeSingle();
  if (!original) return null;

  const { getWalletBalance } = await import("@/lib/ap-wallet");
  const debit = Number(original.amount) || amount;
  const before = await getWalletBalance(String(original.agency_partner_id));
  const { data: entry, error } = await supabase
    .from("ap_wallet_ledger")
    .insert({
      agency_partner_id: original.agency_partner_id,
      entry_type: "application_spend",
      amount: debit,
      running_balance: before - debit,
      reference_type: "application_payment",
      reference_id: applicationId,
      description: original.description ?? "Service liya",
    })
    .select("id")
    .single();
  if (error || !entry?.id) {
    console.error(`${logPrefix} partner_wallet_redebit_failed`, { applicationId, message: error?.message });
    return null;
  }
  return String(entry.id);
}
