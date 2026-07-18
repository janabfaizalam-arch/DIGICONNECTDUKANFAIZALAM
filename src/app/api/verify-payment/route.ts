import crypto from "crypto";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { calculateWalletRedeemBreakdown } from "@/lib/reward-rules";
import { getRazorpayKeySecret } from "@/lib/razorpay";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { redeemWalletForApplication } from "@/lib/wallet";
import { createWalletIfMissing, processRewardsOnPaymentVerified } from "@/lib/rewards-wallet";
import { getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { checkRateLimitDurable } from "@/lib/rate-limit-durable";
import { triggerWhatsAppNotification } from "@/lib/whatsapp-automation";
import { createInvoiceForApplication } from "@/lib/crm";
import { createCommissionForApplication } from "@/lib/ap-commission-engine";

type VerifyPaymentBody = {
  razorpay_payment_id?: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
  application_id?: string;
  application_ids?: string[];
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message, message }, { status });
}

function isSafeRazorpayId(value: string) {
  return /^[a-zA-Z0-9_/-]+$/.test(value);
}

function timingSafeEqualHex(a: string, b: string) {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");

  if (left.length !== right.length) {
    return false;
  }

  return crypto.timingSafeEqual(left, right);
}

function devInfo(message: string, details?: Record<string, unknown>) {
  if (process.env.NODE_ENV === "development") {
    console.info(message, details ?? {});
  }
}

