import { NextResponse } from "next/server";

import { getCurrentUser, getCurrentUserRole, syncUserProfile } from "@/lib/auth";
import { createInvoiceForApplication } from "@/lib/crm";
import { getServiceBySlug } from "@/lib/portal-data";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type UploadedDocument = {
  document_type: string;
  file_name: string;
  file_url: string;
  file_type?: string;
  storage_path?: string;
};

type UploadedPaymentScreenshot = {
  file_name: string;
  file_url: string;
  file_type?: string;
  storage_path?: string;
};

type ApplicationPayload = {
  serviceSlug?: string;
  serviceSlugs?: string[];
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
  paymentScreenshot?: UploadedPaymentScreenshot;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function required(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

export async function POST(request: Request) {
  try {
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
    const services = serviceSlugs.map((slug) => getServiceBySlug(slug));

    if (!services.length || services.some((service) => !service)) {
      return jsonError("Service not found.", 404);
    }

    const resolvedServices = services.filter((service): service is NonNullable<typeof service> => Boolean(service));

    const customer = body.customer ?? {};
    const requiredCustomerFields = [
      ["name", "Name"],
      ["mobile", "Mobile"],
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

    if (!body.paymentScreenshot?.file_name || !body.paymentScreenshot.file_url) {
      return jsonError("Please upload payment screenshot.", 400);
    }

    const paymentScreenshot = body.paymentScreenshot;

    const formData = {
      service: resolvedServices.map((service) => service.title).join(", "),
      name: customer.name!.trim(),
      mobile: customer.mobile!.trim(),
      email: customer.email?.trim() ?? "",
      city: customer.city?.trim() ?? "",
      message: customer.message?.trim() ?? "",
      ...Object.fromEntries(Object.entries(details).map(([key, value]) => [key, String(value ?? "").trim()])),
      documents: body.documents,
    };

    const applicationsToInsert = resolvedServices.map((service) => ({
        user_id: user.id,
        service_slug: service.slug,
        service_name: service.title,
        amount: service.amount,
        form_data: formData,
        status: "new",
        created_by: user.id,
        source: "online",
        payment_status: "pending",
        payment_screenshot_url: paymentScreenshot.file_url,
        payment_screenshot_path: paymentScreenshot.storage_path ?? null,
        submitted_by_role: role,
      }));

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
        file_name: document.file_name,
        file_url: document.file_url,
        file_type: document.file_type ?? null,
        storage_path: document.storage_path ?? null,
      })),
    );

    const { error: documentsError } = await supabase.from("application_documents").insert(documentsToInsert);

    if (documentsError) {
      return jsonError("Documents could not be saved.", 500);
    }

    const { error: paymentError } = await supabase.from("payments").insert(
      applications.map((application) => ({
        application_id: application.id,
        user_id: user.id,
        amount: application.amount,
        status: "pending",
        screenshot_url: paymentScreenshot.file_url,
        storage_path: paymentScreenshot.storage_path ?? null,
      })),
    );

    if (paymentError) {
      return jsonError("Payment details could not be saved.", 500);
    }

    const totalAmount = applications.reduce((total, application) => total + Number(application.amount ?? 0), 0);
    const serviceName = applications.map((application) => application.service_name).join(", ");
    const invoice = await createInvoiceForApplication({
      applicationId: applications[0].id,
      userId: user.id,
      customerName: customer.name!.trim(),
      customerEmail: customer.email?.trim() ?? "",
      customerMobile: customer.mobile!.trim(),
      serviceName,
      amount: totalAmount,
      paymentStatus: "pending",
    });

    if (!invoice) {
      return jsonError("Invoice could not be generated.", 500);
    }

    await supabase.from("notifications").insert(
      applications.map((application) => ({
        user_id: user.id,
        application_id: application.id,
        title: "Application received",
        message: `${application.service_name} request has been received. Our team will verify it shortly.`,
      })),
    );

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
