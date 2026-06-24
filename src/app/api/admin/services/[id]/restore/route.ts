import { NextResponse } from "next/server";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { revalidateServicePaths, writeServiceAuditLog } from "@/lib/service-admin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  if (!user || !isAdminRole(role)) {
    return NextResponse.json({ message: "Admin access required." }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ message: "Supabase service role key is missing." }, { status: 500 });
  }

  const { id } = await params;
  const { data: service } = await supabase.from("services").select("*").eq("id", id).maybeSingle();
  if (!service) {
    return NextResponse.json({ message: "Service not found." }, { status: 404 });
  }

  if (service.status !== "archived") {
    return NextResponse.json({ message: "Service is not archived." }, { status: 400 });
  }

  const { error } = await supabase
    .from("services")
    .update({ status: "draft", is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  // Log action
  await writeServiceAuditLog(supabase, id, user.id, "restore", { status: { old: "archived", new: "draft" } });

  revalidateServicePaths(service.slug);
  return NextResponse.json({ message: "Service restored successfully." });
}
