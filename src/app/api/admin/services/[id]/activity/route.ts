import { NextResponse } from "next/server";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

  try {
    const { data: logs, error } = await supabase
      .from("service_audit_logs")
      .select(`
        id,
        action,
        changes,
        created_at,
        user_id,
        profiles!service_audit_logs_user_id_fkey(full_name, role)
      `)
      .eq("service_id", id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[activity_timeline] Database fetch failed", error);
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    return NextResponse.json({ logs: logs || [] });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Error loading activity timeline." }, { status: 500 });
  }
}
