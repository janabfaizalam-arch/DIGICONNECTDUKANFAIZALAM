import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const schema = z.object({
  userId: z.string().uuid(),
  accountStatus: z.enum(["active", "blocked", "suspended", "pending"]),
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

  const { error } = await supabase
    .from("profiles")
    .update({ account_status: body.accountStatus })
    .eq("id", body.userId)
    .eq("role", "customer");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (body.accountStatus === "blocked" || body.accountStatus === "suspended") {
    await supabase.auth.admin.signOut(body.userId, "global");
  }

  return NextResponse.json({ ok: true });
}
