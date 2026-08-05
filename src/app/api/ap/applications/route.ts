import { NextResponse } from "next/server";
import crypto from "crypto";

import { createAdminNotifications } from "@/lib/admin-notifications";
import { getVisibleAgentServices, payoutForAgentService } from "@/lib/agent-services";
import { getCurrentUser, isActiveAgent } from "@/lib/auth";
import { cleanFileName, createInvoiceForApplication } from "@/lib/crm";
import { createInvoiceNumber } from "@/lib/portal-data";
import { getRazorpayClient, getRazorpayKeySecret } from "@/lib/razorpay";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { getAgencyPartnerByUserId } from "@/lib/ap-data";
import { createCommissionForApplication } from "@/lib/ap-commission-engine";
import { linkCustomerApplicationsByMobile } from "@/lib/ap-customer-linking";
import { validateFileSignature } from "@/lib/file-validation";
import { scheduleCrmSync } from "@/lib/crmSync";
import { triggerWhatsAppNotification } from "@/lib/whatsapp-automation";

const allowedFileTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const maxFileSize = 5 * 1024 * 1024;

function jsonError(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

async function validateFile(file: File, label: string) {
  const validationResult = await validateFileSignature(file, allowedFileTypes);
  if (!validationResult.valid) {
    return `${label} must be PDF, JPG, PNG, or WEBP (invalid format/signature).`;
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
    const variantId = String(formData.get("variantId") ?? "").trim();
    const customerName = String(formData.get("customerName") ?? formData.get("name") ?? "").trim();
    const mobile = String(formData.get("mobile") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();

    const pincode = String(formData.get("pincode") ?? "").replace(/\D/g, "").slice(0, 6);
    const city = String(formData.get("city") ?? "").trim();
    const district = String(formData.get("district") ?? "").trim();
    const state = String(formData.get("state") ?? "").trim();
    const message = String(formData.get("message") ?? "").trim();
    const address = String(formData.get("address") ?? "").trim();
    const gender = String(formData.get("gender") ?? "").trim();
    const dob = String(formData.get("dob") ?? "").trim();
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
    const paymentMode = String(formData.get("payment_mode") ?? "").trim();
    const razorpayPaymentId = String(formData.get("razorpay_payment_id") ?? "").trim();
    const razorpayOrderId = String(formData.get("razorpay_order_id") ?? "").trim();
    const razorpaySignature = String(formData.get("razorpay_signature") ?? "").trim();
    const razorpayAmountPaise = Math.round(Number(formData.get("razorpay_amount_paise") ?? 0));
    const documentFiles = formData.getAll("documents").filter((value): value is File => value instanceof File && value.size > 0);

    if (!agentServiceId) {
      return jsonError("Service is required.", 400);
    }

    for (const file of documentFiles) {
      const validation = await validateFile(file, file.name);
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

    // Resolve variant if any
    const serviceVariants = service.variants;
    const hasVariants = serviceVariants && Array.isArray(serviceVariants) && serviceVariants.length > 0;
    if (hasVariants && !variantId) {
      return jsonError("Please select a service variant.", 400);
    }
    const selectedVariant = hasVariants
      ? (serviceVariants.find((v) => v.id === variantId) ?? null)
      : null;
    if (hasVariants && !selectedVariant) {
      return jsonError("Selected variant not found.", 400);
    }

    // Validate selected variant restrictions
    if (selectedVariant && selectedVariant.restrictions) {
      const r = selectedVariant.restrictions;
      const rType = r.type;
      if (rType !== "india") {
        if (r.states && r.states.length > 0) {
          const matchState = r.states.some((s: string) => s.toLowerCase() === state.toLowerCase());
          if (!matchState) {
            return jsonError(`This variant is only available in selected states: ${r.states.join(", ")}`, 400);
          }
        }
        if (r.districts && r.districts.length > 0) {
          const matchDistrict = r.districts.some((d: string) => d.toLowerCase() === district.toLowerCase());
          if (!matchDistrict) {
            return jsonError(`This variant is only available in District ${r.districts.join(", ")} (PIN: ${r.pincodes?.join(", ") || ""})`, 400);
          }
        }
        if (r.pincodes && r.pincodes.length > 0) {
          const matchPincode = r.pincodes.some((p: string) => p === pincode);
          if (!matchPincode) {
            return jsonError(`This variant is only available in PIN code ${r.pincodes.join(", ")}`, 400);
          }
        }
      }
    }

    // Validate service-level restrictions
    if (service.supported_states && service.supported_states.length > 0) {
      const matchState = service.supported_states.some((s: string) => s.toLowerCase() === state.toLowerCase());
      if (!matchState) {
        return jsonError(`This service is only available in: ${service.supported_states.join(", ")}`, 400);
      }
    }
    if (service.supported_districts && service.supported_districts.length > 0) {
      const matchDistrict = service.supported_districts.some((d: string) => d.toLowerCase() === district.toLowerCase());
      if (!matchDistrict) {
        return jsonError(`This service is only available in districts: ${service.supported_districts.join(", ")}`, 400);
      }
    }
    if (service.supported_pincodes && service.supported_pincodes.length > 0) {
      const matchPincode = service.supported_pincodes.some((p: string) => p === pincode);
      if (!matchPincode) {
        return jsonError(`This service is only available in PIN codes: ${service.supported_pincodes.join(", ")}`, 400);
      }
    }

    const finalCustomerFee = selectedVariant ? Number(selectedVariant.price) : Number(service.customer_fee);
    const commissionAmount = selectedVariant ? Number(selectedVariant.score) : payoutForAgentService(service);
    const expectedAmountPaise = Math.round(finalCustomerFee * 100);

    if (
      paymentMode !== "link" &&
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

    const razorpayDetails = paymentMode !== "link" && razorpayPaymentId ? await fetchRazorpayPaymentDetails(razorpayPaymentId) : null;

    if (paymentMode !== "link" && expectedAmountPaise > 0) {
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
    let customer = null as { id: string; full_name: string; mobile: string; email: string | null; city: string | null; pincode?: string | null; state?: string | null; address?: string | null } | null;

    if (resolvedCustomerId) {
      const { data } = await supabase
        .from("customers")
        .select("id, full_name, mobile, email, city, pincode, state, address")
        .eq("id", resolvedCustomerId)
        .or(`created_by.eq.${user.id},assigned_agent_id.eq.${user.id}`)
        .single();
      customer = data;
      if (customer) {
        const updateData: Record<string, string | null> = {
          updated_at: new Date().toISOString()
        };
        if (customerName && customerName !== customer.full_name) updateData.full_name = customerName;
        if (normalizedMobile && normalizedMobile !== customer.mobile) updateData.mobile = normalizedMobile;
        if (email && email.toLowerCase() !== customer.email) updateData.email = email.toLowerCase();
        if (address && address !== customer.address) updateData.address = address;
        if (city && city !== customer.city) updateData.city = city;
        if (pincode && pincode !== customer.pincode) updateData.pincode = pincode;
        if (state && state !== customer.state) updateData.state = state;

        if (Object.keys(updateData).length > 1) {
          const { data: updatedCustomer } = await supabase
            .from("customers")
            .update(updateData)
            .eq("id", resolvedCustomerId)
            .select("id, full_name, mobile, email, city, pincode, state, address")
            .single();
          if (updatedCustomer) {
            customer = updatedCustomer;
          }
        }
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
          created_by: user.id,
          assigned_agent_id: user.id,
        })
        .select("id, full_name, mobile, email, city, pincode, state, address")
        .single();

      if (error || !data) {
        return jsonError("Customer could not be created: " + error?.message, 500);
      }

      customer = data;
      resolvedCustomerId = data.id;
    }

    if (!customer) {
      return jsonError("Customer not found.", 404);
    }

    const invoiceNumber = createInvoiceNumber();
    const serviceNameWithVariant = selectedVariant ? `${service.title} - ${selectedVariant.name}` : service.title;

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
        service_name: serviceNameWithVariant,
        amount: finalCustomerFee,
        total_amount: finalCustomerFee,
        customer_fee_snapshot: finalCustomerFee,
        agent_payout_snapshot: commissionAmount,
        agent_payout_type_snapshot: selectedVariant ? "fixed" : service.payout_type,
        source_channel: "agency_partner",
        ownership_status: "ap_created",
        service_snapshot: {
          agent_service_id: service.id,
          service_id: service.service_id,
          slug: service.slug,
          title: service.title,
          customer_fee: finalCustomerFee,
          agent_payout: commissionAmount,
          payout_type: selectedVariant ? "fixed" : service.payout_type,
          payout_percentage: selectedVariant ? 0 : service.payout_percentage,
          required_documents: selectedVariant && selectedVariant.required_documents
            ? selectedVariant.required_documents.map((d) => d.name).join(", ")
            : service.required_documents,
          processing_time: selectedVariant ? selectedVariant.processing_time : service.processing_time,
          variant_id: variantId || null,
          variant_name: selectedVariant ? selectedVariant.name : null,
        },
        form_data: {
          name: customer.full_name,
          mobile: customer.mobile,
          email: customer.email?.toLowerCase() ?? "",
          pincode: customer.pincode ?? pincode,
          city: customer.city ?? city,
          state: customer.state ?? state,
          gender,
          dob,
          district,
          address: customer.address ?? address,
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
        status: paymentMode === "link" ? "payment_pending" : "submitted",
        payment_status: paymentMode === "link" ? "pending" : "verified",
        // applications.source enum only allows 'online'|'offline'|'agent_pos'; partner channel is source_channel.
        source: "agent_pos",
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
      amount: finalCustomerFee,
      status: paymentMode === "link" ? "pending" : "verified",
      razorpay_order_id: razorpayOrderId || razorpayDetails?.order_id || null,
      razorpay_payment_id: razorpayPaymentId || razorpayDetails?.id || null,
      razorpay_signature: razorpaySignature || null,
      razorpay_status: razorpayDetails?.status ?? (paymentMode === "link" ? "pending" : "verified"),
      payment_method: razorpayDetails?.method ?? null,
      paid_at: paymentMode === "link" ? null : paidAt,
    });

    let invoice = null;
    if (paymentMode !== "link") {
      invoice = await createInvoiceForApplication({
        applicationId: application.id,
        customerId: resolvedCustomerId,
        customerName: customer.full_name,
        customerEmail: customer.email,
        customerMobile: customer.mobile,
        serviceName: serviceNameWithVariant,
        amount: finalCustomerFee,
        paymentStatus: "verified",
      });

      // Commission Engine calculation & insert
      await createCommissionForApplication({
        agencyPartnerId: ap.id,
        applicationId: application.id,
        serviceSlug: service.slug,
        serviceName: serviceNameWithVariant,
        saleAmount: finalCustomerFee,
        tierId: ap.tier_id,
        serviceId: service.service_id || null,
      });
    }

    await supabase.from("status_logs").insert({
      application_id: application.id,
      changed_by: user.id,
      new_status: paymentMode === "link" ? "payment_pending" : "in_process",
      note: paymentMode === "link" ? "Application created by Agency Partner. Pending remote payment link." : "Application created by Agency Partner after Razorpay payment.",
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

    await scheduleCrmSync(
      application.id,
      paymentMode !== "link" && expectedAmountPaise > 0 ? "payment_updated" : "application_created",
      { customerId: customer.id },
    );

    try {
      await triggerWhatsAppNotification("application_created", application.id);
      if (paymentMode !== "link" && expectedAmountPaise > 0) {
        await triggerWhatsAppNotification("payment_success", application.id, {
          paymentId: razorpayPaymentId
        });
      } else if (expectedAmountPaise > 0) {
        await triggerWhatsAppNotification("payment_pending", application.id);
      }
      await scheduleCrmSync(application.id, "whatsapp_sent", { payload: { whatsappStatus: "Sent" } });
    } catch (waError) {
      console.error("WhatsApp trigger error for AP applications:", waError);
    }

    return NextResponse.json({
      message: "Application created successfully.",
      applicationId: application.id,
      invoiceId: invoice?.id,
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Application could not be created.", 500);
  }
}
