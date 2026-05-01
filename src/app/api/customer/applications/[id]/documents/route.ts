import { NextResponse } from "next/server";

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
      .select("id, user_id, service_slug")
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

    const storagePath = `${user.id}/${application.service_slug}/documents/${Date.now()}-${cleanFileName(file.name)}`;
    const { error: uploadError } = await supabase.storage.from("documents").upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    });

    if (uploadError) {
      return jsonError(uploadError.message, 500);
    }

    const { data: publicUrlData } = supabase.storage.from("documents").getPublicUrl(storagePath);
    const { data: document, error: insertError } = await supabase
      .from("application_documents")
      .insert({
        application_id: id,
        user_id: user.id,
        document_type: documentType || "Additional Document",
        file_name: file.name,
        file_url: publicUrlData.publicUrl,
        file_type: file.type,
        storage_path: storagePath,
      })
      .select("id, application_id, document_type, file_name, file_url, file_type, storage_path, created_at")
      .single();

    if (insertError) {
      await supabase.storage.from("documents").remove([storagePath]);
      return jsonError("Document could not be saved.", 500);
    }

    return NextResponse.json({
      document,
      message: "Document uploaded successfully.",
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Document upload failed. Please try again.", 500);
  }
}