export async function POST(request: Request) {
  try {
    const rateLimit = await checkRateLimitDurable(`verify-payment:${getClientIp(request)}`, 30, 60_000);

    if (!rateLimit.ok) {
      return rateLimitResponse(rateLimit.retryAfter);
    }

    devInfo("[razorpay/verify-payment] Request received");
    const body = (await request.json().catch(() => null)) as VerifyPaymentBody | null;
    const paymentId = String(body?.razorpay_payment_id ?? "").trim();
    const orderId = String(body?.razorpay_order_id ?? "").trim();
    const signature = String(body?.razorpay_signature ?? "").trim();
    const applicationIds = Array.from(
      new Set(
        (Array.isArray(body?.application_ids) && body.application_ids.length ? body.application_ids : [body?.application_id])
          .map((id) => String(id ?? "").trim())
          .filter(Boolean),
      ),
    );

    if (!paymentId || !orderId || !signature) {
      return jsonError("Payment id, order id, and signature are required.", 400);
    }

    if (!isSafeRazorpayId(paymentId) || !isSafeRazorpayId(orderId) || !/^[a-f0-9]+$/i.test(signature)) {
      return jsonError("Payment verification payload is invalid.", 400);
    }

    const keySecret = getRazorpayKeySecret();

    if (!keySecret) {
      console.error("[razorpay/verify-payment] Razorpay key secret missing");
      return jsonError("Razorpay is not configured on the server.", 500);
    }

    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    if (!timingSafeEqualHex(expectedSignature, signature)) {
      console.warn("[razorpay/verify-payment] Signature mismatch", {
        orderId,
        paymentId,
      });
      return jsonError("Payment verification failed.", 400);
    }

    if (!applicationIds.length) {
      devInfo("[razorpay/verify-payment] Signature verified without application linkage", {
        orderId,
        paymentId,
      });

      return NextResponse.json({
        success: true,
        message: "Payment verified successfully.",
        payment_id: paymentId,
        order_id: orderId,
      });
    }

    const user = await getCurrentUser();

    if (!user) {
      return jsonError("Please login to verify payment.", 401);
    }

    const supabase = getSupabaseAdmin();

    if (!supabase) {
      console.info("[razorpay/verify-payment] Supabase admin client missing - bypassing database updates in offline test mode", {
        orderId,
        paymentId,
      });
      return NextResponse.json({
        success: true,
        message: "Payment verified successfully (Offline/Local Test Mode).",
        payment_id: paymentId,
        order_id: orderId,
      });
    }

    const { data: applications, error: applicationLoadError } = await supabase
      .from("applications")
      .select("id, user_id, service_name, amount, total_amount, wallet_redeemed_amount, fresh_payable_amount, razorpay_order_id, payment_status, status")
      .in("id", applicationIds)
      .eq("user_id", user.id);

    if (applicationLoadError || !applications?.length) {
      console.error("[razorpay/verify-payment] Application lookup failed after signature verification", {
        orderId,
        paymentId,
        applicationIds,
        error: applicationLoadError,
      });
      return jsonError("Payment verified, but application could not be found. Please contact support.", 500);
    }

    const mismatchedApplication = applications.find((application) => application.razorpay_order_id !== orderId);

    if (mismatchedApplication) {
      console.error("[razorpay/verify-payment] Razorpay order id does not match application", {
        orderId,
        paymentId,
        applicationId: mismatchedApplication.id,
        applicationOrderId: mismatchedApplication.razorpay_order_id,
      });
      return jsonError("Payment order does not match this application.", 400);
    }

    const primaryApplication = applications[0];
    const paidAt = new Date().toISOString();
    const alreadyVerified = applications.every((application) => application.payment_status === "verified");
    const serviceAmount = applications.reduce((total, application) => total + Number(application.total_amount ?? application.amount ?? 0), 0);
    const walletRedeemedAmount = applications.reduce((total, application) => total + Number(application.wallet_redeemed_amount ?? 0), 0);
    const freshPayableAmount = applications.reduce((total, application) => total + Number(application.fresh_payable_amount ?? application.amount ?? 0), 0);
    let cashbackResult: { processed?: boolean; cashback_amount?: number; first_service?: boolean; cashback_transaction_id?: string | null; referrer_transaction_id?: string | null } | null = null;
    const wallet = await createWalletIfMissing(user.id);
    const redeemLimit = calculateWalletRedeemBreakdown({
      serviceAmount,
      walletBalance: Number(wallet.balance ?? 0),
      requestedRedeem: walletRedeemedAmount,
    });

    if (serviceAmount > 0 && (walletRedeemedAmount > redeemLimit.maxRedeem || freshPayableAmount !== redeemLimit.freshPayable)) {
      console.error("[razorpay/verify-payment] Wallet redeem cap violation", {
        orderId,
        paymentId,
        serviceAmount,
        walletBalance: redeemLimit.walletBalance,
        walletRedeemedAmount,
        freshPayableAmount,
        walletHalf: redeemLimit.walletHalf,
        serviceHalf: redeemLimit.serviceHalf,
        maxWalletRedeem: redeemLimit.maxRedeem,
        expectedFreshPayable: redeemLimit.freshPayable,
      });
      return jsonError("Wallet redeem cannot exceed 50% of wallet balance and 50% of service amount", 400);
    }

    if (!alreadyVerified) {
      const { error: applicationUpdateError } = await supabase
        .from("applications")
        .update({
          status: "submitted",
          payment_status: "verified",
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          paid_at: paidAt,
          submitted_at: paidAt,
          updated_at: paidAt,
        })
        .in("id", applications.map((application) => application.id));

      if (applicationUpdateError) {
        console.error("[razorpay/verify-payment] Application payment update failed after signature verification", {
          orderId,
          paymentId,
          applicationIds,
          error: applicationUpdateError,
        });
        return jsonError("Payment verified, but application update failed. Please contact support.", 500);
      }

    // 1. Process payment links status if any matching links exist
    try {
      await Promise.all(
        applications.map(async (app) => {
          const { data: link } = await supabase
            .from("payment_links")
            .select("id, status")
            .eq("application_id", app.id)
            .eq("status", "pending")
            .maybeSingle();

          if (link) {
            await supabase
              .from("payment_links")
              .update({
                status: "paid",
                paid_at: paidAt,
                razorpay_order_id: orderId,
                razorpay_payment_id: paymentId,
                updated_at: paidAt,
              })
              .eq("id", link.id);
          }
        })
      );
    } catch (err) {
      console.error("[razorpay/verify-payment] Failed to update payment link status:", err);
    }

    // 2. Reserve partner commissions for referred/partner applications
    try {
      await Promise.all(
        applications.map(async (app) => {
          // Fetch full application to get agency_partner_id
          const { data: fullApp } = await supabase
            .from("applications")
            .select("id, agency_partner_id, service_slug, service_name, amount")
            .eq("id", app.id)
            .single();

          if (fullApp?.agency_partner_id) {
            // Get partner tier details and service record
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
              console.info("[razorpay/verify-payment] Commission reserved:", commissionRes);
            }
          }
        })
      );
    } catch (err) {
      console.error("[razorpay/verify-payment] Failed to calculate/reserve partner commission:", err);
    }

    const { data: existingPayment } = await supabase
      .from("payments")
      .select("id, status")
      .eq("razorpay_payment_id", paymentId)
      .maybeSingle();

    if (!existingPayment?.id) {
      const { data: pendingPayment } = await supabase
        .from("payments")
        .select("id")
        .eq("application_id", primaryApplication.id)
        .eq("razorpay_order_id", orderId)
        .maybeSingle();
      const paymentPayload = {
        application_id: primaryApplication.id,
        user_id: user.id,
        amount: Number(primaryApplication.fresh_payable_amount ?? primaryApplication.amount ?? 0),
        wallet_used_amount: Number(primaryApplication.wallet_redeemed_amount ?? 0),
        real_payment_amount: Number(primaryApplication.fresh_payable_amount ?? primaryApplication.amount ?? 0),
        status: "verified",
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
        razorpay_status: "verified",
        paid_at: paidAt,
        updated_at: paidAt,
      };
      const paymentResult = pendingPayment?.id
        ? await supabase.from("payments").update(paymentPayload).eq("id", pendingPayment.id)
        : await supabase.from("payments").insert(paymentPayload);

      if (paymentResult.error) {
        console.error("[razorpay/verify-payment] Payment row upsert failed after signature verification", {
          orderId,
          paymentId,
          applicationId: primaryApplication.id,
          error: paymentResult.error,
        });
        return jsonError("Payment verified, but payment record could not be saved. Please contact support.", 500);
      }
    }

    if (walletRedeemedAmount > 0) {
      try {
        await redeemWalletForApplication({
          userId: user.id,
          applicationId: primaryApplication.id,
          serviceName: applications.map((application) => application.service_name).join(", "),
          orderAmount: applications.reduce((total, application) => total + Number(application.amount ?? 0), 0),
          requestedAmount: walletRedeemedAmount,
          maxRedemptionPercent: 50,
        });
      } catch (walletError) {
        console.error("[razorpay/verify-payment] Wallet debit failed after signature verification", {
          orderId,
          paymentId,
          applicationId: primaryApplication.id,
          error: walletError,
        });
        return jsonError("Payment verified, but wallet debit could not be completed. Please contact support.", 500);
      }
    }

    // Credit cashback and referral rewards immediately after payment verification
    try {
      cashbackResult = await processRewardsOnPaymentVerified(primaryApplication.id, user.id);
      devInfo("[razorpay/verify-payment] Cashback processed", {
        orderId,
        paymentId,
        applicationId: primaryApplication.id,
        cashbackResult,
      });
    } catch (cashbackError) {
      // Log but don't fail the payment — cashback can be retried
      console.error("[razorpay/verify-payment] Cashback credit failed (non-blocking)", {
        orderId,
        paymentId,
        applicationId: primaryApplication.id,
        error: cashbackError,
      });
    }

    devInfo("[razorpay/verify-payment] Payment verified and application updated", {
      orderId,
      paymentId,
      applicationIds,
    });

    try {
      await triggerWhatsAppNotification("payment_success", primaryApplication.id, {
        paymentId: paymentId
      });
    } catch (waError) {
      console.error("WhatsApp trigger error for payment verification:", waError);
    }

    try {
      // Auto-create invoice
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const appData = primaryApplication as any;
      const customerName = (appData.customer_details as {name?: string})?.name || "Customer";
      const customerEmail = appData.customer_email || "no-reply@digiconnect.in";
      const customerMobile = appData.customer_mobile || "0000000000";
      const serviceName = applications.map((a) => a.service_name).join(", ");
      await createInvoiceForApplication({
        applicationId: appData.id,
        userId: user.id,
        customerId: appData.customer_id || null,
        customerName: customerName,
        customerEmail: customerEmail,
        customerMobile: customerMobile,
        serviceName: serviceName,
        amount: applications.reduce((total, application) => total + Number(application.amount ?? 0), 0),
        paymentStatus: "verified",
      });
    } catch (invoiceErr) {
      console.error("[razorpay/verify-payment] Invoice creation failed:", invoiceErr);
    }

    } else {
      console.info("[razorpay/verify-payment] Order already verified. Skipping side-effects.", { orderId, paymentId });
    }

    return NextResponse.json({
      success: true,
      message: "Payment verified successfully.",
      payment_id: paymentId,
      order_id: orderId,
      application_id: primaryApplication.id,
      application_ids: applications.map((application) => application.id),
      cashback: cashbackResult ? {
        processed: cashbackResult.processed,
        amount: cashbackResult.cashback_amount ?? 0,
        first_service: cashbackResult.first_service ?? false,
      } : null,
    });
  } catch (error) {
    console.error("[razorpay/verify-payment] Verification failed", error);
    return jsonError("Payment verification failed. Please try again.", 500);
  }
}
