import { NextResponse } from "next/server";

import { getCurrentUser, isAdminUser } from "@/lib/auth";
import { applicationStatuses, paymentStatuses } from "@/lib/portal-data";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

function cleanFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();

    if (!isAdminUser(user)) {
      return NextResponse.json({ message: "Admin access required." }, { status: 403 });
    }

    const { id } = await params;
    const formData = await request.formData();
    const status = String(formData.get("status") ?? "");
    const paymentStatus = String(formData.get("paymentStatus") ?? "");
    const assignedTo = String(formData.get("assignedTo") ?? "").trim();
    const internalNotes = String(formData.get("internalNotes") ?? "").trim();
    const note = String(formData.get("note") ?? "").trim();
    const finalDocument = formData.get("finalDocument");
    const supabase = getSupabaseAdmin();

    if (!supabase) {
      return NextResponse.json({ message: "Supabase service role key is missing." }, { status: 500 });
    }

    const { data: application } = await supabase
      .from("applications")
      .select("id, user_id, service_name")
      .eq("id", id)
      .single();

    if (!application) {
      return NextResponse.json({ message: "Application not found." }, { status: 404 });
    }

    const updates: Record<string, string | null> = {
      updated_at: new Date().toISOString(),
    };

    if (applicationStatuses.includes(status as never)) {
      updates.status = status;
    }

    if (assignedTo) {
      updates.assigned_to = assignedTo;
    }

    if (internalNotes) {
      updates.internal_notes = internalNotes;
    }

    if (finalDocument instanceof File && finalDocument.size > 0) {
      const path = `${application.user_id}/${id}/final/${Date.now()}-${cleanFileName(finalDocument.name)}`;
      const bytes = await finalDocument.arrayBuffer();
      const { error: uploadError } = await supabase.storage.from("application-documents").upload(path, bytes, {
        contentType: finalDocument.type || "application/octet-stream",
        upsert: true,
      });

      if (uploadError) {
        throw uploadError;
      }

      const { data } = await supabase.storage.from("application-documents").createSignedUrl(path, 60 * 60 * 24 * 365);
      updates.final_document_url = data?.signedUrl ?? "";
      updates.final_document_name = finalDocument.name;
    }

    const { error } = await supabase.from("applications").update(updates).eq("id", id);

    if (error) {
      return NextResponse.json({ message: "Application update nahi ho payi." }, { status: 500 });
    }

    if (paymentStatuses.includes(paymentStatus as never)) {
      await supabase.from("payments").update({ status: paymentStatus, updated_at: new Date().toISOString() }).eq("application_id", id);
      await supabase.from("invoices").update({ payment_status: paymentStatus }).eq("application_id", id);
    }

    if (note) {
      await supabase.from("admin_notes").insert({
        application_id: id,
        admin_id: user?.id,
        note,
        assigned_to: assignedTo || null,
      });
    }

    if (updates.status) {
      await supabase.from("notifications").insert({
        user_id: application.user_id,
        application_id: id,
        title: "Application status updated",
        message: `${application.service_name} ka status ab ${updates.status.replace(/_/g, " ")} hai.`,
      });
    }

    return NextResponse.json({ message: "Application update ho gayi." });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
