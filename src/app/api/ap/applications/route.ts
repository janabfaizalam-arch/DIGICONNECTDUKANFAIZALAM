import { NextResponse } from "next/server";
import crypto from "crypto";

import { createAdminNotifications } from "@/lib/admin-notifications";
import { getVisibleAgentServices, payoutForAgentService } from "@/lib/agent-services";
import { getCurrentUser, getCurrentUserRole, isActiveAgent } from "@/lib/auth";
import { cleanFileName, createInvoiceForApplication } from "@/lib/crm";
import { createInvoiceNumber } from "@/lib/portal-data";
import { getRazorpayClient, getRazorpayKeySecret } from "@/lib/razorpay";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { getAgencyPartnerByUserId } from "@/lib/ap-data";
import { createCommissionForApplication } from "@/lib/ap-commission-engine";
import { linkCustomerApplicationsByMobile } from "@/lib/ap-customer-linking";

const allowedFileTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const maxFileSize = 5 * 1024 * 1024;

function jsonError(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

function validateFile(file: File, label: string) {
  if (!allowedFileTypes.includes(file.type)) {
    return `${label} must be PDF, JPG, PNG, or WEBP.`;
  }

  if (file.size > maxFileSize) {
    return `${label} must be smaller than 5MB.`;
  }

  return null;
}

async function uploadFile(applicationId: string, ownerId: string, file: File, folder: string) {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    throw new Error("Supabase service role key is missing.");
  }

  const path = `${ownerId}/${applicationId}/${folder}/${Date.now()}-${cleanFileName(file.name)}`;
  const bytes = await file.arrayBuffer();
  const { error } = await supabase.storage.from("application-documents").upload(path, bytes, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });

  if (error) {
    throw error;
  }

  const { data } = await supabase.storage.from("application-documents").createSignedUrl(path, 60 * 60);

  return {
    file_name: file.name,
    file_url: data?.signedUrl ?? "",
    file_type: file.type,
    storage_path: path,
  };
}

function isVerifiedRazorpayPayment({
  orderId,
  paymentId,
  signature,
  amountPaise,
  expectedAmountPaise,
}: {
  orderId: string;
  paymentId: string;
  signature: string;
  amountPaise: number;
  expectedAmountPaise: number;
}) {
  const keySecret = getRazorpayKeySecret();

  if (!keySecret || !orderId || !paymentId || !signature) {
    return false;
  }

  const expectedSignature = crypto.createHmac("sha256", keySecret).update(`${orderId}|${paymentId}`).digest("hex");

  return expectedSignature === signature && amountPaise === expectedAmountPaise;
}

