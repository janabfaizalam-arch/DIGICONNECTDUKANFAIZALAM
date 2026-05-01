import { NextResponse } from "next/server";

import { getCurrentUser, getCurrentUserRole, isStaffRole } from "@/lib/auth";
import { cleanFileName } from "@/lib/crm";
import { applicationStatuses } from "@/lib/portal-data";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const allowedFileTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const maxFileSize = 8 * 1024 * 1024;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message, message }, { status });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return jsonError("Please log in as staff.", 401);
    }

    const role = await getCurrentUserRole(user);

    if (!isStaffRole(role)) {
      return jsonError("Staff access required.", 403);
    }

    const { id } = await params;
    const supabase = getSupabaseAdmin();

    if (!supabase) {
      return jsonError("Staff update is not configured on the server.", 500);
    }

    const { data: application } = await supabase
      .from("applications")
      .select("id, user_id, service_name, status, assigned_staff_id")
      .eq("id", id)
      .eq("assigned_staff_id", user.id)
      .single();

    if (!application) {
      return jsonError("Assigned application not found.", 404);
    }

    const formData = await request.formData();
    const requestedStatus = String(formData.get("status") ?? application.status);
    const documentsRequired = String(formData.get("documentsRequired") ?? "") === "true";
    const status = documentsRequired ? "documents_pending" : requestedStatus;
    const staffNote = String(formData.get("staffNote") ?? "").trim();
    const customerMessage = String(formData.get("customerMessage") ?? "").trim();
    const finalDocument = formData.get("finalDocument");

    if (!applicationStatuses.includes(status as never)) {
      return jsonError("Invalid application status.", 400);
    }

    const updates: Record<string, string | null> = {
      status,
      staff_note: staffNote || null,
      customer_message: customerMessage || null,
      updated_at: new Date().toISOString(),
    };

    if (finalDocument instanceof File && finalDocument.size > 0) {
      if (!allowedFileTypes.includes(finalDocument.type)) {
        return jsonError("Final document must be PDF, JPG, PNG, or WebP.", 400);
      }

      if (finalDocument.size > maxFileSize) {
        return jsonError("Final document must be smaller than 8MB.", 400);
      }

      const storagePath = `${application.user_id ?? user.id}/${id}/staff-final/${Date.now()}-${cleanFileName(finalDocument.name)}`;
      const bytes = await finalDocument.arrayBuffer();
      const { error: uploadError } = await supabase.storage.from("application-documents").upload(storagePath, bytes, {
        contentType: finalDocument.type || "application/octet-stream",
        upsert: true,
      });

      if (uploadError) {
        return jsonError(uploadError.message, 500);
      }

      const { data: signedUrlData, error: signedUrlError } = await supabase
        .storage
        .from("application-documents")
        .createSignedUrl(storagePath, 60 * 60 * 24 * 365);

      if (signedUrlError) {
        return jsonError(signedUrlError.message, 500);
      }

      updates.final_document_url = signedUrlData?.signedUrl ?? "";
      updates.final_document_name = finalDocument.name;
    }

    const { error: updateError } = await supabase
      .from("applications")
      .update(updates)
      .eq("id", id)
      .eq("assigned_staff_id", user.id);

    if (updateError) {
      return jsonError("Application could not be updated.", 500);
    }

    await supabase.from("status_logs").insert({
      application_id: id,
      changed_by: user.id,
      old_status: application.status,
      new_status: status,
      note: staffNote || customerMessage || "Updated by staff.",
    });

    if (application.user_id && (customerMessage || status !== application.status)) {
      await supabase.from("notifications").insert({
        user_id: application.user_id,
        application_id: id,
        title: "Application update",
        message: customerMessage || `${application.service_name} status is now ${status.replace(/_/g, " ")}.`,
      });
    }

    return NextResponse.json({
      message: "Application updated successfully.",
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Application update failed. Please try again.", 500);
  }
}
