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

    const service = getServiceBySlug(String(body.serviceSlug ?? ""));

    if (!service) {
      return jsonError("Service not found.", 404);
    }

    const customer = body.customer ?? {};
    const requiredCustomerFields = [
      ["name", "Name"],
      ["mobile", "Mobile"],
      ["email", "Email"],
      ["city", "City"],
      ["message", "Message"],
    ] as const;

    for (const [fieldName, label] of requiredCustomerFields) {
      if (!required(customer[fieldName])) {
        return jsonError(`${label} is required.`, 400);
      }
    }

    const details = body.details ?? {};

    for (const field of service.fields) {
      if ((field.required ?? true) && !required(details[field.name])) {
        return jsonError(`${field.label} is required.`, 400);
      }
    }

    if (!Array.isArray(body.documents) || body.documents.length !== service.documents.length) {
      return jsonError("Please upload all required documents.", 400);
    }

    for (const documentType of service.documents) {
      const uploaded = body.documents.find((document) => document.document_type === documentType);

      if (!uploaded?.file_name || !uploaded.file_url) {
        return jsonError(`${documentType} upload is required.`, 400);
      }
    }

    if (!body.paymentScreenshot?.file_name || !body.paymentScreenshot.file_url) {
      return jsonError("Please upload payment screenshot.", 400);
    }

    const formData = {
      service: service.title,
      name: customer.name!.trim(),
      mobile: customer.mobile!.trim(),
      email: customer.email!.trim(),
      city: customer.city!.trim(),
      message: customer.message!.trim(),
      ...Object.fromEntries(Object.entries(details).map(([key, value]) => [key, String(value ?? "").trim()])),
      documents: body.documents,
    };

    const { data: application, error: applicationError } = await supabase
      .from("applications")
      .insert({
        user_id: user.id,
        service_slug: service.slug,
        service_name: service.title,
        amount: service.amount,
        form_data: formData,
        status: "new",
        created_by: user.id,
        source: "online",
        payment_status: "pending",
        payment_screenshot_url: body.paymentScreenshot.file_url,
        payment_screenshot_path: body.paymentScreenshot.storage_path ?? null,
        submitted_by_role: role,
      })
      .select("id")
      .single();

    if (applicationError || !application) {
      return jsonError("Application submission failed.", 500);
    }

    const documentsToInsert = body.documents.map((document) => ({
      application_id: application.id,
      user_id: user.id,
      document_type: document.document_type,
      file_name: document.file_name,
      file_url: document.file_url,
      file_type: document.file_type ?? null,
      storage_path: document.storage_path ?? null,
    }));

    const { error: documentsError } = await supabase.from("application_documents").insert(documentsToInsert);

    if (documentsError) {
      return jsonError("Documents could not be saved.", 500);
    }

    const { error: paymentError } = await supabase.from("payments").insert({
      application_id: application.id,
      user_id: user.id,
      amount: service.amount,
      status: "pending",
      screenshot_url: body.paymentScreenshot.file_url,
      storage_path: body.paymentScreenshot.storage_path ?? null,
    });

    if (paymentError) {
      return jsonError("Payment details could not be saved.", 500);
    }

    const invoice = await createInvoiceForApplication({
      applicationId: application.id,
      userId: user.id,
      customerName: customer.name!.trim(),
      customerEmail: customer.email!.trim(),
      customerMobile: customer.mobile!.trim(),
      serviceName: service.title,
      amount: service.amount,
      paymentStatus: "pending",
    });

    if (!invoice) {
      return jsonError("Invoice could not be generated.", 500);
    }

    await supabase.from("notifications").insert({
      user_id: user.id,
      application_id: application.id,
      title: "Application received",
      message: `${service.title} request has been received. Our team will verify it shortly.`,
    });

    return NextResponse.json({
      message: "Application submitted successfully. Track the status in your dashboard.",
      applicationId: application.id,
      invoiceId: invoice.id,
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Something went wrong. Please try again.", 500);
  }
}