async function fetchRazorpayPaymentDetails(paymentId: string) {
  const razorpay = getRazorpayClient();

  if (!razorpay) {
    return null;
  }

  try {
    return (await razorpay.payments.fetch(paymentId)) as {
      id?: string;
      order_id?: string;
      amount?: number;
      status?: string;
      method?: string;
      created_at?: number;
    };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const rateLimit = checkRateLimit(`ap-applications:${getClientIp(request)}`, 20, 60_000);

    if (!rateLimit.ok) {
      return rateLimitResponse(rateLimit.retryAfter);
    }

    const user = await getCurrentUser();

    if (!user || !(await isActiveAgent(user))) {
      return jsonError("Agency Partner access required.", 403);
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return jsonError("Supabase service role key is missing.", 500);
    }

    // Lookup AP record
    const ap = await getAgencyPartnerByUserId(user.id);
    if (!ap) {
      return jsonError("Agency Partner record not found or profile is not active.", 403);
    }

    if (ap.status !== "active" || ap.kyc_status !== "approved") {
      return jsonError("Your Agency Partner profile is pending KYC approval or suspended.", 403);
    }

    const formData = await request.formData();
    const customerId = String(formData.get("customerId") ?? "").trim();
    const agentServiceId = String(formData.get("agentServiceId") ?? "").trim();
    const serviceId = String(formData.get("serviceId") ?? "").trim();
    const customerName = String(formData.get("customerName") ?? formData.get("name") ?? "").trim();
    const mobile = String(formData.get("mobile") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const pincode = String(formData.get("pincode") ?? "").replace(/\D/g, "").slice(0, 6);
    const city = String(formData.get("city") ?? "").trim();
    const district = String(formData.get("district") ?? "").trim();
    const state = String(formData.get("state") ?? "").trim();
    const message = String(formData.get("message") ?? "").trim();
    const address = String(formData.get("address") ?? "").trim();
    const pmVishwakarmaDetails = {
      pincode,
      district,
      state,
      maritalStatus: String(formData.get("maritalStatus") ?? "").trim(),
      casteCategory: String(formData.get("casteCategory") ?? "").trim(),
      tradeWorkType: String(formData.get("tradeWorkType") ?? "").trim(),
      traditionalOccupationCommunity: String(formData.get("traditionalOccupationCommunity") ?? "").trim(),
      migrantWorker: String(formData.get("migrantWorker") ?? "").trim(),
      upResidentFamilyBenefit: String(formData.get("upResidentFamilyBenefit") ?? "").trim(),
      termsAccepted: formData.get("termsAccepted") === "true" ? "true" : "",
      address,
    };
    const razorpayPaymentId = String(formData.get("razorpay_payment_id") ?? "").trim();
    const razorpayOrderId = String(formData.get("razorpay_order_id") ?? "").trim();
    const razorpaySignature = String(formData.get("razorpay_signature") ?? "").trim();
    const razorpayAmountPaise = Math.round(Number(formData.get("razorpay_amount_paise") ?? 0));
    const documentFiles = formData.getAll("documents").filter((value): value is File => value instanceof File && value.size > 0);

    if (!agentServiceId) {
      return jsonError("Service is required.", 400);
    }

    for (const file of documentFiles) {
      const validation = validateFile(file, file.name);
      if (validation) {
        return jsonError(validation, 400);
      }
    }

    const visibleServices = await getVisibleAgentServices(user.id);
    const service = visibleServices.find((item) => item.id === agentServiceId);

    if (!service) {
      return jsonError("Service not found.", 404);
    }

    const isPmVishwakarmaApplication = service.slug === "pm-vishwakarma-yojana";

    if (!customerId && (!customerName || !mobile || !pincode || !city || !state || (!isPmVishwakarmaApplication && !email))) {
      return jsonError(
        isPmVishwakarmaApplication
          ? "Customer name, mobile, pincode, city, and state are required."
          : "Customer name, email, mobile, pincode, city, and state are required.",
        400,
      );
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonError("Enter a valid customer email.", 400);
    }

    const normalizedMobile = mobile.replace(/\D/g, "").slice(-10);
    if (mobile && normalizedMobile.length !== 10) {
      return jsonError("Enter a valid 10 digit Indian mobile number.", 400);
    }

    if (pincode && !/^\d{6}$/.test(pincode)) {
      return jsonError("Enter a valid 6 digit PIN code.", 400);
    }

    if (isPmVishwakarmaApplication) {
      const missingPmField = Object.entries(pmVishwakarmaDetails).find(([key, value]) => key !== "address" && !value);
      if (missingPmField) {
        return jsonError("Please complete all required PM Vishwakarma fields.", 400);
      }
    }

    const expectedAmountPaise = Math.round(Number(service.customer_fee ?? 0) * 100);

    if (
      expectedAmountPaise > 0 &&
      !isVerifiedRazorpayPayment({
        orderId: razorpayOrderId,
        paymentId: razorpayPaymentId,
        signature: razorpaySignature,
        amountPaise: razorpayAmountPaise,
        expectedAmountPaise,
      })
    ) {
      return jsonError("Please complete Razorpay checkout before submitting.", 400);
    }

    const razorpayDetails = razorpayPaymentId ? await fetchRazorpayPaymentDetails(razorpayPaymentId) : null;

    if (expectedAmountPaise > 0) {
      if (!razorpayDetails) {
        return jsonError("Razorpay payment could not be verified on the server.", 400);
      }

      if (razorpayDetails.order_id !== razorpayOrderId || razorpayDetails.id !== razorpayPaymentId) {
        return jsonError("Razorpay payment does not match the verified order.", 400);
      }

      if (Number(razorpayDetails.amount ?? 0) !== expectedAmountPaise) {
        return jsonError("Razorpay payment amount does not match the selected service.", 400);
      }

      if (!["captured", "authorized"].includes(String(razorpayDetails.status ?? "").toLowerCase())) {
        return jsonError("Razorpay payment is not successful yet.", 400);
      }
    }

    const paidAt = razorpayDetails?.created_at ? new Date(razorpayDetails.created_at * 1000).toISOString() : new Date().toISOString();

    let resolvedCustomerId = customerId;
    let customer = null as { id: string; full_name: string; mobile: string; email: string | null; city: string | null; pincode?: string | null; state?: string | null } | null;

    if (resolvedCustomerId) {
      const { data } = await supabase
        .from("customers")
        .select("id, full_name, mobile, email, city, pincode, state")
        .eq("id", resolvedCustomerId)
        .or(`created_by.eq.${user.id},assigned_agent_id.eq.${user.id}`)
        .single();
      customer = data;
      if (isPmVishwakarmaApplication && customer) {
        const { data: updatedCustomer } = await supabase
          .from("customers")
          .update({
            full_name: customerName || customer.full_name,
            mobile: normalizedMobile || customer.mobile,
            email: email ? email.toLowerCase() : customer.email,
            ...(address ? { address } : {}),
            city: city || customer.city,
            pincode: pincode || customer.pincode,
            state: state || customer.state,
            updated_at: new Date().toISOString(),
          })
          .eq("id", resolvedCustomerId)
          .select("id, full_name, mobile, email, city, pincode, state")
          .single();
        customer = updatedCustomer ?? customer;
      } else if (!customer?.email || !customer.mobile || !customer.pincode || !customer.city || !customer.state) {
        return jsonError("Selected customer is missing email, mobile, pincode, city, or state.", 400);
      }
    } else {
      const { data, error } = await supabase
        .from("customers")
        .insert({
          full_name: customerName,
          mobile: normalizedMobile,
          email: email ? email.toLowerCase() : null,
          address: address || null,
          city,
          pincode,
          state,
          source: "agency_partner_pos",
          created_by: user.id,
          assigned_agent_id: user.id,
        })
        .select("id, full_name, mobile, email, city, pincode, state")
        .single();

      if (error || !data) {
        return jsonError("Customer could not be created.", 500);
      }

      customer = data;
      resolvedCustomerId = data.id;
    }

    if (!customer) {
      return jsonError("Customer not found.", 404);
    }

    const commissionAmount = payoutForAgentService(service);
    const invoiceNumber = createInvoiceNumber();

    const { data: application, error: applicationError } = await supabase
      .from("applications")
      .insert({
        customer_id: resolvedCustomerId,
        agent_id: user.id,
        agency_partner_id: ap.id,
        created_by: user.id,
        assigned_agent_id: user.id,
        created_by_agent_id: user.id,
        customer_email: customer.email?.toLowerCase() ?? email.toLowerCase(),
        customer_mobile: customer.mobile,
        customer_mobile_normalized: normalizedMobile,
        service_id: service.service_id || serviceId || null,
        agent_service_id: service.id,
        service_slug: service.slug,
        service_name: service.title,
        amount: service.customer_fee,
        total_amount: service.customer_fee,
        customer_fee_snapshot: service.customer_fee,
        agent_payout_snapshot: commissionAmount,
        agent_payout_type_snapshot: service.payout_type,
        source_channel: "agency_partner",
        ownership_status: "ap_created",
        service_snapshot: {
          agent_service_id: service.id,
          service_id: service.service_id,
          slug: service.slug,
          title: service.title,
          customer_fee: service.customer_fee,
          agent_payout: service.agent_payout,
          payout_type: service.payout_type,
          payout_percentage: service.payout_percentage,
          required_documents: service.required_documents,
          processing_time: service.processing_time,
        },
        form_data: {
          name: customer.full_name,
          mobile: customer.mobile,
          email: customer.email?.toLowerCase() ?? "",
          pincode: customer.pincode ?? pincode,
          city: customer.city ?? city,
          state: customer.state ?? state,
          ...(isPmVishwakarmaApplication
            ? {
                district,
                maritalStatus: pmVishwakarmaDetails.maritalStatus,
                casteCategory: pmVishwakarmaDetails.casteCategory,
                tradeWorkType: pmVishwakarmaDetails.tradeWorkType,
                traditionalOccupationCommunity: pmVishwakarmaDetails.traditionalOccupationCommunity,
                migrantWorker: pmVishwakarmaDetails.migrantWorker,
                upResidentFamilyBenefit: pmVishwakarmaDetails.upResidentFamilyBenefit,
                termsAccepted: pmVishwakarmaDetails.termsAccepted,
                address,
              }
            : {}),
          message,
          invoiceNumber,
        },
        status: "submitted",
        payment_status: "verified",
        source: "agency_partner_pos",
        commission_amount: commissionAmount,
        submitted_by_role: "agency_partner",
      })
      .select("id")
      .single();

    if (applicationError || !application) {
      return jsonError("Application could not be created: " + applicationError?.message, 500);
    }

    if (documentFiles.length > 0) {
      const uploadedDocuments = await Promise.all(
        documentFiles.map(async (file) => ({
          ...(await uploadFile(application.id, user.id, file, "documents")),
          application_id: application.id,
          uploaded_by: user.id,
          document_type: "Customer Document",
        })),
      );

      await supabase.from("application_documents").insert(uploadedDocuments);
    }

    await supabase.from("payments").insert({
      application_id: application.id,
      user_id: user.id,
      amount: service.customer_fee,
      status: "verified",
      razorpay_order_id: razorpayOrderId || razorpayDetails?.order_id || null,
      razorpay_payment_id: razorpayPaymentId || razorpayDetails?.id || null,
      razorpay_signature: razorpaySignature || null,
      razorpay_status: razorpayDetails?.status ?? "verified",
      payment_method: razorpayDetails?.method ?? null,
      paid_at: paidAt,
    });

    const invoice = await createInvoiceForApplication({
      applicationId: application.id,
      customerId: resolvedCustomerId,
      customerName: customer.full_name,
      customerEmail: customer.email,
      customerMobile: customer.mobile,
      serviceName: service.title,
      amount: service.customer_fee,
      paymentStatus: "verified",
    });

    // Commission Engine calculation & insert
    await createCommissionForApplication({
      agencyPartnerId: ap.id,
      applicationId: application.id,
      serviceSlug: service.slug,
      serviceName: service.title,
      saleAmount: service.customer_fee,
      tierId: ap.tier_id,
      serviceId: service.service_id || null,
    });

    await supabase.from("status_logs").insert({
      application_id: application.id,
      changed_by: user.id,
      new_status: "in_process",
      note: "Application created by Agency Partner after Razorpay payment.",
    });

    // Check if there is an existing customer auth user matching this mobile number,
    // and run customer linking immediately!
    const { data: customerUser } = await supabase
      .from("profiles")
      .select("id")
      .eq("mobile", normalizedMobile)
      .eq("role", "customer")
      .maybeSingle();

    if (customerUser) {
      await linkCustomerApplicationsByMobile({
        customerUserId: customerUser.id,
        mobile: normalizedMobile,
      });
    }

    await createAdminNotifications(supabase, [
      {
        type: "new_application",
        title: "New Agency Partner Application",
        message: `${customer.full_name} submitted ${service.title} through Agency Partner POS.`,
        relatedType: "application",
        relatedId: application.id,
      },
      ...(documentFiles.length
        ? [
            {
              type: "document_uploaded" as const,
              title: "Documents uploaded",
              message: `${documentFiles.length} document(s) uploaded for ${customer.full_name}.`,
              relatedType: "document" as const,
              relatedId: application.id,
            },
          ]
        : []),
    ]);

    return NextResponse.json({
      message: "Application created successfully.",
      applicationId: application.id,
      invoiceId: invoice?.id,
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Application could not be created.", 500);
  }
}
