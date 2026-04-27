import { NextResponse } from "next/server";

import { getCurrentUser, syncUserProfile } from "@/lib/auth";
import { createInvoiceNumber, getServiceBySlug } from "@/lib/portal-data";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

function cleanFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
}

const allowedUploadTypes = ["application/pdf", "image/jpeg", "image/png"];
const maxFileSize = 5 * 1024 * 1024;

async function uploadFile({
  applicationId,
  userId,
  file,
  folder,
}: {
  applicationId: string;
  userId: string;
  file: File;
  folder: "documents" | "payments";
}) {
  const supabase = getSupabaseAdmin();

  if (!supabase || file.size === 0) {
    return null;
  }

  const path = `${userId}/${applicationId}/${folder}/${Date.now()}-${cleanFileName(file.name)}`;
  const bytes = await file.arrayBuffer();
  const { error } = await supabase.storage.from("application-documents").upload(path, bytes, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });

  if (error) {
    throw error;
  }

  const { data } = await supabase.storage.from("application-documents").createSignedUrl(path, 60 * 60 * 24 * 365);

  return {
    path,
    url: data?.signedUrl ?? "",
  };
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Please login to apply." }, { status: 401 });
    }

    await syncUserProfile(user);

    const supabase = getSupabaseAdmin();

    if (!supabase) {
      return NextResponse.json({ error: "Supabase service role key is missing." }, { status: 500 });
    }

    const formData = await request.formData();
    const serviceSlug = String(formData.get("serviceSlug") ?? "");
    const service = getServiceBySlug(serviceSlug);

    if (!service) {
      return NextResponse.json({ error: "Service not found." }, { status: 404 });
    }

    const requiredFields = [
      ["name", "Name"],
      ["mobile", "Mobile"],
      ["email", "Email"],
      ["city", "City"],
      ["message", "Message"],
    ] as const;
    const data: Record<string, string> = {
      service: service.title,
    };

    for (const [fieldName, label] of requiredFields) {
      const value = String(formData.get(fieldName) ?? "").trim();

      if (!value) {
        return NextResponse.json({ error: `${label} required hai.` }, { status: 400 });
      }

      data[fieldName] = value;
    }

    for (const field of service.fields) {
      const value = String(formData.get(field.name) ?? "").trim();

      if ((field.required ?? true) && !value) {
        return NextResponse.json({ error: `${field.label} required hai.` }, { status: 400 });
      }

      data[field.name] = value;
    }

    const paymentUtr = String(formData.get("utrNumber") ?? "").trim();
    const documentFiles = service.documents.map((documentType) => ({
      documentType,
      file: formData.get(`document_${documentType}`),
    }));
    const paymentScreenshot = formData.get("paymentScreenshot");

    for (const document of documentFiles) {
      if (!(document.file instanceof File) || document.file.size === 0) {
        return NextResponse.json({ error: `${document.documentType} upload required hai.` }, { status: 400 });
      }
    }

    if (documentFiles.some(({ file }) => file instanceof File && !allowedUploadTypes.includes(file.type))) {
      return NextResponse.json({ error: "Sirf PDF, JPG ya PNG documents upload karein." }, { status: 400 });
    }

    if (documentFiles.some(({ file }) => file instanceof File && file.size > maxFileSize)) {
      return NextResponse.json({ error: "Har document 5MB se chhota hona chahiye." }, { status: 400 });
    }

    if (!paymentUtr) {
      return NextResponse.json({ error: "UTR number required hai." }, { status: 400 });
    }

    if (!(paymentScreenshot instanceof File) || paymentScreenshot.size === 0) {
      return NextResponse.json({ error: "Payment screenshot required hai." }, { status: 400 });
    }

    if (!allowedUploadTypes.includes(paymentScreenshot.type)) {
      return NextResponse.json({ error: "Payment screenshot PDF, JPG ya PNG format me upload karein." }, { status: 400 });
    }

    if (paymentScreenshot.size > maxFileSize) {
      return NextResponse.json({ error: "Payment screenshot 5MB se chhota hona chahiye." }, { status: 400 });
    }

    const { data: application, error: applicationError } = await supabase
      .from("applications")
      .insert({
        user_id: user.id,
        service_slug: service.slug,
        service_name: service.title,
        amount: service.amount,
        form_data: data,
        status: "new",
      })
      .select("id")
      .single();

    if (applicationError || !application) {
      return NextResponse.json({ error: "Application submit nahi ho payi." }, { status: 500 });
    }

    const uploadedDocuments = [];
    const documentUrls = [];

    for (const { documentType, file } of documentFiles) {
      if (!(file instanceof File)) {
        continue;
      }

      const uploaded = await uploadFile({
        applicationId: application.id,
        userId: user.id,
        file,
        folder: "documents",
      });

      if (uploaded) {
        documentUrls.push({
          document_type: documentType,
          name: file.name,
          url: uploaded.url,
          type: file.type,
        });
        uploadedDocuments.push({
          application_id: application.id,
          user_id: user.id,
          document_type: documentType,
          file_name: file.name,
          file_url: uploaded.url,
          file_type: file.type,
          storage_path: uploaded.path,
        });
      }
    }

    if (uploadedDocuments.length > 0) {
      await supabase.from("application_documents").insert(uploadedDocuments);
      await supabase
        .from("applications")
        .update({
          form_data: {
            ...data,
            documents: documentUrls,
          },
        })
        .eq("id", application.id);
    }

    let paymentScreenshotUrl = "";
    let paymentStoragePath = "";

    if (paymentScreenshot instanceof File && paymentScreenshot.size > 0) {
      const uploaded = await uploadFile({
        applicationId: application.id,
        userId: user.id,
        file: paymentScreenshot,
        folder: "payments",
      });
      paymentScreenshotUrl = uploaded?.url ?? "";
      paymentStoragePath = uploaded?.path ?? "";
    }

    await supabase.from("payments").insert({
      application_id: application.id,
      user_id: user.id,
      amount: service.amount,
      status: "pending",
      utr_number: paymentUtr || null,
      screenshot_url: paymentScreenshotUrl || null,
      storage_path: paymentStoragePath || null,
    });

    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .insert({
        application_id: application.id,
        user_id: user.id,
        invoice_number: createInvoiceNumber(),
        customer_name: data.name || user.user_metadata.full_name || "Customer",
        customer_email: data.email || user.email || "",
        service_name: service.title,
        amount: service.amount,
        payment_status: "pending",
      })
      .select("id")
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: "Invoice generate nahi ho payi." }, { status: 500 });
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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
