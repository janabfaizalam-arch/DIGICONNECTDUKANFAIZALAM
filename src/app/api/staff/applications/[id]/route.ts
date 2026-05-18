import { NextResponse } from "next/server";

import { getCurrentUser, getCurrentUserRole, isStaffRole } from "@/lib/auth";
import { applicationStatuses } from "@/lib/portal-data";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const allowedFileTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const maxFileSize = 8 * 1024 * 1024;

function cleanFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) {
    return NextResponse.json({ message: "Please login." }, { status: 401 });
  }

  if (!isStaffRole(role)) {
    return NextResponse.json({ message: "Staff access required." }, { status: 403 });
  }

  const { id } = await params;
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return NextResponse.json({ message: "Supabase service role key is missing." }, { status: 500 });
  }

  const { data: application, error: applicationError } = await supabase
    .from("applications")
    .select("id, user_id, customer_id, status, assigned_staff_id")
    .eq("id", id)
    .eq("assigned_staff_id", user.id)
    .maybeSingle();

  if (applicationError) {
    return NextResponse.json({ message: applicationError.message }, { status: 500 });
  }

  if (!application) {
    return NextResponse.json({ message: "Application not found." }, { status: 404 });
  }

  const formData = await request.formData();
  const requestedStatus = String(formData.get("status") ?? application.status);
  const staffNote = String(formData.get("staffNote") ?? "").trim();
  const customerMessage = String(formData.get("customerMessage") ?? "").trim();
  const documentsRequired = formData.get("documentsRequired") === "true";
  const file = formData.get("finalDocument");
  const status = documentsRequired ? "documents_required" : requestedStatus;

  if (!applicationStatuses.includes(status as (typeof applicationStatuses)[number])) {
    return NextResponse.json({ message: "Invalid application status." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const updatePayload: Record<string, unknown> = {
    status,
    staff_note: staffNote || null,
    customer_message: customerMessage || null,
    updated_at: now,
  };

  if (status === "completed") {
    updatePayload.completed_at = now;
  }

  if (file instanceof File && file.size > 0) {
    if (!allowedFileTypes.includes(file.type)) {
      return NextResponse.json({ message: "Final document must be PDF, JPG, PNG, or WebP." }, { status: 400 });
    }

    if (file.size > maxFileSize) {
      return NextResponse.json({ message: "Final document must be smaller than 8MB." }, { status: 400 });
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
    const { error: documentError } = await supabase.from("application_documents").insert({
      application_id: id,
      user_id: application.user_id,
      customer_id: application.customer_id,
      uploaded_by: user.id,
      uploaded_by_role: "staff",
      document_type: "final_document",
      document_name: "Final completed document",
      file_name: file.name,
      file_url: signedUrl,
      file_type: file.type,
      storage_path: storagePath,
      status: "approved",
      review_status: "approved",
      is_final: true,
      uploaded_at: now,
      metadata: { note: customerMessage || staffNote || null },
    });

    if (documentError) {
      await supabase.storage.from("documents").remove([storagePath]);
      return NextResponse.json({ message: "Final document could not be saved." }, { status: 500 });
    }

    updatePayload.final_document_url = signedUrl;
    updatePayload.final_document_name = file.name;
    updatePayload.final_document_path = storagePath;
    updatePayload.completed_document_url = signedUrl;
    updatePayload.completed_document_storage_path = storagePath;
    updatePayload.completed_at = now;
  }

  const { error: updateError } = await supabase.from("applications").update(updatePayload).eq("id", id).eq("assigned_staff_id", user.id);

  if (updateError) {
    return NextResponse.json({ message: updateError.message }, { status: 500 });
  }

  await supabase.from("application_status_logs").insert({
    application_id: id,
    old_status: application.status,
    new_status: status,
    note: staffNote || customerMessage || null,
    actor_id: user.id,
    actor_role: "staff",
  });

  if (application.user_id && (customerMessage || file instanceof File)) {
    await supabase.from("notifications").insert({
      user_id: application.user_id,
      application_id: id,
      title: file instanceof File ? "Final document uploaded" : "Application updated",
      message: customerMessage || "Your DigiConnect Dukan application has been updated.",
    });
  }

  return NextResponse.json({ message: "Application updated." });
}
