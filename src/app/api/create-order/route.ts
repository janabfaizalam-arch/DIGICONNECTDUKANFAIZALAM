import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { validateCoupon } from "@/lib/coupons";
import { getRazorpayClient, getRazorpayKeyId, getRazorpayKeySecret } from "@/lib/razorpay";
import { createWalletIfMissing, redeemWalletForApplication as redeemRewardWalletDirect, processRewardsOnPaymentVerified } from "@/lib/rewards-wallet";
import { calculateWalletRedeemBreakdown } from "@/lib/reward-rules";
import { getPublicServiceBySlug } from "@/lib/services";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

type CreateOrderBody = {
  amount?: number;
  currency?: string;
  receipt?: string;
  serviceSlug?: string;
  serviceSlugs?: string[];
  walletUseAmount?: number;
  couponCode?: string;
  applicationId?: string;
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

type ApplicationDraftCustomer = NonNullable<NonNullable<CreateOrderBody["applicationDraft"]>["customer"]>;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message, message }, { status });
}

function jsonCustomerValidationError(message: string, customer: ReturnType<typeof normalizeCustomer>) {
  if (process.env.NODE_ENV === "development") {
    return NextResponse.json(
      {
        error: message,
        message,
        missingFields: {
          email: !customer.email,
          city: !customer.city,
        },
      },
      { status: 400 },
    );
  }

  return jsonError(message, 400);
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

function normalizeCustomer(customer: ApplicationDraftCustomer = {}) {
  const normalizedName = customer.name?.trim() ?? "";
  const normalizedMobile = customer.mobile?.trim() ?? "";
  const normalizedEmail = customer.email?.trim() ?? "";
  const normalizedCity = customer.city?.trim() ?? "";

  return {
    name: normalizedName,
    mobile: normalizedMobile,
    email: normalizedEmail,
    city: normalizedCity,
    message: customer.message?.trim() ?? "",
  };
}

function getCustomerValidationError(customer: ReturnType<typeof normalizeCustomer>, options: { emailOptional?: boolean } = {}) {
  if (!required(customer.name)) return "Name is required before payment.";
  if (!required(customer.mobile)) return "Mobile is required before payment.";
  if (!options.emailOptional && !required(customer.email)) return "Customer email is required before payment.";
  if (!required(customer.city)) return "Customer city is required before payment.";
  return null;
}

export async function POST(request: Request) {
  try {
    const rateLimit = checkRateLimit(`create-order:${getClientIp(request)}`, 20, 60_000);

    if (!rateLimit.ok) {
      return rateLimitResponse(rateLimit.retryAfter);
    }

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
        : services.reduce((total, service) => {
            let itemAmount = Number(service?.amount ?? 0);
            if (service?.slug === "cibil-report-analysis-and-credit-health-consultation") {
              const plan = body?.applicationDraft?.details?.selectedPlan;
              if (plan && (plan === "Basic CIBIL One Pager Report" || String(plan).toLowerCase().includes("basic"))) {
                itemAmount = 518;
              } else if (plan && (plan === "Premium CIBIL Analysis & Consultation" || String(plan).toLowerCase().includes("premium"))) {
                itemAmount = 2599;
              } else {
                // If it is the legacy flow, the client might send 2600 (original price).
                // Let's support both 2599 and 2600 to prevent any payment mismatch!
                const clientAmountPaise = Math.round(Number(body?.amount ?? 0));
                if (clientAmountPaise === 260000 || clientAmountPaise === 2600) {
                  itemAmount = 2600;
                } else {
                  itemAmount = 2599;
                }
              }
            }
            return total + itemAmount;
          }, 0);

      const couponCode = String(body?.couponCode ?? "").trim();
      let couponDiscount = 0;
      if (couponCode) {
        const validation = validateCoupon({
          couponCode,
          serviceSlug: serviceSlugs[0],
          amount: serviceAmount,
          userId: user.id,
        });
        if (validation.valid) {
          couponDiscount = validation.discountAmount;
        } else {
          return jsonError(`Invalid coupon: ${validation.message}`, 400);
        }
      }

      const finalAmountBeforeWallet = serviceAmount - couponDiscount;

      const requestedWalletAmount = Math.max(0, Math.round(Number(body?.walletUseAmount ?? 0)));
      const wallet = await createWalletIfMissing(user.id);
      const redeem = calculateWalletRedeemBreakdown({
        serviceAmount: finalAmountBeforeWallet,
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
        return jsonError(`Razorpay amount does not match the server-side payable amount. Client: ${amount}, Expected: ${expectedAmount}`, 400);
      }

      if (finalAmountBeforeWallet > 0 && freshPayableAmount < redeem.minimumFreshPayable) {
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

      // Zero-payment wallet-only flow: wallet covers entire service price
      if (freshPayableAmount === 0 && walletRedeemAmount > 0 && body?.applicationDraft) {
        const supabase = getSupabaseAdmin();

        if (!supabase) {
          return jsonError("Application could not be prepared for wallet payment.", 500);
        }

        const customer = normalizeCustomer(body.applicationDraft.customer);
        const customerValidationError = getCustomerValidationError(customer, {
          emailOptional: serviceSlugs.includes("pm-vishwakarma-yojana") || serviceSlugs.includes("cm-yuva-entrepreneur-loan-assistance"),
        });

        if (customerValidationError) {
          return jsonCustomerValidationError(customerValidationError, customer);
        }

        const { data: linkedCustomer } = await supabase
          .from("customers")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        const formData = {
          service: services.filter(Boolean).map((s) => s?.title).join(", "),
          name: customer.name,
          mobile: customer.mobile,
          email: customer.email.toLowerCase(),
          city: customer.city,
          message: customer.message,
          service_slugs: serviceSlugs,
          payment: {
            total_amount: serviceAmount,
            coupon_discount: couponDiscount,
            final_amount: finalAmountBeforeWallet,
            wallet_redeemed_amount: walletRedeemAmount,
            fresh_payable_amount: 0,
            cashback_eligible_amount: 0,
          },
          ...(body.applicationDraft.details ?? {}),
        };

        const paidAt = new Date().toISOString();
        const customerDetails = {
          name: customer.name,
          mobile: customer.mobile,
          email: customer.email,
          city: customer.city,
          address: String(body.applicationDraft.details?.address ?? "").trim(),
          notes: customer.message,
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
          source: "wallet_only_payment",
          coupon_code: couponCode || null,
          coupon_discount: couponDiscount,
          original_price: serviceAmount,
          payment: {
            total_amount: serviceAmount,
            coupon_discount: couponDiscount,
            final_amount: finalAmountBeforeWallet,
            wallet_redeemed_amount: walletRedeemAmount,
            fresh_payable_amount: 0,
            cashback_eligible_amount: 0,
          },
        };

        let remainingWalletToAllocate = walletRedeemAmount;
        const applicationsToInsert = services.filter(Boolean).map((service, index) => {
          let serviceAmountForRow = isItrMsmeCombo ? (index === 0 ? serviceAmount : 0) : Number(service?.amount ?? 0);
          if (service!.slug === "cm-yuva-entrepreneur-loan-assistance" && couponDiscount > 0) {
            serviceAmountForRow = serviceAmountForRow - couponDiscount;
          }
          const walletAmountForRow = isItrMsmeCombo ? (index === 0 ? walletRedeemAmount : 0) : Math.min(remainingWalletToAllocate, serviceAmountForRow);
          remainingWalletToAllocate = Math.max(0, remainingWalletToAllocate - walletAmountForRow);

          return {
            user_id: user.id,
            customer_id: linkedCustomer?.id ?? null,
            customer_email: customer.email.toLowerCase(),
            customer_mobile: customer.mobile.replace(/\D/g, ""),
            service_slug: service!.slug,
            service_name: service!.title,
            amount: serviceAmountForRow,
            total_amount: serviceAmountForRow,
            wallet_used_amount: walletAmountForRow,
            wallet_redeemed_amount: walletAmountForRow,
            real_payment_amount: 0,
            fresh_payable_amount: 0,
            cashback_eligible_amount: 0,
            form_data: formData,
            customer_details: customerDetails,
            service_snapshot: serviceSnapshot,
            metadata,
            status: "submitted",
            payment_status: "verified",
            paid_at: paidAt,
            submitted_at: paidAt,
            created_by: user.id,
            source: "online",
            submitted_by_role: "customer",
          };
        });

        const { data: applications, error: appError } = await supabase
          .from("applications")
          .insert(applicationsToInsert)
          .select("id");

        if (appError || !applications?.length) {
          console.error("[razorpay/create-order] Wallet-only application creation failed", appError);
          return jsonError("Application could not be created with wallet payment.", 500);
        }

        const walletAppIds = applications.map((a) => a.id);
        const primaryAppId = walletAppIds[0];

        // Debit wallet server-side
        try {
          await redeemRewardWalletDirect({
            userId: user.id,
            applicationId: primaryAppId,
            applicationAmount: finalAmountBeforeWallet,
            requestedAmount: walletRedeemAmount,
            createdBy: user.id,
          });
        } catch (walletError) {
          console.error("[razorpay/create-order] Wallet debit failed for wallet-only order", walletError);
          // Rollback: delete the applications
          await supabase.from("applications").delete().in("id", walletAppIds);
          return jsonError("Wallet debit failed. Please try again.", 500);
        }

        // Create payment record
        await supabase.from("payments").insert({
          application_id: primaryAppId,
          user_id: user.id,
          amount: 0,
          wallet_used_amount: walletRedeemAmount,
          real_payment_amount: 0,
          status: "verified",
          paid_at: paidAt,
        });

        // Process cashback (will be ₹0 since fresh amount is 0)
        try {
          await processRewardsOnPaymentVerified(primaryAppId, user.id);
        } catch (cashbackError) {
          console.error("[razorpay/create-order] Cashback processing failed for wallet-only order (non-blocking)", cashbackError);
        }

        return NextResponse.json({
          order_id: null,
          amount: 0,
          currency,
          application_id: primaryAppId,
          application_ids: walletAppIds,
          wallet_only: true,
          message: "Service paid using DigiWallet. No Razorpay payment required.",
        });
      }

      amount = expectedAmount;

      if (body?.applicationDraft) {
        const supabase = getSupabaseAdmin();

        if (!supabase) {
          console.error("[razorpay/create-order] Supabase admin client missing before application draft creation");
          return jsonError("Application could not be prepared for payment.", 500);
        }

        const customer = normalizeCustomer(body.applicationDraft.customer);
        const customerValidationError = getCustomerValidationError(customer, {
          emailOptional: serviceSlugs.includes("pm-vishwakarma-yojana") || serviceSlugs.includes("cm-yuva-entrepreneur-loan-assistance"),
        });

        devInfo("[razorpay/create-order] Customer validation before payment", {
          hasName: Boolean(customer.name),
          hasMobile: Boolean(customer.mobile),
          hasEmail: Boolean(customer.email),
          hasCity: Boolean(customer.city),
          emailLength: customer.email.length,
          cityLength: customer.city.length,
          serviceSlugs,
          walletRedeemAmount,
          freshPayableAmount,
        });

        if (customerValidationError) {
          return jsonCustomerValidationError(customerValidationError, customer);
        }

        devInfo("[razorpay/create-order] Creating payment-pending application", {
          userId: user.id,
          serviceSlugs,
          serviceAmount,
          couponDiscount,
          finalAmountBeforeWallet,
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
          name: customer.name,
          mobile: customer.mobile,
          email: customer.email.toLowerCase(),
          city: customer.city,
          message: customer.message,
          service_slugs: serviceSlugs,
          payment: {
            total_amount: serviceAmount,
            coupon_discount: couponDiscount,
            final_amount: finalAmountBeforeWallet,
            wallet_redeemed_amount: walletRedeemAmount,
            fresh_payable_amount: freshPayableAmount,
            cashback_eligible_amount: freshPayableAmount,
          },
          ...(body.applicationDraft.details ?? {}),
        };
        const customerDetails = {
          name: customer.name,
          mobile: customer.mobile,
          email: customer.email,
          city: customer.city,
          address: String(body.applicationDraft.details?.address ?? "").trim(),
          notes: customer.message,
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
          coupon_code: couponCode || null,
          coupon_discount: couponDiscount,
          original_price: serviceAmount,
          payment: {
            total_amount: serviceAmount,
            coupon_discount: couponDiscount,
            final_amount: finalAmountBeforeWallet,
            wallet_redeemed_amount: walletRedeemAmount,
            fresh_payable_amount: freshPayableAmount,
            cashback_eligible_amount: freshPayableAmount,
          },
        };
        let remainingWalletToAllocate = walletRedeemAmount;
        const applicationsToInsert = services.filter(Boolean).map((service, index) => {
          let serviceAmountForRow = isItrMsmeCombo ? (index === 0 ? serviceAmount : 0) : Number(service?.amount ?? 0);
          if (service!.slug === "cm-yuva-entrepreneur-loan-assistance" && couponDiscount > 0) {
            serviceAmountForRow = serviceAmountForRow - couponDiscount;
          }
          const walletAmountForRow = isItrMsmeCombo ? (index === 0 ? walletRedeemAmount : 0) : Math.min(remainingWalletToAllocate, serviceAmountForRow);
          remainingWalletToAllocate = Math.max(0, remainingWalletToAllocate - walletAmountForRow);
          const freshAmountForRow = Math.max(0, serviceAmountForRow - walletAmountForRow);

          return {
            user_id: user.id,
            customer_id: linkedCustomer?.id ?? null,
            customer_email: customer.email.toLowerCase(),
            customer_mobile: customer.mobile.replace(/\D/g, ""),
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
    } else if (body?.applicationId) {
      const user = await getCurrentUser();

      if (!user) {
        return jsonError("Please login to create a Razorpay order.", 401);
      }

      const supabase = getSupabaseAdmin();

      if (!supabase) {
        return jsonError("Database connection failed.", 500);
      }

      const { data: application, error: appError } = await supabase
        .from("applications")
        .select("*")
        .eq("id", body.applicationId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (appError || !application) {
        return jsonError("Application not found.", 404);
      }

      if (application.payment_status === "verified") {
        return jsonError("This application has already been paid.", 400);
      }

      const freshPayableAmount = Number(application.fresh_payable_amount ?? application.real_payment_amount ?? application.amount ?? 0);
      const expectedAmount = Math.round(freshPayableAmount * 100);

      if (body?.amount && Math.round(body.amount) !== expectedAmount) {
        return jsonError(`Razorpay amount does not match the server-side payable amount. Client: ${body.amount}, Expected: ${expectedAmount}`, 400);
      }

      if (expectedAmount === 0) {
        return NextResponse.json({
          order_id: null,
          amount: 0,
          currency,
          application_id: application.id,
          application_ids: [application.id],
          message: "No payment is required for this application.",
        });
      }

      amount = expectedAmount;
      applicationIds = [application.id];
      orderUserId = user.id;
      walletRedeemAmount = Number(application.wallet_redeemed_amount ?? application.wallet_used_amount ?? 0);
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
