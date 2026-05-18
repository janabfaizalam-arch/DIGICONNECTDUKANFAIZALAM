import { NextResponse } from "next/server";
import crypto from "crypto";

import { createAdminNotifications, type CreateAdminNotificationInput } from "@/lib/admin-notifications";
import { getCurrentUser, getCurrentUserRole, syncUserProfile } from "@/lib/auth";
import { createInvoiceForApplication } from "@/lib/crm";
import { getRazorpayClient, getRazorpayKeySecret } from "@/lib/razorpay";
import { calculateWalletRedeemBreakdown } from "@/lib/reward-rules";
import { createWalletIfMissing } from "@/lib/rewards-wallet";
import { getPublicServiceBySlug } from "@/lib/services";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getRewardRuleForOrder, redeemWalletForApplication } from "@/lib/wallet";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

type UploadedDocument = {
  document_type: string;
  file_name: string;
  file_url: string;
  file_type?: string;
  storage_path?: string;
};

type VerifiedRazorpayPayment = {
  razorpay_payment_id?: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
  amount_paise?: number;
};

type ApplicationPayload = {
  serviceSlug?: string;
  serviceSlugs?: string[];
  applicationIds?: string[];
  price?: number;
  customer?: {
    name?: string;
    mobile?: string;
    email?: string;
    city?: string;
    message?: string;
  };
  details?: Record<string, string>;
  documents?: UploadedDocument[];
  razorpayPayment?: VerifiedRazorpayPayment | null;
  walletUseAmount?: number;
};

