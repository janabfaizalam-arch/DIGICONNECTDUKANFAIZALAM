import crypto from "crypto";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { calculateWalletRedeemBreakdown } from "@/lib/reward-rules";
import { getRazorpayClient, getRazorpayKeySecret } from "@/lib/razorpay";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createWalletIfMissing } from "@/lib/rewards-wallet";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { rupeesToPaise } from "@/lib/payments/application-source";
import { settleApplicationPayment } from "@/lib/payments/settle-application-payment";

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

/**
 * Confirm with Razorpay that the payment really was captured, for the amount we
 * expect. A signature proves only that the payment belongs to this order; it
 * says nothing about whether the money actually moved.
 *
 * Fails open when Razorpay cannot be reached: the order was created server-side
 * at a server-computed price, so the signature already pins the amount. A
 * reachable API reporting a real mismatch fails closed.
 */
async function assertPaymentCaptured(paymentId: string, expectedPaise: number) {
  const razorpay = getRazorpayClient();

  if (!razorpay) {
    return { ok: true as const };
  }

  try {
    const payment = (await razorpay.payments.fetch(paymentId)) as { amount?: number | string; status?: string };
    const paidPaise = Number(payment.amount ?? 0);
    const status = String(payment.status ?? "");

    if (status !== "captured") {
      return { ok: false as const, reason: "not_captured" as const, status, paidPaise };
    }

    if (expectedPaise > 0 && paidPaise !== expectedPaise) {
      return { ok: false as const, reason: "amount_mismatch" as const, status, paidPaise };
    }

    return { ok: true as const };
  } catch (error) {
    console.warn("[razorpay/verify-payment] Razorpay payment lookup failed, continuing on signature alone", {
      paymentId,
      message: error instanceof Error ? error.message : "Unknown Razorpay error",
    });
    return { ok: true as const };
  }
}

function devInfo(message: string, details?: Record<string, unknown>) {
  if (process.env.NODE_ENV === "development") {
    console.info(message, details ?? {});
  }
}

export async function POST(request: Request) {
  try {
    const rateLimit = checkRateLimit(`verify-payment:${getClientIp(request)}`, 30, 60_000);

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
      /*
        Local convenience only. In production a missing service-role key must
        never read back as a successful payment: the webhook is the fallback and
        an operator needs to see this fail.
      */
      if (process.env.NODE_ENV === "production") {
        console.error("[razorpay/verify-payment] Supabase admin client missing in production", { orderId, paymentId });
        return jsonError("Payment received, but it could not be recorded. Our team will confirm it shortly.", 500);
      }

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
      .select(
        "id, user_id, customer_id, customer_email, customer_mobile, customer_details, service_name, amount, total_amount, wallet_redeemed_amount, fresh_payable_amount, razorpay_order_id, payment_status, status",
      )
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
    let cashbackResult: Awaited<ReturnType<typeof settleApplicationPayment>>["cashback"] = null;

    // Re-verifying an already-verified order must stay idempotent. The wallet was
    // already debited on the first pass, so recomputing the 50% cap against the
    // post-debit balance would reject a payment that is in fact complete.
    if (!alreadyVerified) {
      const captured = await assertPaymentCaptured(paymentId, rupeesToPaise(freshPayableAmount));

      if (!captured.ok) {
        console.error("[razorpay/verify-payment] Razorpay payment is not a capture for this amount", {
          orderId,
          paymentId,
          reason: captured.reason,
          razorpayStatus: captured.status,
          paidPaise: captured.paidPaise,
          expectedPaise: rupeesToPaise(freshPayableAmount),
        });
        return jsonError(
          captured.reason === "not_captured"
            ? "Payment has not been captured yet. Please wait a moment and refresh."
            : "Paid amount does not match this order. Please contact support.",
          400,
        );
      }

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
    }

    if (!alreadyVerified) {
      /*
        Record the payment row first, the same way the webhook does, so the
        settlement below finds the same trail whichever path got here first.
      */
      const { data: existingPayment } = await supabase
        .from("payments")
        .select("id")
        .eq("razorpay_payment_id", paymentId)
        .maybeSingle();

      if (!existingPayment?.id) {
        const { data: pendingPayment } = await supabase
          .from("payments")
          .select("id")
          .eq("application_id", primaryApplication.id)
          .eq("razorpay_order_id", orderId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const paymentPayload = {
          application_id: primaryApplication.id,
          user_id: user.id,
          // The order was created for the whole cart, so the row records the
          // whole cart, not just the first application's share of it.
          amount: freshPayableAmount,
          wallet_used_amount: walletRedeemedAmount,
          real_payment_amount: freshPayableAmount,
          status: "verified",
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: signature,
          razorpay_status: "captured",
          paid_at: paidAt,
          updated_at: paidAt,
        };
        const paymentResult = pendingPayment?.id
          ? await supabase.from("payments").update(paymentPayload).eq("id", pendingPayment.id)
          : await supabase.from("payments").insert(paymentPayload);

        // 23505: the webhook inserted the same payment id a moment earlier.
        if (paymentResult.error && paymentResult.error.code !== "23505") {
          console.error("[razorpay/verify-payment] Payment row upsert failed after signature verification", {
            orderId,
            paymentId,
            applicationId: primaryApplication.id,
            error: paymentResult.error,
          });
          return jsonError("Payment verified, but payment record could not be saved. Please contact support.", 500);
        }
      }

      /*
        One shared settlement for every path into a paid application — status,
        payment link, commission, wallet debit, cashback, invoice, CRM sync and
        WhatsApp. The webhook runs exactly this, so a customer who closes the tab
        mid-redirect still gets everything.
      */
      const settlement = await settleApplicationPayment(
        supabase,
        applications.map((application) => application.id),
        "verified",
        { id: paymentId, orderId, method: null },
        paidAt,
        "[razorpay/verify-payment]",
      );

      if (settlement.updateError) {
        console.error("[razorpay/verify-payment] Application payment update failed after signature verification", {
          orderId,
          paymentId,
          applicationIds,
          error: settlement.updateError,
        });
        return jsonError("Payment verified, but application update failed. Please contact support.", 500);
      }

      cashbackResult = settlement.cashback;

      if (settlement.failures.length) {
        console.error("[razorpay/verify-payment] Settled with retryable failures", {
          orderId,
          paymentId,
          failures: settlement.failures,
        });
      }

      devInfo("[razorpay/verify-payment] Payment verified and application settled", {
        orderId,
        paymentId,
        applicationIds,
      });
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
