import { NextResponse } from "next/server";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

function jsonError(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user || !isAdminRole(role)) {
    return jsonError("Admin access required.", 403);
  }

  const { id } = await params;
  const formData = await request.formData();
  const status = String(formData.get("status") ?? "");

  if (!["pending", "approved", "paid", "rejected"].includes(status)) {
    return jsonError("Invalid commission status.", 400);
  }

  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return jsonError("Supabase service role key is missing.", 500);
  }

  const now = new Date().toISOString();
  const updates: Record<string, string | null> = {
    status,
    updated_at: now,
  };

  if (status === "approved") {
    updates.approved_by = user.id;
    updates.approved_at = now;
  }

  if (status === "paid") {
    updates.paid_at = now;
  }

  const { error } = await supabase.from("commissions").update(updates).eq("id", id);

  if (error) {
    return jsonError("Commission could not be updated.", 500);
  }

  return NextResponse.json({ message: "Commission updated." });
}
