import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const schema = z.object({
  userId: z.string().uuid(),
  temporaryPassword: z.string().min(8).max(128),
});

export async function POST(request: Request) {
  const admin = await getCurrentUser();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminRole(await getCurrentUserRole(admin))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = schema.parse(await request.json());
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Service unavailable" }, { status: 503 });

  const { error } = await supabase.auth.admin.updateUserById(body.userId, {
    password: body.temporaryPassword,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("profiles").update({ must_change_password: true }).eq("id", body.userId);
  await supabase.from("agency_partners").update({ must_change_password: true }).eq("user_id", body.userId);
  await supabase.auth.admin.signOut(body.userId, "global");

  return NextResponse.json({ ok: true });
}
