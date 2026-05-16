import crypto from "crypto";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getRazorpayKeySecret } from "@/lib/razorpay";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { redeemWalletForApplication } from "@/lib/wallet";

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
      console.error("[razorpay/verify-payment] Supabase admin client missing after signature verification", {
        orderId,
        paymentId,
      });
      return jsonError("Payment verified, but database update could not be completed. Please contact support.", 500);
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

    const walletRedeemedAmount = Number(primaryApplication.wallet_redeemed_amount ?? 0);

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

    devInfo("[razorpay/verify-payment] Payment verified and application updated", {
      orderId,
      paymentId,
      applicationIds,
    });

    return NextResponse.json({
      success: true,
      message: "Payment verified successfully.",
      payment_id: paymentId,
      order_id: orderId,
      application_id: primaryApplication.id,
      application_ids: applications.map((application) => application.id),
    });
  } catch (error) {
    console.error("[razorpay/verify-payment] Verification failed", error);
    return jsonError("Payment verification failed. Please try again.", 500);
  }
}
