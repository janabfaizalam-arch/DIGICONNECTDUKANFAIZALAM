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
  file_size?: number;
};

type SubmissionFile = {
  key: string;
  file: File;
  document_type: string;
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

type ApplicationDocumentInsert = Record<string, unknown>;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function required(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeCustomer(customer: ApplicationPayload["customer"] = {}) {
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
  if (!required(customer.name)) return "Name is required.";
  if (!required(customer.mobile)) return "Mobile is required.";
  if (!/^[6-9]\d{9}$/.test(customer.mobile.replace(/\D/g, ""))) return "Enter a valid Indian 10 digit mobile number.";
  if (!options.emailOptional && !required(customer.email)) return "Email is required.";
  if (!required(customer.city)) return "City is required.";
  return null;
}

function isItrMsmeCombo(serviceSlugs: string[]) {
  return serviceSlugs.includes("itr-filing") && serviceSlugs.includes("msme-certificate");
}

function devInfo(message: string, details?: Record<string, unknown>) {
  if (process.env.NODE_ENV === "development") {
    console.info(message, details ?? {});
  }
}

function flowLog(event: string, details?: Record<string, unknown>) {
  console.info(`[applications] ${event}`, details ?? {});
}

function secondaryWarning(task: string, details?: Record<string, unknown>) {
  console.warn("[applications] SECONDARY_TASK_WARNING", {
    task,
    ...(details ?? {}),
  });
}

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
}

function parseJsonField<T>(value: FormDataEntryValue | null, fallback: T): T {
  if (typeof value !== "string" || !value.trim()) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

async function parseApplicationRequest(request: Request): Promise<{ body: ApplicationPayload; submissionFiles: SubmissionFile[] }> {
  const contentType = request.headers.get("content-type") ?? "";

  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    const body = (await request.json()) as ApplicationPayload;
    console.info("[applications] API_FORMDATA_FILE_KEYS", { keys: [] });
    console.info("[applications] API_DOCUMENT_FILE_COUNT", { count: Array.isArray(body.documents) ? body.documents.length : 0, mode: "json_metadata" });
    return { body, submissionFiles: [] };
  }

  const formData = await request.formData();
  const payload = parseJsonField<ApplicationPayload>(formData.get("payload"), {});
  const documentTypes = parseJsonField<string[]>(formData.get("documentTypes"), []);

  const fileEntries = Array.from(formData.entries()).filter(
    (entry): entry is [string, File] =>
      entry[1] instanceof File || (
        entry[1] !== null &&
        typeof entry[1] === "object" &&
        "size" in entry[1] &&
        "name" in entry[1] &&
        (entry[1] as { size: number }).size > 0
      )
  );
  const submissionFiles = fileEntries.map(([key, file], index) => ({
    key,
    file,
    document_type: documentTypes[index] || (index === 0 ? "Aadhaar / Document Proof" : "Additional Document"),
  }));

  const body: ApplicationPayload = {
    ...payload,
    serviceSlug: payload.serviceSlug ?? String(formData.get("serviceSlug") ?? ""),
    serviceSlugs: payload.serviceSlugs ?? parseJsonField<string[]>(formData.get("serviceSlugs"), []),
    applicationIds: payload.applicationIds ?? parseJsonField<string[]>(formData.get("applicationIds"), []),
    customer: payload.customer ?? parseJsonField<ApplicationPayload["customer"]>(formData.get("customer"), {}),
    details: payload.details ?? parseJsonField<Record<string, string>>(formData.get("details"), {}),
    documents: payload.documents ?? [],
    razorpayPayment: payload.razorpayPayment ?? parseJsonField<VerifiedRazorpayPayment | null>(formData.get("razorpayPayment"), null),
    walletUseAmount: payload.walletUseAmount ?? Number(formData.get("walletUseAmount") ?? 0),
  };

  console.info("[applications] API_FORMDATA_FILE_KEYS", { keys: fileEntries.map(([key]) => key) });
  console.info("[applications] API_DOCUMENT_FILE_COUNT", { count: submissionFiles.length, mode: "multipart_files" });

  return { body, submissionFiles };
}

function getMissingColumn(error: unknown) {
  const message =
    typeof error === "object" && error && "message" in error
      ? String((error as { message?: unknown }).message ?? "")
      : String(error ?? "");
  return message.match(/'([^']+)' column/)?.[1] ?? message.match(/column "([^"]+)"/)?.[1] ?? null;
}

