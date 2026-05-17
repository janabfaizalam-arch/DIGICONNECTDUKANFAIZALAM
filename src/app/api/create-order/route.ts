import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getRazorpayClient, getRazorpayKeyId, getRazorpayKeySecret } from "@/lib/razorpay";
import { createWalletIfMissing } from "@/lib/rewards-wallet";
import { calculateWalletRedeemBreakdown } from "@/lib/reward-rules";
import { getPublicServiceBySlug } from "@/lib/services";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type CreateOrderBody = {
  amount?: number;
  currency?: string;
  receipt?: string;
  serviceSlug?: string;
  serviceSlugs?: string[];
  walletUseAmount?: number;
  applicationDraft?: {
    customer?: {
      name?: string;
      mobile?: string;
      email?: string;
      city?: string;
      message?: string;
    };
    details?: Record<string, string>;
  };
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

function devInfo(message: string, details?: Record<string, unknown>) {
  if (process.env.NODE_ENV === "development") {
    console.info(message, details ?? {});
  }
}

function required(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

export async function POST(request: Request) {
  try {
    devInfo("[razorpay/create-order] Request received");
    const body = (await request.json().catch(() => null)) as CreateOrderBody | null;
    let amount = Math.round(Number(body?.amount ?? 0));
    const currency = String(body?.currency ?? "INR").trim().toUpperCase() || "INR";
    const receipt = getSafeReceipt(String(body?.receipt ?? `digi-${Date.now()}`));
    let applicationIds: string[] = [];
    let orderUserId: string | null = null;
    let walletRedeemAmount = 0;
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
      orderUserId = user.id;

      const services = await Promise.all(serviceSlugs.map((slug) => getPublicServiceBySlug(slug)));

      if (services.some((service) => !service)) {
        return jsonError("Service not found.", 404);
      }

      const isItrMsmeCombo = serviceSlugs.includes("itr-filing") && serviceSlugs.includes("msme-certificate");
      const serviceAmount = isItrMsmeCombo
        ? 699
        : services.reduce((total, service) => total + Number(service?.amount ?? 0), 0);
      const requestedWalletAmount = Math.max(0, Math.round(Number(body?.walletUseAmount ?? 0)));
      const wallet = await createWalletIfMissing(user.id);
      const redeem = calculateWalletRedeemBreakdown({
        serviceAmount,
        walletBalance: Number(wallet.balance ?? 0),
        requestedRedeem: requestedWalletAmount,
      });
      walletRedeemAmount = redeem.walletRedeem;
      const freshPayableAmount = redeem.freshPayable;
      const expectedAmount = Math.round(freshPayableAmount * 100);

      if (redeem.wasClamped) {
        console.warn("[razorpay/create-order] Wallet redeem clamped to 50% cap", redeem);
      }

      if (amount !== expectedAmount) {
        return jsonError("Razorpay amount does not match the server-side payable amount.", 400);
      }

      if (serviceAmount > 0 && freshPayableAmount < redeem.minimumFreshPayable) {
        return jsonError("Wallet redeem cannot exceed 50% of wallet balance and 50% of service amount", 400);
      }

      devInfo("[razorpay/create-order] Wallet redeem calculation", {
        serviceAmount: redeem.serviceAmount,
        walletBalance: redeem.walletBalance,
        requestedRedeem: redeem.requestedRedeem,
        walletHalf: redeem.walletHalf,
        serviceHalf: redeem.serviceHalf,
        maxRedeem: redeem.maxRedeem,
        finalRedeem: redeem.walletRedeem,
        freshPayable: redeem.freshPayable,
      });

      if (serviceAmount === 0) {
        return NextResponse.json({
          order_id: null,
          amount: 0,
          currency,
          application_id: undefined,
          application_ids: [],
          message: "No payment is required for this free service.",
        });
      }

      amount = expectedAmount;

      if (body?.applicationDraft) {
        const supabase = getSupabaseAdmin();

        if (!supabase) {
          console.error("[razorpay/create-order] Supabase admin client missing before application draft creation");
          return jsonError("Application could not be prepared for payment.", 500);
        }

        const customer = body.applicationDraft.customer ?? {};

        if (!required(customer.name) || !required(customer.mobile)) {
          return jsonError("Name and mobile are required before payment.", 400);
        }

        devInfo("[razorpay/create-order] Creating payment-pending application", {
          userId: user.id,
          serviceSlugs,
          serviceAmount,
          walletRedeemAmount,
          freshPayableAmount,
        });

        const { data: linkedCustomer } = await supabase
          .from("customers")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
        const formData = {
          service: services.filter(Boolean).map((service) => service?.title).join(", "),
          name: String(customer.name ?? "").trim(),
          mobile: String(customer.mobile ?? "").trim(),
          email: String(customer.email ?? "").trim(),
          city: String(customer.city ?? "").trim(),
          message: String(customer.message ?? "").trim(),
          service_slugs: serviceSlugs,
          payment: {
            total_amount: serviceAmount,
            wallet_redeemed_amount: walletRedeemAmount,
            fresh_payable_amount: freshPayableAmount,
            cashback_eligible_amount: freshPayableAmount,
          },
          ...(body.applicationDraft.details ?? {}),
        };
        const customerDetails = {
          name: String(customer.name ?? "").trim(),
          mobile: String(customer.mobile ?? "").trim(),
          email: String(customer.email ?? "").trim(),
          city: String(customer.city ?? "").trim(),
          address: String(body.applicationDraft.details?.address ?? "").trim(),
          notes: String(customer.message ?? "").trim(),
        };
        const serviceSnapshot = {
          title: services.filter(Boolean).map((service) => service?.title).join(", "),
          slug: serviceSlugs.join(","),
          slugs: serviceSlugs,
          category: services.filter(Boolean).map((service) => service?.category).filter(Boolean).join(", "),
          category_slug: services.filter(Boolean).map((service) => service?.categorySlug).filter(Boolean).join(", "),
          price: serviceAmount,
          services: services.filter(Boolean).map((service) => ({
            title: service!.title,
            slug: service!.slug,
            category: service!.category,
            categorySlug: service!.categorySlug,
            amount: service!.amount,
            documents: service!.documents,
          })),
        };
        const metadata = {
          source: "razorpay_pending_application",
          payment: {
            total_amount: serviceAmount,
            wallet_redeemed_amount: walletRedeemAmount,
            fresh_payable_amount: freshPayableAmount,
            cashback_eligible_amount: freshPayableAmount,
          },
        };
        let remainingWalletToAllocate = walletRedeemAmount;
        const applicationsToInsert = services.filter(Boolean).map((service, index) => {
          const serviceAmountForRow = isItrMsmeCombo ? (index === 0 ? serviceAmount : 0) : Number(service?.amount ?? 0);
          const walletAmountForRow = isItrMsmeCombo ? (index === 0 ? walletRedeemAmount : 0) : Math.min(remainingWalletToAllocate, serviceAmountForRow);
          remainingWalletToAllocate = Math.max(0, remainingWalletToAllocate - walletAmountForRow);
          const freshAmountForRow = Math.max(0, serviceAmountForRow - walletAmountForRow);

          return {
            user_id: user.id,
            customer_id: linkedCustomer?.id ?? null,
            service_slug: service!.slug,
            service_name: service!.title,
            amount: serviceAmountForRow,
            total_amount: serviceAmountForRow,
            wallet_used_amount: walletAmountForRow,
            wallet_redeemed_amount: walletAmountForRow,
            real_payment_amount: freshAmountForRow,
            fresh_payable_amount: freshAmountForRow,
            cashback_eligible_amount: freshAmountForRow,
            form_data: formData,
            customer_details: customerDetails,
            service_snapshot: serviceSnapshot,
            metadata,
            status: "payment_pending",
            payment_status: "pending",
            created_by: user.id,
            source: "online",
            submitted_by_role: "customer",
          };
        });

        const { data: applications, error: applicationError } = await supabase
          .from("applications")
          .insert(applicationsToInsert)
          .select("id");

        if (applicationError || !applications?.length) {
          console.error("[razorpay/create-order] Payment-pending application creation failed", applicationError);
          return jsonError("Application could not be prepared for payment.", 500);
        }

        applicationIds = applications.map((application) => application.id);
      }
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

    if (applicationIds.length) {
      const supabase = getSupabaseAdmin();
      const primaryApplicationId = applicationIds[0];

      if (!supabase || !primaryApplicationId) {
        console.error("[razorpay/create-order] Supabase admin missing after Razorpay order creation", { orderId: order.id });
        return jsonError("Razorpay order was created, but application could not be linked. Please contact support.", 500);
      }

      const { error: applicationUpdateError } = await supabase
        .from("applications")
        .update({
          razorpay_order_id: order.id,
          updated_at: new Date().toISOString(),
        })
        .in("id", applicationIds);

      const { error: paymentInsertError } = await supabase.from("payments").insert({
        application_id: primaryApplicationId,
        user_id: orderUserId,
        amount: amount / 100,
        wallet_used_amount: walletRedeemAmount,
        real_payment_amount: amount / 100,
        status: "pending",
        razorpay_order_id: order.id,
      });

      if (applicationUpdateError || paymentInsertError) {
        console.error("[razorpay/create-order] Razorpay order link failed", {
          orderId: order.id,
          applicationUpdateError,
          paymentInsertError,
        });
        return jsonError("Razorpay order was created, but application could not be linked. Please contact support.", 500);
      }
    }

    devInfo("[razorpay/create-order] Order created", {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt,
    });

    return NextResponse.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      application_id: applicationIds[0],
      application_ids: applicationIds,
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
