import { NextResponse } from "next/server";

import { getRazorpayClient, getRazorpayKeyId, getRazorpayKeySecret } from "@/lib/razorpay";

type CreateOrderBody = {
  amount?: number;
  currency?: string;
  receipt?: string;
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
    const amount = Math.round(Number(body?.amount ?? 0));
    const currency = String(body?.currency ?? "INR").trim().toUpperCase() || "INR";
    const receipt = getSafeReceipt(String(body?.receipt ?? `digi-${Date.now()}`));

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
