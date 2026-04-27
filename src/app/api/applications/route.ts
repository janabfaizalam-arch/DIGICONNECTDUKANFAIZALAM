import { NextResponse } from "next/server";

import { getCurrentUser, syncUserProfile } from "@/lib/auth";
import { createInvoiceNumber, getServiceBySlug } from "@/lib/portal-data";
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
  utrNumber?: string;
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
        return jsonError(`${label} required hai.`, 400);
      }
    }

    const details = body.details ?? {};

    for (const field of service.fields) {
      if ((field.required ?? true) && !required(details[field.name])) {
        return jsonError(`${field.label} required hai.`, 400);
      }
    }

    if (!required(body.utrNumber)) {
      return jsonError("UTR number required hai.", 400);
    }

    if (!Array.isArray(body.documents) || body.documents.length !== service.documents.length) {
      return jsonError("Sabhi required documents upload karein.", 400);
    }

    for (const documentType of service.documents) {
      const uploaded = body.documents.find((document) => document.document_type === documentType);

      if (!uploaded?.file_name || !uploaded.file_url) {
        return jsonError(`${documentType} upload required hai.`, 400);
      }
    }

    if (!body.paymentScreenshot?.file_name || !body.paymentScreenshot.file_url) {
      return jsonError("Payment screenshot required hai.", 400);
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
      })
      .select("id")
      .single();

    if (applicationError || !application) {
      return jsonError("Application submit nahi ho payi.", 500);
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
      return jsonError("Documents save nahi ho paye.", 500);
    }

    const { error: paymentError } = await supabase.from("payments").insert({
      application_id: application.id,
      user_id: user.id,
      amount: service.amount,
      status: "pending",
      utr_number: body.utrNumber!.trim(),
      screenshot_url: body.paymentScreenshot.file_url,
      storage_path: body.paymentScreenshot.storage_path ?? null,
    });

    if (paymentError) {
      return jsonError("Payment details save nahi ho payi.", 500);
    }

    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .insert({
        application_id: application.id,
        user_id: user.id,
        invoice_number: createInvoiceNumber(),
        customer_name: customer.name!.trim(),
        customer_email: customer.email!.trim(),
        service_name: service.title,
        amount: service.amount,
        payment_status: "pending",
      })
      .select("id")
      .single();

    if (invoiceError || !invoice) {
      return jsonError("Invoice generate nahi ho payi.", 500);
    }

    await supabase.from("notifications").insert({
      user_id: user.id,
      application_id: application.id,
      title: "Application received",
      message: `${service.title} request receive ho gayi hai. Team jaldi verify karegi.`,
    });

    return NextResponse.json({
      message: "Application submit ho gayi. Dashboard me status track karein.",
      applicationId: application.id,
      invoiceId: invoice.id,
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Something went wrong. Please try again.", 500);
  }
}
