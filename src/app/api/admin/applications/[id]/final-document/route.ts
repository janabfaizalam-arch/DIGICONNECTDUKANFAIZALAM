import { NextResponse } from "next/server";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { validateFileSignature } from "@/lib/file-validation";

const allowedFileTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const maxFileSize = 8 * 1024 * 1024;

function cleanFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user || !isAdminRole(role)) {
    return NextResponse.json({ message: "Admin access required." }, { status: 403 });
  }

  const { id } = await params;
  const formData = await request.formData();
  const file = formData.get("file");
  const title = String(formData.get("title") ?? "Final completed document").trim();
  const note = String(formData.get("note") ?? "").trim();

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ message: "Choose a final document to upload." }, { status: 400 });
  }

  const validationResult = await validateFileSignature(file, allowedFileTypes);
  if (!validationResult.valid) {
    return NextResponse.json({ message: validationResult.error || "Final document must be PDF, JPG, PNG, or WebP." }, { status: 400 });
  }

  if (file.size > maxFileSize) {
    return NextResponse.json({ message: "Final document must be smaller than 8MB." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ message: "Final document upload is not configured." }, { status: 500 });
  }

  const { data: application } = await supabase
    .from("applications")
    .select("id, user_id, customer_id")
    .eq("id", id)
    .maybeSingle();

  if (!application) {
    return NextResponse.json({ message: "Application not found." }, { status: 404 });
  }

  const storagePath = `final-documents/${id}/${Date.now()}-${cleanFileName(file.name)}`;
  const bytes = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage.from("documents").upload(storagePath, bytes, {
    contentType: file.type,
    upsert: true,
  });

  if (uploadError) {
    return NextResponse.json({ message: uploadError.message }, { status: 500 });
  }

  const { data: signedUrlData } = await supabase.storage.from("documents").createSignedUrl(storagePath, 60 * 60);
  const signedUrl = signedUrlData?.signedUrl ?? "";
  const uploadedAt = new Date().toISOString();

  const { data: document, error: documentError } = await supabase
    .from("application_documents")
    .insert({
      application_id: id,
      user_id: application.user_id,
      customer_id: application.customer_id,
      uploaded_by: user.id,
      uploaded_by_role: "admin",
      document_type: "final_document",
      document_name: title || "Final completed document",
      file_name: file.name,
      file_url: signedUrl,
      file_type: file.type,
      storage_path: storagePath,
      status: "approved",
      review_status: "approved",
      is_final: true,
      uploaded_at: uploadedAt,
      metadata: { note: note || null },
    })
    .select("id")
    .single();

  if (documentError) {
    await supabase.storage.from("documents").remove([storagePath]);
    return NextResponse.json({ message: "Final document could not be saved." }, { status: 500 });
  }

  await supabase
    .from("applications")
    .update({
      final_document_url: signedUrl,
      final_document_name: file.name,
      final_document_path: storagePath,
      completed_document_url: signedUrl,
      completed_document_storage_path: storagePath,
      completed_at: uploadedAt,
      customer_note: note || null,
      customer_message: note || null,
      updated_at: uploadedAt,
    })
    .eq("id", id);

  if (application.user_id) {
    await supabase.from("notifications").insert({
      user_id: application.user_id,
      application_id: id,
      title: "Final document uploaded",
      message: note || "Your final certificate/document is ready to download.",
    });
  }

  return NextResponse.json({ message: "Final document uploaded.", documentId: document.id });
}
