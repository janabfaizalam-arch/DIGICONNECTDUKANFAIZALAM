import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { getCurrentUser } from "@/lib/auth";
import { validateCoupon } from "@/lib/coupons";
import { getRazorpayClient, getRazorpayKeyId, getRazorpayKeySecret } from "@/lib/razorpay";
import { createWalletIfMissing, redeemWalletForApplication as redeemRewardWalletDirect, processRewardsOnPaymentVerified } from "@/lib/rewards-wallet";
import { calculateWalletRedeemBreakdown } from "@/lib/reward-rules";
import { getAgentServiceBySlug, type AgentService } from "@/lib/agent-services";
import { getAgencyPartnerByUserId } from "@/lib/ap-data";

import { resolveCustomerIdForUser } from "@/lib/customer-identity";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { resolveApplicationSourceEnum, resolveSourceChannel, rupeesToPaise } from "@/lib/payments/application-source";
import { getPartnerMembership } from "@/lib/auth/memberships";
import { scheduleCrmSyncMany } from "@/lib/crmSync";

type CreateOrderBody = {
  amount?: number;
  currency?: string;
  receipt?: string;
  serviceSlug?: string;
  serviceSlugs?: string[];
  walletUseAmount?: number;
  couponCode?: string;
  applicationId?: string;
  variantSlug?: string;
  packageSlug?: string;
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

function jsonError(message: string, status: number, code?: string) {
  return NextResponse.json({ error: message, message, ...(code ? { code } : {}) }, { status });
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
    let servicePrice = 0;
    let walletUsed = 0;
    let rewardUsed = 0;
    let finalPayable = 0;
    const serviceSlugs = (Array.isArray(body?.serviceSlugs) && body?.serviceSlugs.length ? body.serviceSlugs : [body?.serviceSlug])
      .map((slug) => String(slug ?? "").trim())
      .filter(Boolean);

    console.log(`[CREATE-ORDER] Incoming service slugs:`, serviceSlugs);

    if (serviceSlugs.length) {
      const user = await getCurrentUser();

      if (!user) {
        return jsonError("Please login to create a Razorpay order.", 401);
      }
      orderUserId = user.id;

      const supabase = getSupabaseAdmin();
      if (!supabase) {
        return jsonError("Database connection failed.", 500);
      }

      // Read referral details from request cookie or payload
      let referralTokenFromCookie = null;
      try {
        const cookieStore = await cookies();
        const referralCookie = cookieStore.get("dcd_referral")?.value;
        if (referralCookie) {
          const refData = JSON.parse(referralCookie);
          referralTokenFromCookie = refData.token || null;
        }
      } catch (err) {
        console.error("[CREATE-ORDER] Failed to parse referral cookie:", err);
      }

      const resolvedReferralToken = body?.applicationDraft?.details?.referralToken || referralTokenFromCookie || null;
      let referrerApId = null;

      if (resolvedReferralToken) {
        const { data: referralRecord, error: referralErr } = await supabase
          .from("service_referrals")
          .select("id, partner_id")
          .eq("token", resolvedReferralToken)
          .maybeSingle();

        if (referralErr) {
          console.error(`[CREATE-ORDER] Supabase error querying referral token:`, referralErr);
        } else if (referralRecord) {
          referrerApId = referralRecord.partner_id;
        }
      }

      const ap = await getAgencyPartnerByUserId(user.id).catch(() => null);
      const partnerMembership = await getPartnerMembership(user.id).catch(() => null);
      const portalHint = String(body?.applicationDraft?.details?.portal ?? "").toLowerCase();
      const isPartnerPortalRequest = portalHint === "ap" || portalHint === "agency_partner";

      if (isPartnerPortalRequest && (!partnerMembership || !partnerMembership.ok)) {
        console.warn("[razorpay/create-order] partner_portal_membership_denied", {
          userId: user.id,
          reason: partnerMembership && "reason" in partnerMembership ? partnerMembership.reason : "unknown",
        });
        return jsonError(
          partnerMembership && "reason" in partnerMembership && partnerMembership.reason === "ap_not_active"
            ? "Your Digi Partner account is inactive."
            : partnerMembership && "reason" in partnerMembership && partnerMembership.reason === "kyc_not_approved"
              ? "Your KYC approval is pending."
              : "Digi Partner membership is required to prepare this payment.",
          403,
          partnerMembership && "reason" in partnerMembership ? String(partnerMembership.reason) : "partner_required",
        );
      }

      const partnerIdFromMembership =
        partnerMembership && partnerMembership.ok ? partnerMembership.partnerId : null;
      const resolvedAgentOrReferralId = referrerApId || ap?.id || partnerIdFromMembership || null;
      const isPartnerFlow = Boolean(ap?.id || partnerIdFromMembership);

      console.log(`[CREATE-ORDER] Resolved Agent/Referral ID:`, resolvedAgentOrReferralId);

      let serviceAmount = 0;
      const services: AgentService[] = [];

      if (body?.packageSlug) {
        const { data: pkgRow } = await supabase
          .from("service_packages")
          .select("selling_price, items")
          .eq("slug", body.packageSlug)
          .maybeSingle();
        if (pkgRow) {
          serviceAmount = Number(pkgRow.selling_price);
          console.log(`[CREATE-ORDER] Package resolved price: ₹${serviceAmount} for slug: ${body.packageSlug}`);
          
          const items = Array.isArray(pkgRow.items) ? pkgRow.items : [];
          for (const item of items) {
            const itemObj = item as Record<string, unknown>;
            const sSlug = (itemObj.service_slug || itemObj.slug) as string | undefined;
            if (sSlug) {
              const service = await getAgentServiceBySlug(sSlug);
              if (service) {
                services.push({
                  ...service,
                  customer_fee: Number(pkgRow.selling_price) / items.length,
                });
              }
            }
          }
        } else {
          return jsonError("Package bundle not found.", 400);
        }
      } else {
        for (const slug of serviceSlugs) {
          const service = await getAgentServiceBySlug(slug);
          if (!service) {
            console.error(`[CREATE-ORDER] Service "${slug}" not found in agent_services.`);
            return jsonError("Service pricing is not configured in Admin Panel.", 400);
          }
          if (service.customer_fee === null || service.customer_fee === undefined) {
            console.error(`[CREATE-ORDER] Price for service "${service.title || slug}" is missing in agent_services.`);
            return jsonError("Service pricing is not configured in Admin Panel.", 400);
          }
          services.push(service);
        }

        console.log(`[CREATE-ORDER] Resolved service IDs:`, services.map((s) => s.id));

        if (body?.variantSlug && services.length === 1) {
          const serviceId = services[0].id || services[0].service_id;
          const { data: vRow } = await supabase
            .from("service_variants")
            .select("offer_price, selling_price")
            .eq("service_id", serviceId)
            .eq("slug", body.variantSlug)
            .maybeSingle();
          if (vRow) {
            serviceAmount = Number(vRow.offer_price || vRow.selling_price);
            services[0].customer_fee = serviceAmount;
            console.log(`[CREATE-ORDER] Variant resolved price: ₹${serviceAmount} for slug: ${body.variantSlug}`);
          } else {
            serviceAmount = services.reduce((total, service) => total + Number(service.customer_fee), 0);
          }
        } else {
          serviceAmount = services.reduce((total, service) => total + Number(service.customer_fee), 0);
        }
      }

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
      const expectedAmount = rupeesToPaise(freshPayableAmount);

      if (redeem.wasClamped) {
        console.warn("[razorpay/create-order] Wallet redeem clamped to 50% cap", redeem);
      }

      // If client omits amount (sends 0), trust server calculation instead of rejecting.
      // If client does send an amount, it must match exactly (prevents tampering).
      if (amount > 0 && amount !== expectedAmount) {
        return jsonError(`Razorpay amount does not match the server-side payable amount. Client: ${amount}, Expected: ${expectedAmount}`, 400);
      }
      // Always override with authoritative server amount
      amount = expectedAmount;

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
          servicePrice: 0,
          walletUsed: 0,
          rewardUsed: 0,
          finalPayable: 0,
        });
      }

      // Zero-payment wallet-only flow: wallet covers entire service price
      if (freshPayableAmount === 0 && walletRedeemAmount > 0 && body?.applicationDraft) {
        const supabase = getSupabaseAdmin();

        if (!supabase) {
          console.warn("[razorpay/create-order] Supabase admin client missing - creating mock wallet-only order in local test mode");
          const mockAppIds = serviceSlugs.map((slug) => `mock-app-${slug}-${Date.now()}`);
          return NextResponse.json({
            order_id: null,
            amount: 0,
            currency,
            application_id: mockAppIds[0],
            application_ids: mockAppIds,
            wallet_only: true,
            message: "Service paid using DigiWallet. No Razorpay payment required (Mock/Local Test Mode).",
            servicePrice: serviceAmount,
            walletUsed: walletRedeemAmount,
            rewardUsed: walletRedeemAmount,
            finalPayable: 0,
          });
        }

        const customer = normalizeCustomer(body.applicationDraft.customer);
        const customerValidationError = getCustomerValidationError(customer, {
          // Agent flow never collects email — always make it optional
          emailOptional: true,
        });

        if (customerValidationError) {
          return jsonCustomerValidationError(customerValidationError, customer);
        }

        const linkedCustomerId = await resolveCustomerIdForUser(supabase, user).catch((customerError) => {
          console.error("[razorpay/create-order] customer_link_lookup_failed", customerError);
          return null;
        });

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
          title: services.map((service) => service.title).join(", "),
          slug: serviceSlugs.join(","),
          slugs: serviceSlugs,
          category: services.map((service) => service.category).filter(Boolean).join(", "),
          category_slug: services.map((service) => service.category ? service.category.toLowerCase().replace(/[^a-z0-9]+/g, "-") : "").filter(Boolean).join(", "),
          price: serviceAmount,
          services: services.map((service) => ({
            title: service.title,
            slug: service.slug,
            category: service.category,
            categorySlug: service.category ? service.category.toLowerCase().replace(/[^a-z0-9]+/g, "-") : "services",
            amount: Number(service.customer_fee),
            documents: service.required_documents_list ?? [],
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
        const applicationsToInsert = services.map((service) => {
          let serviceAmountForRow = Number(service.customer_fee);
          if (service.slug === "cm-yuva-entrepreneur-loan-assistance" && couponDiscount > 0) {
            serviceAmountForRow = serviceAmountForRow - couponDiscount;
          }
          const walletAmountForRow = Math.min(remainingWalletToAllocate, serviceAmountForRow);
          remainingWalletToAllocate = Math.max(0, remainingWalletToAllocate - walletAmountForRow);

          const commissionRaw = service.payout_type === "percentage"
            ? Math.round((Number(service.customer_fee) * Number(service.payout_percentage)) / 100)
            : Number(service.agent_payout);
          const commissionAmount = Number.isFinite(commissionRaw) ? commissionRaw : 0;

          return {
            user_id: user.id,
            customer_id: linkedCustomerId,
            agency_partner_id: resolvedAgentOrReferralId,
            customer_email: customer.email.toLowerCase(),
            customer_mobile: customer.mobile.replace(/\D/g, ""),
            service_slug: service.slug,
            service_name: service.title,
            amount: serviceAmountForRow,
            total_amount: serviceAmountForRow,
            wallet_used_amount: walletAmountForRow,
            wallet_redeemed_amount: walletAmountForRow,
            real_payment_amount: 0,
            fresh_payable_amount: 0,
            cashback_eligible_amount: 0,
            commission_amount: commissionAmount,
            form_data: formData,
            customer_details: customerDetails,
            service_snapshot: serviceSnapshot,
            metadata,
            status: "submitted",
            payment_status: "verified",
            paid_at: paidAt,
            submitted_at: paidAt,
            created_by: user.id,
            application_source: body.applicationDraft?.details?.applicationSource || (resolvedAgentOrReferralId ? "partner_assisted" : "customer_self"),
            referral_source: body.applicationDraft?.details?.referralSource || (resolvedReferralToken ? "partner_link" : null),
            referral_token: resolvedReferralToken,
            payment_link_id: body.applicationDraft?.details?.paymentLinkId || null,
            // applications.source is the Postgres enum application_source — only enum-safe values here.
            source: resolveApplicationSourceEnum(isPartnerFlow),
            source_channel: resolveSourceChannel({ isPartnerFlow, isReferral: Boolean(resolvedReferralToken) }),
            submitted_by_role: isPartnerFlow ? "agency_partner" : "customer",
          };
        });

        const { data: applications, error: appError } = await supabase
          .from("applications")
          .insert(applicationsToInsert)
          .select("id");

        if (appError || !applications?.length) {
          console.error("[razorpay/create-order] wallet_only_application_insert_failed", {
            operation: "wallet_only_application_insert",
            userId: user.id,
            agencyPartnerId: ap?.id ?? partnerIdFromMembership ?? null,
            serviceSlugs,
            supabaseCode: appError?.code ?? null,
            supabaseMessage: appError?.message ?? null,
            supabaseDetails: appError?.details ?? null,
            supabaseHint: appError?.hint ?? null,
          });
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

        await scheduleCrmSyncMany(walletAppIds, "payment_updated");

        return NextResponse.json({
          order_id: null,
          amount: 0,
          currency,
          application_id: primaryAppId,
          application_ids: walletAppIds,
          wallet_only: true,
          message: "Service paid using DigiWallet. No Razorpay payment required.",
          servicePrice: serviceAmount,
          walletUsed: walletRedeemAmount,
          rewardUsed: walletRedeemAmount,
          finalPayable: 0,
        });
      }

      amount = expectedAmount;
      servicePrice = serviceAmount;
      walletUsed = walletRedeemAmount;
      rewardUsed = walletRedeemAmount;
      finalPayable = freshPayableAmount;

      const serviceSlug = body?.serviceSlug || serviceSlugs[0];
      const selectedPlan = body?.applicationDraft?.details?.selectedPlan;
      devInfo("[razorpay/create-order] Pricing summary", {
        serviceSlug,
        selectedPlan,
        servicePrice,
        finalPayable,
        amountPaise: amount,
        walletRedeem: walletRedeemAmount,
      });

      if (body?.applicationDraft) {
        const supabase = getSupabaseAdmin();

        if (!supabase) {
          console.warn("[razorpay/create-order] Supabase admin client missing - creating mock paid order in local test mode");
          const mockAppIds = serviceSlugs.map((slug) => `mock-app-${slug}-${Date.now()}`);
          let orderId = `mock_order_${Date.now()}`;
          try {
            const razorpay = getRazorpayClient();
            if (razorpay) {
              const rzpOrder = await razorpay.orders.create({
                amount: Math.round(freshPayableAmount * 100),
                currency: "INR",
                receipt: `mock-receipt-${Date.now()}`,
              });
              orderId = rzpOrder.id;
            }
          } catch (rzpErr) {
            console.warn("Mock Razorpay order creation failed, using mock ID", rzpErr);
          }

          return NextResponse.json({
            order_id: orderId,
            amount: Math.round(freshPayableAmount * 100),
            currency: "INR",
            application_id: mockAppIds[0],
            application_ids: mockAppIds,
            servicePrice: serviceAmount,
            walletUsed: walletRedeemAmount,
            rewardUsed: walletRedeemAmount,
            finalPayable: freshPayableAmount,
            message: "Mock order created successfully in Local Test Mode.",
          });
        }

        const customer = normalizeCustomer(body.applicationDraft.customer);
        const customerValidationError = getCustomerValidationError(customer, {
          // Agent flow never collects email — always make it optional
          emailOptional: true,
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

        const linkedCustomerId = await resolveCustomerIdForUser(supabase, user).catch((customerError) => {
          console.error("[razorpay/create-order] customer_link_lookup_failed", customerError);
          return null;
        });
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
          title: services.map((service) => service.title).join(", "),
          slug: serviceSlugs.join(","),
          slugs: serviceSlugs,
          category: services.map((service) => service.category).filter(Boolean).join(", "),
          category_slug: services.map((service) => service.category ? service.category.toLowerCase().replace(/[^a-z0-9]+/g, "-") : "").filter(Boolean).join(", "),
          price: serviceAmount,
          services: services.map((service) => ({
            title: service.title,
            slug: service.slug,
            category: service.category,
            categorySlug: service.category ? service.category.toLowerCase().replace(/[^a-z0-9]+/g, "-") : "services",
            amount: Number(service.customer_fee),
            documents: service.required_documents_list ?? [],
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
        const applicationsToInsert = services.map((service) => {
          let serviceAmountForRow = Number(service.customer_fee);
          if (service.slug === "cm-yuva-entrepreneur-loan-assistance" && couponDiscount > 0) {
            serviceAmountForRow = serviceAmountForRow - couponDiscount;
          }
          const walletAmountForRow = Math.min(remainingWalletToAllocate, serviceAmountForRow);
          remainingWalletToAllocate = Math.max(0, remainingWalletToAllocate - walletAmountForRow);
          const freshAmountForRow = Math.max(0, serviceAmountForRow - walletAmountForRow);

          const commissionRaw = service.payout_type === "percentage"
            ? Math.round((Number(service.customer_fee) * Number(service.payout_percentage)) / 100)
            : Number(service.agent_payout);
          const commissionAmount = Number.isFinite(commissionRaw) ? commissionRaw : 0;

          return {
            user_id: user.id,
            customer_id: linkedCustomerId,
            agency_partner_id: resolvedAgentOrReferralId,
            customer_email: customer.email.toLowerCase(),
            customer_mobile: customer.mobile.replace(/\D/g, ""),
            service_slug: service.slug,
            service_name: service.title,
            amount: serviceAmountForRow,
            total_amount: serviceAmountForRow,
            wallet_used_amount: walletAmountForRow,
            wallet_redeemed_amount: walletAmountForRow,
            real_payment_amount: freshAmountForRow,
            fresh_payable_amount: freshAmountForRow,
            cashback_eligible_amount: freshAmountForRow,
            commission_amount: commissionAmount,
            form_data: formData,
            customer_details: customerDetails,
            service_snapshot: serviceSnapshot,
            metadata,
            status: "payment_pending",
            payment_status: "pending",
            created_by: user.id,
            application_source: body.applicationDraft?.details?.applicationSource || (resolvedAgentOrReferralId ? "partner_assisted" : "customer_self"),
            referral_source: body.applicationDraft?.details?.referralSource || (resolvedReferralToken ? "partner_link" : null),
            referral_token: resolvedReferralToken,
            payment_link_id: body.applicationDraft?.details?.paymentLinkId || null,
            // applications.source is the Postgres enum application_source — only enum-safe values here.
            source: resolveApplicationSourceEnum(isPartnerFlow),
            source_channel: resolveSourceChannel({ isPartnerFlow, isReferral: Boolean(resolvedReferralToken) }),
            submitted_by_role: isPartnerFlow ? "agency_partner" : "customer",
          };
        });

        const { data: applications, error: applicationError } = await supabase
          .from("applications")
          .insert(applicationsToInsert)
          .select("id");

        if (applicationError || !applications?.length) {
          console.error("[razorpay/create-order] payment_pending_application_insert_failed", {
            operation: "payment_pending_application_insert",
            userId: user.id,
            agencyPartnerId: ap?.id ?? partnerIdFromMembership ?? null,
            serviceSlugs,
            amountPaise: amount,
            supabaseCode: applicationError?.code ?? null,
            supabaseMessage: applicationError?.message ?? null,
            supabaseDetails: applicationError?.details ?? null,
            supabaseHint: applicationError?.hint ?? null,
          });
          const isSchemaMismatch =
            applicationError?.code === "22P02" ||
            applicationError?.code === "PGRST204" ||
            applicationError?.code === "23514";
          return jsonError(
            isSchemaMismatch
              ? "Application could not be prepared for payment. Please contact support (configuration error)."
              : "Application could not be prepared for payment.",
            500,
            applicationError?.code === "22P02"
              ? "application_source_enum_mismatch"
              : applicationError?.code === "23514"
                ? "application_constraint_violation"
                : "application_prepare_failed",
          );
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

      if (application.payment_status === "verified" || application.payment_status === "paid") {
        return jsonError("Payment already completed.", 400, "already_paid");
      }

      const freshPayableAmount = Number(application.fresh_payable_amount ?? application.real_payment_amount ?? application.amount ?? 0);
      const expectedAmount = rupeesToPaise(freshPayableAmount);

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
          servicePrice: Number(application.total_amount ?? application.amount ?? 0),
          walletUsed: walletRedeemAmount,
          rewardUsed: walletRedeemAmount,
          finalPayable: 0,
        });
      }

      amount = expectedAmount;
      applicationIds = [application.id];
      orderUserId = user.id;
      walletRedeemAmount = Number(application.wallet_redeemed_amount ?? application.wallet_used_amount ?? 0);
      servicePrice = Number(application.total_amount ?? application.amount ?? 0);
      walletUsed = walletRedeemAmount;
      rewardUsed = walletRedeemAmount;
      finalPayable = freshPayableAmount;
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
      return jsonError("Online payment is temporarily unavailable.", 503, "razorpay_not_configured");
    }

    console.log(`[CREATE-ORDER] Requesting Razorpay order creation for amount: ${amount} paise, currency: ${currency}, receipt: ${receipt}`);
    const order = await razorpay.orders.create({
      amount,
      currency,
      receipt,
    });
    console.log(`[CREATE-ORDER] Razorpay order creation result:`, order);

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

    if (applicationIds.length) {
      // Unpaid / payment-pending applications must still appear in office CRM.
      // Await enqueue so Vercel cannot freeze before crm_sync_jobs insert.
      await scheduleCrmSyncMany(applicationIds, "application_created");
    }

    return NextResponse.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      application_id: applicationIds[0],
      application_ids: applicationIds,
      servicePrice,
      walletUsed,
      rewardUsed,
      finalPayable,
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
