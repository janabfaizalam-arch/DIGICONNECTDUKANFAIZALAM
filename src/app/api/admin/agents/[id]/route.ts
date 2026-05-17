import { NextResponse } from "next/server";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user || !isAdminRole(role)) {
    return NextResponse.json({ message: "Admin access required." }, { status: 403 });
  }

  const { id } = await params;
  const formData = await request.formData();
  const isActive = String(formData.get("isActive") ?? "false") === "true";
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    console.error("[admin-agents] Supabase service role key is missing.");
    return NextResponse.json({ message: "Agent update is not available right now." }, { status: 500 });
  }

  const { error } = await supabase
    .from("profiles")
    .update({ is_active: isActive, active: isActive, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("role", "agent");

  if (error) {
    console.error("[admin-agents] Agent status update failed.", error.message);
    return NextResponse.json({ message: "Agent status could not be updated." }, { status: 500 });
  }

  return NextResponse.json({ message: isActive ? "Agent activated." : "Agent deactivated." });
}
