import { NextResponse } from "next/server";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

function jsonError(message: string, status: number) {
  return NextResponse.json({ message, error: message }, { status });
}

async function requireAdmin() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) return { error: jsonError("Please log in before viewing notifications.", 401) };
  if (!isAdminRole(role)) return { error: jsonError("Admin access required.", 403) };

  return { error: null };
}

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const supabase = getSupabaseAdmin();
    if (!supabase) return jsonError("Supabase service role key is missing.", 500);

    const { data, error } = await supabase
      .from("admin_notifications")
      .select("id, type, title, message, related_type, related_id, is_read, created_at")
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) return jsonError("Admin notifications could not be loaded.", 500);

    return NextResponse.json({ notifications: data ?? [] });
  } catch {
    return jsonError("Admin notifications could not be loaded.", 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const supabase = getSupabaseAdmin();
    if (!supabase) return jsonError("Supabase service role key is missing.", 500);

    const body = (await request.json().catch(() => null)) as { id?: string; markAll?: boolean } | null;

    if (body?.markAll) {
      const { error } = await supabase.from("admin_notifications").update({ is_read: true }).eq("is_read", false);

      if (error) return jsonError("Notifications could not be marked as read.", 500);
      return NextResponse.json({ message: "All notifications marked as read." });
    }

    if (!body?.id) {
      return jsonError("Notification id is required.", 400);
    }

    const { error } = await supabase.from("admin_notifications").update({ is_read: true }).eq("id", body.id);

    if (error) return jsonError("Notification could not be marked as read.", 500);

    return NextResponse.json({ message: "Notification marked as read." });
  } catch {
    return jsonError("Notification could not be updated.", 500);
  }
}
