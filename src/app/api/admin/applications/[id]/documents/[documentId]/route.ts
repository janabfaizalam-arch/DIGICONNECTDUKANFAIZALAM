import { NextResponse } from "next/server";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; documentId: string }> },
) {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user || !isAdminRole(role)) {
    return NextResponse.json({ message: "Admin access required." }, { status: 403 });
  }

  const { id, documentId } = await params;
  const formData = await request.formData();
  const status = String(formData.get("status") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  if (!["accepted", "approved", "rejected"].includes(status)) {
    return NextResponse.json({ message: "Invalid document status." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ message: "Document review is not available right now." }, { status: 500 });
  }

  const approved = status === "accepted" || status === "approved";
  const { error } = await supabase
    .from("application_documents")
    .update({
      review_status: approved ? "approved" : "reupload_required",
      status: approved ? "approved" : "reupload_required",
      rejection_reason: approved ? null : reason || "Please re-upload a clear document.",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", documentId)
    .eq("application_id", id);

  if (error) {
    console.error("[admin-application-documents] Review failed.", error.message);
    return NextResponse.json({ message: "Document could not be updated." }, { status: 500 });
  }

  return NextResponse.json({ message: approved ? "Document approved." : "Document rejected." });
}