async function insertApplicationDocuments(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  rows: ApplicationDocumentInsert[],
  context: Record<string, unknown>,
) {
  if (!supabase || !rows.length) {
    return;
  }

  let nextRows = rows;
  const strippedColumns = new Set<string>();

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const { error } = await supabase.from("application_documents").insert(nextRows);

    if (!error) {
      return;
    }

    const missingColumn = getMissingColumn(error);
    if (!missingColumn || strippedColumns.has(missingColumn)) {
      console.error("[applications] Document insert failed", {
        ...context,
        error,
      });
      throw error;
    }

    strippedColumns.add(missingColumn);
    console.warn("[applications] SECONDARY_TASK_WARNING", {
      task: "documents_schema_column_stripped",
      missingColumn,
      ...context,
    });
    nextRows = nextRows.map((row) => {
      const clone = { ...row };
      delete clone[missingColumn];
      return clone;
    });
  }
}

async function buildUploadedFileDocumentRows({
  supabase,
  files,
  applications,
  userId,
  customerId,
}: {
  supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>;
  files: SubmissionFile[];
  applications: { id: string; customer_id?: string | null }[];
  userId: string;
  customerId?: string | null;
}) {
  const now = new Date().toISOString();
  const rows: ApplicationDocumentInsert[] = [];

  for (const application of applications) {
    for (const [index, item] of files.entries()) {
      const storagePath = `applications/${application.id}/customer-documents/${Date.now()}-${index}-${safeFileName(item.file.name)}`;
      const { error: uploadError } = await supabase.storage.from("documents").upload(storagePath, item.file, {
        contentType: item.file.type || "application/octet-stream",
        upsert: false,
      });

      if (uploadError) {
        throw uploadError;
      }

      console.info("[applications] APPLICATION_DOCUMENT_STORAGE_OK", {
        applicationId: application.id,
        storagePath,
      });

      const { data: signedUrlData } = await supabase.storage.from("documents").createSignedUrl(storagePath, 60 * 60);
      rows.push({
        application_id: application.id,
        customer_id: customerId ?? application.customer_id ?? null,
        user_id: userId,
        uploaded_by: userId,
        uploaded_by_role: "customer",
        document_type: item.document_type,
        document_name: item.document_type,
        file_name: item.file.name,
        file_type: item.file.type || null,
        file_size: item.file.size,
        storage_path: storagePath,
        file_url: signedUrlData?.signedUrl ?? "",
        status: "pending",
        review_status: "pending",
        created_at: now,
        uploaded_at: now,
        metadata: {
          application_id: application.id,
          source: "customer_api_file_upload",
          form_key: item.key,
        },
      });
    }
  }

  return rows;
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
    let submissionFiles: SubmissionFile[] = [];

    try {
      const parsed = await parseApplicationRequest(request);
      body = parsed.body;
      submissionFiles = parsed.submissionFiles;
    } catch {
      return jsonError("Invalid application payload.", 400);
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

    const customer = normalizeCustomer(body.customer);
    const isPmVishwakarmaApplication = resolvedServices.some((service) => service.slug === "pm-vishwakarma-yojana");
    const isEshramApplication = resolvedServices.some((service) => service.slug === "eshram-card-registration");
    const customerValidationError = getCustomerValidationError(customer, {
      emailOptional: isPmVishwakarmaApplication || isEshramApplication,
    });

    devInfo("[applications] Customer validation before application submit", {
      hasName: Boolean(customer.name),
      hasMobile: Boolean(customer.mobile),
      hasEmail: Boolean(customer.email),
      hasCity: Boolean(customer.city),
      emailLength: customer.email.length,
      cityLength: customer.city.length,
      walletRedeemAmount,
      realPaymentAmount,
      hasRazorpayPayment: Boolean(body.razorpayPayment),
      existingApplicationIds: Array.isArray(body.applicationIds) ? body.applicationIds.length : 0,
    });

    if (customerValidationError) {
      return jsonError(customerValidationError, 400);
    }

    if (isPmVishwakarmaApplication) {
      const requiredDetailKeys = [
        "pincode",
        "district",
        "state",
        "maritalStatus",
        "casteCategory",
        "tradeWorkType",
        "traditionalOccupationCommunity",
        "migrantWorker",
        "upResidentFamilyBenefit",
        "termsAccepted",
      ];
      const missingDetail = requiredDetailKeys.find((key) => !required((body.details ?? {})[key]));

      if (missingDetail) {
        return jsonError("Please complete all required PM Vishwakarma fields.", 400);
      }
    }

    const details = body.details ?? {};
    const documents = Array.isArray(body.documents) ? body.documents : [];
    const documentFileCount = documents.length + submissionFiles.length;

    if (isEshramApplication) {
      const requiredDetailKeys = ["pincode", "district", "state", "maritalStatus", "serviceType", "consentAccepted"];
      const missingDetail = requiredDetailKeys.find((key) => !required(details[key]));

      if (missingDetail) {
        return jsonError("Please complete all required e-Shram fields.", 400);
      }

      if (!/^\d{6}$/.test(String(details.pincode ?? "").trim())) {
        return jsonError("Enter a valid 6 digit PIN code.", 400);
      }
    }

    if (!documentFileCount && !isEshramApplication) {
      return jsonError("Please upload Aadhaar / Documents.", 400);
    }

    for (const document of documents) {
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
      name: customer.name,
      mobile: customer.mobile,
      email: customer.email.toLowerCase(),
      city: customer.city,
      message: customer.message,
      service_slugs: resolvedServices.map((service) => service.slug),
      payment: {
        total_amount: orderAmount,
        wallet_redeemed_amount: walletRedeemAmount,
        fresh_payable_amount: realPaymentAmount,
        cashback_eligible_amount: realPaymentAmount,
      },
      ...Object.fromEntries(Object.entries(details).map(([key, value]) => [key, String(value ?? "").trim()])),
      documents,
    };
    const customerDetails = {
      name: customer.name,
      mobile: customer.mobile,
      email: customer.email,
      city: customer.city,
      address: String(details.address ?? "").trim(),
      notes: customer.message,
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
      flowLog("APPLICATION_CREATE_START", {
        userId: user.id,
        applicationIds: existingApplicationIds,
        mode: "finalize_existing",
      });
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
          customer_email: customer.email.toLowerCase(),
          customer_mobile: customer.mobile.replace(/\D/g, ""),
          updated_at: new Date().toISOString(),
        })
        .in("id", existingIds);

      if (updateError) {
        console.error("[applications] Existing application finalization failed", {
          userId: user.id,
          existingIds,
          error: updateError,
        });
        flowLog("APPLICATION_SUBMIT_FATAL", {
          userId: user.id,
          applicationIds: existingIds,
          reason: "existing_application_update_failed",
        });
        return jsonError("Application could not be finalized after payment. Please contact support.", 500);
      }

      flowLog("APPLICATION_CREATED", {
        userId: user.id,
        applicationIds: existingIds,
        mode: "finalize_existing",
      });
      flowLog("APPLICATION_CREATE_OK", {
        userId: user.id,
        applicationIds: existingIds,
        mode: "finalize_existing",
      });
      flowLog("PAYMENT_SAVE_START", {
        userId: user.id,
        applicationIds: existingIds,
        mode: "already_verified",
      });
      flowLog("PAYMENT_SAVE_OK", {
        userId: user.id,
        applicationIds: existingIds,
        mode: "already_verified",
      });

      const metadataDocumentRows = existingApplications.flatMap((application) =>
        documents.map((document) => ({
          application_id: application.id,
          user_id: user.id,
          uploaded_by: user.id,
          uploaded_by_role: "customer",
          document_type: document.document_type,
          document_name: document.document_type,
          file_name: document.file_name,
          file_url: document.file_url,
          file_type: document.file_type ?? null,
          file_size: document.file_size ?? null,
          storage_path: document.storage_path ?? null,
          customer_id: linkedCustomer?.id ?? application.customer_id ?? null,
          status: "pending",
          review_status: "pending",
          uploaded_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          metadata: {
            application_id: application.id,
            source: "customer_finalize_existing_application",
          },
        })),
      );
      const uploadedFileRows = submissionFiles.length
        ? await buildUploadedFileDocumentRows({
            supabase,
            files: submissionFiles,
            applications: existingApplications,
            userId: user.id,
            customerId: linkedCustomer?.id ?? existingApplications[0]?.customer_id ?? null,
          })
        : [];
      const documentsToInsert = [...metadataDocumentRows, ...uploadedFileRows];
      if (documentsToInsert.length) {
        flowLog("APPLICATION_DOCUMENT_UPLOAD_START", {
          userId: user.id,
          applicationIds: existingIds,
          count: documentsToInsert.length,
        });
        try {
          const { error: deleteDocumentsError } = await supabase.from("application_documents").delete().in("application_id", existingIds);
          if (deleteDocumentsError) {
            throw deleteDocumentsError;
          }

          await insertApplicationDocuments(supabase, documentsToInsert, {
            userId: user.id,
            applicationIds: existingIds,
          });

          documentsToInsert.forEach((document, index) => {
            flowLog("DOCUMENT_INSERT_OK", {
              userId: user.id,
              applicationId: document.application_id,
              fileName: document.file_name,
              index,
            });
            console.info("[applications] APPLICATION_DOCUMENT_DB_INSERT_OK", {
              userId: user.id,
              applicationId: document.application_id,
              fileName: document.file_name,
            });
          });
        } catch (documentsError) {
          secondaryWarning("documents", {
            userId: user.id,
            applicationIds: existingIds,
            error: documentsError,
          });
        }
      }

      const serviceName = existingApplications.map((application) => application.service_name).join(", ");
      let invoice = null as Awaited<ReturnType<typeof createInvoiceForApplication>>;
      flowLog("INVOICE_AUTO_CREATE_START", {
        userId: user.id,
        applicationId: existingApplications[0].id,
      });
      try {
        invoice = await createInvoiceForApplication({
          applicationId: existingApplications[0].id,
          userId: user.id,
          customerId: linkedCustomer?.id ?? existingApplications[0]?.customer_id ?? null,
          customerName: customer.name,
          customerEmail: customer.email,
          customerMobile: customer.mobile,
          serviceName,
          amount: orderAmount,
          paymentStatus: "verified",
        });

        if (invoice?.id) {
          flowLog("INVOICE_AUTO_CREATE_OK", {
            userId: user.id,
            applicationId: existingApplications[0].id,
            invoiceId: invoice.id,
          });
        } else {
          secondaryWarning("invoice", {
            userId: user.id,
            applicationId: existingApplications[0].id,
          });
        }
      } catch (invoiceError) {
        secondaryWarning("invoice", {
          userId: user.id,
          applicationId: existingApplications[0].id,
          error: invoiceError,
        });
      }

      try {
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
          existingApplications.flatMap((application) => {
            const notifications: CreateAdminNotificationInput[] = [
              {
                type: "new_application" as const,
                title: "Paid application submitted",
                message: `${customer.name} submitted ${application.service_name} after verified Razorpay payment.`,
                relatedType: "application" as const,
                relatedId: application.id,
              },
            ];

            if (documents.length) {
              notifications.push({
                type: "document_uploaded" as const,
                title: "Documents uploaded",
                message: `${customer.name} uploaded ${documents.length} document(s) for ${application.service_name}.`,
                relatedType: "document" as const,
                relatedId: application.id,
              });
            }

            return notifications;
          }),
        );
      } catch (notificationError) {
        secondaryWarning("notifications", {
          userId: user.id,
          applicationIds: existingIds,
          error: notificationError,
        });
      }

      return NextResponse.json({
        success: true,
        message: "Application submitted successfully.",
        applicationId: existingApplications[0].id,
        applicationIds: existingIds,
        invoiceId: invoice?.id ?? null,
      });
    }

    let remainingWalletForApplications = walletRedeemAmount;
    flowLog("APPLICATION_CREATE_START", {
      userId: user.id,
      serviceSlugs: resolvedServices.map((service) => service.slug),
      mode: "new_application",
    });
    const applicationsToInsert = resolvedServices.map((service, index) => {
      const rowAmount = comboOrder ? (index === 0 ? orderAmount : 0) : Number(service.amount ?? 0);
      const rowWalletRedeem = Math.min(remainingWalletForApplications, rowAmount);
      remainingWalletForApplications = Math.max(0, remainingWalletForApplications - rowWalletRedeem);
      const rowFreshPayable = Math.max(0, rowAmount - rowWalletRedeem);

      return {
        user_id: user.id,
        customer_id: linkedCustomer?.id ?? null,
        customer_email: customer.email.toLowerCase(),
        customer_mobile: customer.mobile.replace(/\D/g, ""),
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
      .select("id, service_name, amount, customer_id");

    if (applicationError || !applications?.length) {
      console.error("[applications] Application creation failed", {
        userId: user.id,
        error: applicationError,
      });
      flowLog("APPLICATION_SUBMIT_FATAL", {
        userId: user.id,
        reason: "application_insert_failed",
      });
      return jsonError("Application submission failed.", 500);
    }

    flowLog("APPLICATION_CREATED", {
      userId: user.id,
      applicationIds: applications.map((application) => application.id),
      mode: "new_application",
    });

    flowLog("APPLICATION_CREATE_OK", {
      userId: user.id,
      applicationIds: applications.map((application) => application.id),
    });

    const metadataDocumentRows = applications.flatMap((application) =>
      documents.map((document) => ({
        application_id: application.id,
        user_id: user.id,
        uploaded_by: user.id,
        uploaded_by_role: "customer",
        document_type: document.document_type,
        document_name: document.document_type,
        file_name: document.file_name,
        file_url: document.file_url,
        file_type: document.file_type ?? null,
        file_size: document.file_size ?? null,
        storage_path: document.storage_path ?? null,
        customer_id: linkedCustomer?.id ?? null,
        status: "pending",
        review_status: "pending",
        uploaded_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        metadata: {
          application_id: application.id,
          source: "customer_new_application",
        },
      })),
    );
    const uploadedFileRows = submissionFiles.length
      ? await buildUploadedFileDocumentRows({
          supabase,
          files: submissionFiles,
          applications,
          userId: user.id,
          customerId: linkedCustomer?.id ?? null,
        })
      : [];
    const documentsToInsert = [...metadataDocumentRows, ...uploadedFileRows];

    if (documentsToInsert.length) {
      flowLog("APPLICATION_DOCUMENT_UPLOAD_START", {
        userId: user.id,
        applicationIds: applications.map((application) => application.id),
        count: documentsToInsert.length,
      });
      try {
        await insertApplicationDocuments(supabase, documentsToInsert, {
          userId: user.id,
          applicationIds: applications.map((application) => application.id),
        });

        documentsToInsert.forEach((document, index) => {
          flowLog("DOCUMENT_INSERT_OK", {
            userId: user.id,
            applicationId: document.application_id,
            fileName: document.file_name,
            index,
          });
          console.info("[applications] APPLICATION_DOCUMENT_DB_INSERT_OK", {
            userId: user.id,
            applicationId: document.application_id,
            fileName: document.file_name,
          });
        });
      } catch (documentsError) {
        secondaryWarning("documents", {
          userId: user.id,
          applicationIds: applications.map((application) => application.id),
          error: documentsError,
        });
      }
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

    flowLog("PAYMENT_SAVE_START", {
      userId: user.id,
      applicationIds: applications.map((application) => application.id),
    });

    const { data: insertedPayments, error: paymentError } = await supabase.from("payments").insert(paymentRows).select("id, application_id, wallet_used_amount, real_payment_amount");

    if (paymentError || !insertedPayments?.length) {
      console.error("[applications] Payment save failed", {
        userId: user.id,
        applicationIds: applications.map((application) => application.id),
        error: paymentError,
      });
      flowLog("APPLICATION_SUBMIT_FATAL", {
        userId: user.id,
        applicationIds: applications.map((application) => application.id),
        reason: "payment_insert_failed",
      });
      return jsonError("Payment details could not be saved.", 500);
    }

    flowLog("PAYMENT_SAVE_OK", {
      userId: user.id,
      applicationIds: applications.map((application) => application.id),
      paymentIds: insertedPayments.map((payment) => payment.id),
    });

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
    let invoice = null as Awaited<ReturnType<typeof createInvoiceForApplication>>;
    flowLog("INVOICE_AUTO_CREATE_START", {
      userId: user.id,
      applicationId: applications[0].id,
    });
    try {
      invoice = await createInvoiceForApplication({
        applicationId: applications[0].id,
        userId: user.id,
        customerId: linkedCustomer?.id ?? null,
        customerName: customer.name,
        customerEmail: customer.email,
        customerMobile: customer.mobile,
        serviceName,
        amount: totalAmount,
        paymentStatus: hasVerifiedRazorpayPayment ? "verified" : "pending",
      });

      if (invoice?.id) {
        flowLog("INVOICE_AUTO_CREATE_OK", {
          userId: user.id,
          applicationId: applications[0].id,
          invoiceId: invoice.id,
        });
      } else {
        secondaryWarning("invoice", {
          userId: user.id,
          applicationId: applications[0].id,
        });
      }
    } catch (invoiceError) {
      secondaryWarning("invoice", {
        userId: user.id,
        applicationId: applications[0].id,
        error: invoiceError,
      });
    }

    if (walletUsedAmount > 0 && invoice?.id) {
      await supabase
        .from("invoices")
        .update({
          wallet_used_amount: walletUsedAmount,
          real_payment_amount: realPaymentAmount,
        })
        .eq("id", invoice.id);
    }

    try {
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
              message: `${customer.name} submitted ${application.service_name}.`,
              relatedType: "application" as const,
              relatedId: application.id,
            },
          ];

          if (documents.length) {
            baseNotifications.push({
              type: "document_uploaded" as const,
              title: "Documents uploaded",
              message: `${customer.name} uploaded ${documents.length} document(s) for ${application.service_name}.`,
              relatedType: "document",
              relatedId: application.id,
            });
          }

          if (!hasVerifiedRazorpayPayment) {
            baseNotifications.push({
              type: "payment_pending",
              title: "Payment pending",
              message: `${customer.name} has a pending payment for ${application.service_name}.`,
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
    } catch (notificationError) {
      secondaryWarning("notifications", {
        userId: user.id,
        applicationIds: applications.map((application) => application.id),
        error: notificationError,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Application submitted successfully.",
      applicationId: applications[0].id,
      applicationIds: applications.map((application) => application.id),
      invoiceId: invoice?.id ?? null,
    });
  } catch (error) {
    console.error("[applications] APPLICATION_SUBMIT_FATAL", {
      message: error instanceof Error ? error.message : "Unknown application submit error",
      error,
    });
    return jsonError(error instanceof Error ? error.message : "Something went wrong. Please try again.", 500);
  }
}