type RazorpayPaymentDetails = {
  id?: string;
  order_id?: string;
  amount?: number;
  status?: string;
  method?: string;
  created_at?: number;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function required(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

function isItrMsmeCombo(serviceSlugs: string[]) {
  return serviceSlugs.includes("itr-filing") && serviceSlugs.includes("msme-certificate");
}

function devInfo(message: string, details?: Record<string, unknown>) {
  if (process.env.NODE_ENV === "development") {
    console.info(message, details ?? {});
  }
}

function isVerifiedRazorpayPayment(value: VerifiedRazorpayPayment | null | undefined, expectedAmountPaise: number) {
  const keySecret = getRazorpayKeySecret();

  if (!keySecret || !value?.razorpay_order_id || !value.razorpay_payment_id || !value.razorpay_signature) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(`${value.razorpay_order_id}|${value.razorpay_payment_id}`)
    .digest("hex");

  return Boolean(
    expectedSignature === value.razorpay_signature &&
      Number(value.amount_paise ?? 0) === expectedAmountPaise,
  );
}

async function fetchRazorpayPaymentDetails(paymentId: string) {
  const razorpay = getRazorpayClient();

  if (!razorpay) {
    return null;
  }

  try {
    return (await razorpay.payments.fetch(paymentId)) as RazorpayPaymentDetails;
  } catch (error) {
    console.warn("[applications] Razorpay payment details could not be fetched", {
      paymentId,
      message: error instanceof Error ? error.message : "Unknown Razorpay error",
    });
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const rateLimit = checkRateLimit(`applications:${getClientIp(request)}`, 20, 60_000);

    if (!rateLimit.ok) {
      return rateLimitResponse(rateLimit.retryAfter);
    }

    const user = await getCurrentUser();

    if (!user) {
      return jsonError("Please login to apply.", 401);
    }

    await syncUserProfile(user);
    const role = await getCurrentUserRole(user);

    const supabase = getSupabaseAdmin();

    if (!supabase) {
      return jsonError("Supabase service role key is missing.", 500);
    }

    let body: ApplicationPayload;

    try {
      body = (await request.json()) as ApplicationPayload;
    } catch {
      return jsonError("Invalid JSON payload.", 400);
    }

    const serviceSlugs = Array.from(new Set((Array.isArray(body.serviceSlugs) && body.serviceSlugs.length ? body.serviceSlugs : [body.serviceSlug]).map((slug) => String(slug ?? "").trim()).filter(Boolean)));
    const services = await Promise.all(serviceSlugs.map((slug) => getPublicServiceBySlug(slug)));

    if (!services.length || services.some((service) => !service)) {
      return jsonError("Service not found.", 404);
    }

    const resolvedServices = services.filter((service): service is NonNullable<typeof service> => Boolean(service));
    const comboOrder = isItrMsmeCombo(resolvedServices.map((service) => service.slug));
    const orderAmount = comboOrder ? 699 : resolvedServices.reduce((total, service) => total + Number(service.amount ?? 0), 0);
    const requestedWalletAmount = Math.max(0, Math.round(Number(body.walletUseAmount ?? 0)));
    const rewardRule = await getRewardRuleForOrder(resolvedServices.map((service) => service.slug));
    void rewardRule;
    const wallet = await createWalletIfMissing(user.id);
    const redeem = calculateWalletRedeemBreakdown({
      serviceAmount: orderAmount,
      walletBalance: Number(wallet.balance ?? 0),
      requestedRedeem: requestedWalletAmount,
    });
    const walletRedeemAmount = redeem.walletRedeem;
    const realPaymentAmount = redeem.freshPayable;
    const expectedRazorpayAmountPaise = Math.round(realPaymentAmount * 100);

    if (redeem.wasClamped) {
      console.warn("[applications] Wallet redeem clamped to 50% cap", redeem);
    }

    devInfo("[applications] Wallet redeem calculation", {
      serviceAmount: redeem.serviceAmount,
      walletBalance: redeem.walletBalance,
      requestedRedeem: redeem.requestedRedeem,
      walletHalf: redeem.walletHalf,
      serviceHalf: redeem.serviceHalf,
      maxRedeem: redeem.maxRedeem,
      finalRedeem: redeem.walletRedeem,
      freshPayable: redeem.freshPayable,
    });

    if (orderAmount > 0 && realPaymentAmount < redeem.minimumFreshPayable) {
      return jsonError("Wallet redeem cannot exceed 50% of wallet balance and 50% of service amount", 400);
    }

    const customer = body.customer ?? {};
    const requiredCustomerFields = [
      ["name", "Name"],
      ["mobile", "Mobile"],
      ["email", "Email"],
      ["city", "City"],
    ] as const;

    for (const [fieldName, label] of requiredCustomerFields) {
      if (!required(customer[fieldName])) {
        return jsonError(`${label} is required.`, 400);
      }
    }

    const details = body.details ?? {};

    if (!Array.isArray(body.documents) || body.documents.length < 1) {
      return jsonError("Please upload Aadhaar / Documents.", 400);
    }

    for (const document of body.documents) {
      if (!document.file_name || !document.file_url) {
        return jsonError("Uploaded document metadata is invalid.", 400);
      }
    }

    const hasVerifiedRazorpayPayment = orderAmount === 0 || isVerifiedRazorpayPayment(body.razorpayPayment, expectedRazorpayAmountPaise);

    if (!hasVerifiedRazorpayPayment) {
      return jsonError("Please complete Razorpay checkout before submitting.", 400);
    }

    const razorpayDetails =
      hasVerifiedRazorpayPayment && body.razorpayPayment?.razorpay_payment_id
        ? await fetchRazorpayPaymentDetails(body.razorpayPayment.razorpay_payment_id)
        : null;

    if (
      hasVerifiedRazorpayPayment &&
      razorpayDetails?.amount !== undefined &&
      Number(razorpayDetails.amount) !== expectedRazorpayAmountPaise
    ) {
      return jsonError("Verified Razorpay amount does not match payable amount.", 400);
    }

    const paidAt = razorpayDetails?.created_at
      ? new Date(razorpayDetails.created_at * 1000).toISOString()
      : hasVerifiedRazorpayPayment
        ? new Date().toISOString()
        : null;

    const formData = {
      service: resolvedServices.map((service) => service.title).join(", "),
      name: customer.name!.trim(),
      mobile: customer.mobile!.trim(),
      email: customer.email!.trim().toLowerCase(),
      city: customer.city!.trim(),
      message: customer.message?.trim() ?? "",
      service_slugs: resolvedServices.map((service) => service.slug),
      payment: {
        total_amount: orderAmount,
        wallet_redeemed_amount: walletRedeemAmount,
        fresh_payable_amount: realPaymentAmount,
        cashback_eligible_amount: realPaymentAmount,
      },
      ...Object.fromEntries(Object.entries(details).map(([key, value]) => [key, String(value ?? "").trim()])),
      documents: body.documents,
    };
    const customerDetails = {
      name: customer.name!.trim(),
      mobile: customer.mobile!.trim(),
      email: customer.email?.trim() ?? "",
      city: customer.city?.trim() ?? "",
      address: String(details.address ?? "").trim(),
      notes: customer.message?.trim() ?? "",
    };
    const serviceSnapshot = {
      title: resolvedServices.map((service) => service.title).join(", "),
      slug: resolvedServices.map((service) => service.slug).join(","),
      slugs: resolvedServices.map((service) => service.slug),
      category: resolvedServices.map((service) => service.category).filter(Boolean).join(", "),
      category_slug: resolvedServices.map((service) => service.categorySlug).filter(Boolean).join(", "),
      price: orderAmount,
      services: resolvedServices.map((service) => ({
        title: service.title,
        slug: service.slug,
        category: service.category,
        categorySlug: service.categorySlug,
        amount: service.amount,
        documents: service.documents,
      })),
    };
    const applicationMetadata = {
      source: "customer_service_application",
      payment: {
        total_amount: orderAmount,
        wallet_redeemed_amount: walletRedeemAmount,
        fresh_payable_amount: realPaymentAmount,
        cashback_eligible_amount: realPaymentAmount,
      },
      razorpay_order_id: body.razorpayPayment?.razorpay_order_id ?? null,
      razorpay_payment_id: body.razorpayPayment?.razorpay_payment_id ?? null,
    };
    const { data: linkedCustomer } = await supabase
      .from("customers")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    const existingApplicationIds = Array.from(
      new Set((Array.isArray(body.applicationIds) ? body.applicationIds : [])
        .map((id) => String(id ?? "").trim())
        .filter(Boolean)),
    );

    if (existingApplicationIds.length) {
      const { data: existingApplications, error: existingApplicationsError } = await supabase
        .from("applications")
        .select("id, user_id, service_name, service_slug, amount, payment_status, razorpay_order_id, razorpay_payment_id, customer_id")
        .in("id", existingApplicationIds)
        .eq("user_id", user.id);

      if (existingApplicationsError || !existingApplications?.length) {
        console.error("[applications] Existing payment-pending application lookup failed", {
          userId: user.id,
          existingApplicationIds,
          error: existingApplicationsError,
        });
        return jsonError("Paid application could not be found. Please contact support.", 500);
      }

      if (!existingApplications.every((application) => application.payment_status === "verified")) {
        return jsonError("Payment has not been verified for this application yet.", 400);
      }

      const expectedOrderId = body.razorpayPayment?.razorpay_order_id ?? null;
      const orderMismatch = expectedOrderId && existingApplications.some((application) => application.razorpay_order_id !== expectedOrderId);

      if (orderMismatch) {
        return jsonError("Payment order does not match this application.", 400);
      }

      const existingIds = existingApplications.map((application) => application.id);
      const { error: updateError } = await supabase
        .from("applications")
        .update({
          form_data: formData,
          customer_details: customerDetails,
          service_snapshot: serviceSnapshot,
          metadata: applicationMetadata,
          status: "submitted",
          payment_status: "verified",
          razorpay_order_id: body.razorpayPayment?.razorpay_order_id ?? existingApplications[0]?.razorpay_order_id ?? null,
          razorpay_payment_id: body.razorpayPayment?.razorpay_payment_id ?? existingApplications[0]?.razorpay_payment_id ?? null,
          submitted_at: new Date().toISOString(),
          customer_id: linkedCustomer?.id ?? existingApplications[0]?.customer_id ?? null,
          customer_email: customer.email!.trim().toLowerCase(),
          customer_mobile: customer.mobile!.replace(/\D/g, ""),
          updated_at: new Date().toISOString(),
        })
        .in("id", existingIds);

      if (updateError) {
        console.error("[applications] Existing application finalization failed", {
          userId: user.id,
          existingIds,
          error: updateError,
        });
        return jsonError("Application could not be finalized after payment. Please contact support.", 500);
      }

      await supabase.from("application_documents").delete().in("application_id", existingIds);

      const documentsToInsert = existingApplications.flatMap((application) =>
        body.documents!.map((document) => ({
          application_id: application.id,
          user_id: user.id,
          document_type: document.document_type,
          document_name: document.document_type,
          file_name: document.file_name,
          file_url: document.file_url,
          file_type: document.file_type ?? null,
          storage_path: document.storage_path ?? null,
          customer_id: linkedCustomer?.id ?? application.customer_id ?? null,
          status: "pending",
          uploaded_at: new Date().toISOString(),
          metadata: {
            application_id: application.id,
            source: "customer_finalize_existing_application",
          },
        })),
      );
      const { error: documentsError } = await supabase.from("application_documents").insert(documentsToInsert);

      if (documentsError) {
        console.error("[applications] Existing application documents save failed", {
          userId: user.id,
          existingIds,
          error: documentsError,
        });
        return jsonError("Documents could not be saved.", 500);
      }

      const serviceName = existingApplications.map((application) => application.service_name).join(", ");
      const invoice = await createInvoiceForApplication({
        applicationId: existingApplications[0].id,
        userId: user.id,
        customerId: linkedCustomer?.id ?? existingApplications[0]?.customer_id ?? null,
        customerName: customer.name!.trim(),
        customerEmail: customer.email?.trim() ?? "",
        customerMobile: customer.mobile!.trim(),
        serviceName,
        amount: orderAmount,
        paymentStatus: "verified",
      });

      if (!invoice) {
        console.error("[applications] Existing application invoice creation failed", {
          userId: user.id,
          applicationId: existingApplications[0].id,
        });
        return jsonError("Invoice could not be generated.", 500);
      }

      await supabase.from("notifications").insert(
        existingApplications.map((application) => ({
          user_id: user.id,
          application_id: application.id,
          title: "Payment received - application submitted",
          message: `${application.service_name} payment has been received and your application was submitted.`,
        })),
      );

      await createAdminNotifications(
        supabase,
        existingApplications.flatMap((application) => [
          {
            type: "new_application" as const,
            title: "Paid application submitted",
            message: `${customer.name!.trim()} submitted ${application.service_name} after verified Razorpay payment.`,
            relatedType: "application" as const,
            relatedId: application.id,
          },
          {
            type: "document_uploaded" as const,
            title: "Documents uploaded",
            message: `${customer.name!.trim()} uploaded ${body.documents!.length} document(s) for ${application.service_name}.`,
            relatedType: "document" as const,
            relatedId: application.id,
          },
        ]),
      );

      return NextResponse.json({
        message:
          existingApplications.length > 1
            ? "Applications submitted successfully. One combined invoice has been generated."
            : "Payment received - application submitted. Track the status in your dashboard.",
        applicationId: existingApplications[0].id,
        applicationIds: existingIds,
        invoiceId: invoice.id,
      });
    }

    let remainingWalletForApplications = walletRedeemAmount;
    const applicationsToInsert = resolvedServices.map((service, index) => {
      const rowAmount = comboOrder ? (index === 0 ? orderAmount : 0) : Number(service.amount ?? 0);
      const rowWalletRedeem = Math.min(remainingWalletForApplications, rowAmount);
      remainingWalletForApplications = Math.max(0, remainingWalletForApplications - rowWalletRedeem);
      const rowFreshPayable = Math.max(0, rowAmount - rowWalletRedeem);

      return {
        user_id: user.id,
        customer_id: linkedCustomer?.id ?? null,
        customer_email: customer.email!.trim().toLowerCase(),
        customer_mobile: customer.mobile!.replace(/\D/g, ""),
        service_slug: service.slug,
        service_name: service.title,
        amount: rowAmount,
        total_amount: rowAmount,
        wallet_used_amount: rowWalletRedeem,
        wallet_redeemed_amount: rowWalletRedeem,
        real_payment_amount: rowFreshPayable,
        fresh_payable_amount: rowFreshPayable,
        cashback_eligible_amount: rowFreshPayable,
        form_data: formData,
        customer_details: customerDetails,
        service_snapshot: serviceSnapshot,
        metadata: applicationMetadata,
        status: hasVerifiedRazorpayPayment ? "submitted" : "payment_pending",
        created_by: user.id,
        source: "online",
        payment_status: hasVerifiedRazorpayPayment ? "verified" : "pending",
        submitted_by_role: role,
      };
    });

    const { data: applications, error: applicationError } = await supabase
      .from("applications")
      .insert(applicationsToInsert)
      .select("id, service_name, amount");

    if (applicationError || !applications?.length) {
      return jsonError("Application submission failed.", 500);
    }

    const documentsToInsert = applications.flatMap((application) =>
      body.documents!.map((document) => ({
        application_id: application.id,
        user_id: user.id,
        document_type: document.document_type,
        document_name: document.document_type,
        file_name: document.file_name,
        file_url: document.file_url,
        file_type: document.file_type ?? null,
        storage_path: document.storage_path ?? null,
        customer_id: linkedCustomer?.id ?? null,
        status: "pending",
        uploaded_at: new Date().toISOString(),
        metadata: {
          application_id: application.id,
          source: "customer_new_application",
        },
      })),
    );

    const { error: documentsError } = await supabase.from("application_documents").insert(documentsToInsert);

    if (documentsError) {
      return jsonError("Documents could not be saved.", 500);
    }

    let remainingWalletToApply = walletRedeemAmount;
    const paymentRows = applications.map((application) => {
      const applicationAmount = Number(application.amount ?? 0);
      const applicationWalletAmount = Math.min(applicationAmount, remainingWalletToApply);
      remainingWalletToApply -= applicationWalletAmount;

      return {
        application_id: application.id,
        user_id: user.id,
        amount: Math.max(0, applicationAmount - applicationWalletAmount),
        wallet_used_amount: applicationWalletAmount,
        real_payment_amount: Math.max(0, applicationAmount - applicationWalletAmount),
        status: hasVerifiedRazorpayPayment ? "verified" : "pending",
        razorpay_order_id: body.razorpayPayment?.razorpay_order_id ?? razorpayDetails?.order_id ?? null,
        razorpay_payment_id: body.razorpayPayment?.razorpay_payment_id ?? razorpayDetails?.id ?? null,
        razorpay_signature: body.razorpayPayment?.razorpay_signature ?? null,
        razorpay_status: razorpayDetails?.status ?? (hasVerifiedRazorpayPayment ? "verified" : "pending"),
        payment_method: razorpayDetails?.method ?? null,
        paid_at: paidAt,
      };
    });

    const { data: insertedPayments, error: paymentError } = await supabase.from("payments").insert(paymentRows).select("id, application_id, wallet_used_amount, real_payment_amount");

    if (paymentError || !insertedPayments?.length) {
      return jsonError("Payment details could not be saved.", 500);
    }

    let walletUsedAmount = 0;

    if (walletRedeemAmount > 0) {
      walletUsedAmount = await redeemWalletForApplication({
        userId: user.id,
        applicationId: applications[0].id,
        serviceName: applications.map((application) => application.service_name).join(", "),
        orderAmount,
        requestedAmount: walletRedeemAmount,
        maxRedemptionPercent: 50,
      });
    }

    if (walletUsedAmount > 0) {
      remainingWalletToApply = walletUsedAmount;
      await Promise.all(
        applications.map((application) => {
          const applicationAmount = Number(application.amount ?? 0);
          const applicationWalletAmount = Math.min(applicationAmount, remainingWalletToApply);
          remainingWalletToApply -= applicationWalletAmount;
          const freshAmount = Math.max(0, applicationAmount - applicationWalletAmount);

          return Promise.all([
            supabase
              .from("applications")
              .update({
                wallet_used_amount: applicationWalletAmount,
                wallet_redeemed_amount: applicationWalletAmount,
                real_payment_amount: freshAmount,
                fresh_payable_amount: freshAmount,
                cashback_eligible_amount: freshAmount,
                updated_at: new Date().toISOString(),
              })
              .eq("id", application.id),
            supabase
              .from("payments")
              .update({
                wallet_used_amount: applicationWalletAmount,
                real_payment_amount: freshAmount,
              })
              .eq("application_id", application.id),
          ]);
        }),
      );
    }

    const totalAmount = orderAmount;
    const serviceName = applications.map((application) => application.service_name).join(", ");
    const invoice = await createInvoiceForApplication({
      applicationId: applications[0].id,
      userId: user.id,
      customerName: customer.name!.trim(),
      customerEmail: customer.email?.trim() ?? "",
      customerMobile: customer.mobile!.trim(),
      serviceName,
      amount: totalAmount,
      paymentStatus: hasVerifiedRazorpayPayment ? "verified" : "pending",
    });

    if (!invoice) {
      return jsonError("Invoice could not be generated.", 500);
    }

    if (walletUsedAmount > 0) {
      await supabase
        .from("invoices")
        .update({
          wallet_used_amount: walletUsedAmount,
          real_payment_amount: realPaymentAmount,
        })
        .eq("id", invoice.id);
    }

    await supabase.from("notifications").insert(
      applications.map((application) => ({
        user_id: user.id,
        application_id: application.id,
        title: "Application received",
        message: `${application.service_name} request has been received. Our team will verify it shortly.`,
      })),
    );

    await createAdminNotifications(
      supabase,
      applications.flatMap((application) => {
        const baseNotifications: CreateAdminNotificationInput[] = [
          {
            type: "new_application" as const,
            title: "New application received",
            message: `${customer.name!.trim()} submitted ${application.service_name}.`,
            relatedType: "application" as const,
            relatedId: application.id,
          },
          {
            type: "document_uploaded" as const,
            title: "Documents uploaded",
            message: `${customer.name!.trim()} uploaded ${body.documents!.length} document(s) for ${application.service_name}.`,
            relatedType: "document" as const,
            relatedId: application.id,
          },
        ];

        if (!hasVerifiedRazorpayPayment) {
          baseNotifications.push({
            type: "payment_pending",
            title: "Payment pending",
            message: `${customer.name!.trim()} has a pending payment for ${application.service_name}.`,
            relatedType: "payment",
            relatedId: application.id,
          });
        }

        return baseNotifications;
      }),
    );

    if (walletUsedAmount > 0) {
      await supabase.from("notifications").insert({
        user_id: user.id,
        application_id: applications[0].id,
        title: "DigiWallet used successfully",
        message: `Rs ${walletUsedAmount.toLocaleString("en-IN")} DigiWallet credit was applied. Please pay Rs ${realPaymentAmount.toLocaleString("en-IN")} securely with Razorpay.`,
      });
    }

    if (hasVerifiedRazorpayPayment && body.razorpayPayment?.razorpay_payment_id) {
      await supabase.from("notifications").insert({
        user_id: user.id,
        application_id: applications[0].id,
        title: "Payment verified",
        message: `Razorpay payment ${body.razorpayPayment.razorpay_payment_id} has been verified successfully.`,
      });
    }

    return NextResponse.json({
      message:
        applications.length > 1
          ? "Applications submitted successfully. One combined invoice has been generated."
          : "Application submitted successfully. Track the status in your dashboard.",
      applicationId: applications[0].id,
      applicationIds: applications.map((application) => application.id),
      invoiceId: invoice.id,
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Something went wrong. Please try again.", 500);
  }
}
