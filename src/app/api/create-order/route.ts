import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getServiceBySlug } from "@/lib/portal-data";
import { getRazorpayClient, getRazorpayKeyId, getRazorpayKeySecret } from "@/lib/razorpay";
import { createWalletIfMissing, calculateMaxRedeem } from "@/lib/rewards-wallet";

type CreateOrderBody = {
  amount?: number;
  currency?: string;
  receipt?: string;
  serviceSlug?: string;
  serviceSlugs?: string[];
  walletUseAmount?: number;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message, message }, { status });
}

function getRazorpayErrorStatus(error: unknown) {
  const statusCode = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : 0;

  if (statusCode === 401) {
    return 401;
  }

  return 500;
}

function getSafeReceipt(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 40);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as CreateOrderBody | null;
    let amount = Math.round(Number(body?.amount ?? 0));
    const currency = String(body?.currency ?? "INR").trim().toUpperCase() || "INR";
    const receipt = getSafeReceipt(String(body?.receipt ?? `digi-${Date.now()}`));
    const serviceSlugs = Array.from(
      new Set((Array.isArray(body?.serviceSlugs) && body?.serviceSlugs.length ? body.serviceSlugs : [body?.serviceSlug])
        .map((slug) => String(slug ?? "").trim())
        .filter(Boolean)),
    );

    if (serviceSlugs.length) {
      const user = await getCurrentUser();

      if (!user) {
        return jsonError("Please login to create a Razorpay order.", 401);
      }

      const services = serviceSlugs.map((slug) => getServiceBySlug(slug));

      if (services.some((service) => !service)) {
        return jsonError("Service not found.", 404);
      }

      const isItrMsmeCombo = serviceSlugs.includes("itr-filing") && serviceSlugs.includes("msme-certificate");
      const serviceAmount = isItrMsmeCombo
        ? 699
        : services.reduce((total, service) => total + Number(service?.amount ?? 0), 0);
      const requestedWalletAmount = Math.max(0, Math.round(Number(body?.walletUseAmount ?? 0)));
      const wallet = await createWalletIfMissing(user.id);
      const maxRedeem = calculateMaxRedeem(serviceAmount, Number(wallet.balance ?? 0));
      const walletRedeemAmount = Math.min(requestedWalletAmount, maxRedeem);
      const freshPayableAmount = Math.max(0, serviceAmount - walletRedeemAmount);
      const expectedAmount = Math.round(freshPayableAmount * 100);

      if (requestedWalletAmount > maxRedeem) {
        return jsonError(`Reward Wallet can be used up to Rs ${maxRedeem.toLocaleString("en-IN")} for this order.`, 400);
      }

      if (amount !== expectedAmount) {
        return jsonError("Razorpay amount does not match the server-side payable amount.", 400);
      }

      amount = expectedAmount;
    }

    if (!Number.isFinite(amount) || amount < 100) {
      return jsonError("Amount must be at least 100 paise.", 400);
    }

    if (!/^[A-Z]{3}$/.test(currency)) {
      return jsonError("Currency must be a valid 3-letter code.", 400);
    }

    const razorpay = getRazorpayClient();

    if (!razorpay) {
      console.error("[razorpay/create-order] Razorpay credentials missing", {
        hasKeyId: Boolean(getRazorpayKeyId()),
        hasKeySecret: Boolean(getRazorpayKeySecret()),
      });
      return jsonError("Razorpay is not configured on the server.", 500);
    }

    const order = await razorpay.orders.create({
      amount,
      currency,
      receipt,
    });

    console.info("[razorpay/create-order] Order created", {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt,
    });

    return NextResponse.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (error) {
    const status = getRazorpayErrorStatus(error);

    console.error("[razorpay/create-order] Order creation failed", {
      status,
      message: error instanceof Error ? error.message : "Unknown Razorpay error",
    });

    return jsonError(status === 401 ? "Razorpay authentication failed." : "Razorpay order could not be created.", status);
  }
}
