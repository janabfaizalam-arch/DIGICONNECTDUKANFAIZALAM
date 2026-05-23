import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { createAdminNotification } from "@/lib/admin-notifications";
import { getCurrentUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const allowedFileTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const maxFileSize = 5 * 1024 * 1024;

function cleanFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message, message }, { status });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return jsonError("Please log in before uploading documents.", 401);
    }

    const { id } = await params;
    const supabase = getSupabaseAdmin();

    if (!supabase) {
      return jsonError("Document upload is not configured on the server.", 500);
    }

    const { data: application } = await supabase
      .from("applications")
      .select("id, user_id, customer_id, service_slug, service_name, form_data")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (!application) {
      return jsonError("Application not found.", 404);
    }

    const formData = await request.formData();
    const documentType = String(formData.get("documentType") ?? "Additional Document").trim();
    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
      return jsonError("Please choose a document to upload.", 400);
    }

    if (!allowedFileTypes.includes(file.type)) {
      return jsonError("Document must be PDF, JPG, PNG, or WebP.", 400);
    }

    if (file.size > maxFileSize) {
      return jsonError("Document must be smaller than 5MB.", 400);
    }

    const now = new Date().toISOString();
    const storagePath = `applications/${id}/customer-documents/${Date.now()}-${cleanFileName(file.name)}`;
    console.info("[customer-documents] Upload received", {
      applicationId: id,
      fileName: file.name,
      fileType: file.type,
    });

    const { error: uploadError } = await supabase.storage.from("documents").upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    });

    if (uploadError) {
      return jsonError(uploadError.message, 500);
    }

    const { data: signedUrlData } = await supabase.storage.from("documents").createSignedUrl(storagePath, 60 * 60);
    const { data: document, error: insertError } = await supabase
      .from("application_documents")
      .insert({
        application_id: id,
        user_id: user.id,
        customer_id: application.customer_id,
        uploaded_by: user.id,
        uploaded_by_role: "customer",
        document_type: documentType || "Additional Document",
        document_name: documentType || "Additional Document",
        file_name: file.name,
        file_url: signedUrlData?.signedUrl ?? "",
        file_type: file.type,
        storage_path: storagePath,
        status: "pending",
        review_status: "pending",
        is_final: false,
        uploaded_at: now,
        created_at: now,
      })
      .select("id, application_id, document_type, document_name, file_name, file_url, file_type, storage_path, uploaded_at, created_at")
      .single();

    if (insertError) {
      await supabase.storage.from("documents").remove([storagePath]);
      console.error("[customer-documents] Insert failed", {
        applicationId: id,
        code: insertError.code,
        message: insertError.message,
      });
      return jsonError("Document could not be saved.", 500);
    }

    console.info("[customer-documents] Document inserted", {
      applicationId: id,
      documentId: document.id,
    });

    const applicationFormData = application.form_data as Record<string, unknown> | null;
    await createAdminNotification(supabase, {
      type: "document_uploaded",
      title: "Document uploaded",
      message: `${String(applicationFormData?.name ?? "Customer")} uploaded ${documentType || "Additional Document"} for ${application.service_name}.`,
      relatedType: "document",
      relatedId: id,
    });

    revalidatePath(`/dashboard/applications/${id}`);
    revalidatePath("/dashboard");
    revalidatePath(`/admin/applications/${id}`);
    revalidatePath("/admin/applications");

    return NextResponse.json({
      document,
      message: "Document uploaded successfully.",
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Document upload failed. Please try again.", 500);
  }
}
