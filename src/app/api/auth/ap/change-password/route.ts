import { NextResponse } from "next/server";
import { z } from "zod";

import {
  PARTNER_PASSWORD_MAX_LENGTH,
  PARTNER_PASSWORD_MIN_LENGTH,
} from "@/lib/admin/partner-password-reset";
import { getCurrentUser, getCurrentUserRole, isAgencyPartnerRole } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/*
  The floor comes from PARTNER_PASSWORD_MIN_LENGTH rather than a literal, so
  this route and the admin reset form cannot drift apart. The password every
  partner is handed is `Dc@123`; a floor above its length would make the panel
  refuse a password the system itself issues.
*/
const schema = z.object({
  currentPassword: z.string().min(6).optional(),
  newPassword: z.string().min(PARTNER_PASSWORD_MIN_LENGTH).max(PARTNER_PASSWORD_MAX_LENGTH),
  confirmPassword: z.string().min(PARTNER_PASSWORD_MIN_LENGTH).max(PARTNER_PASSWORD_MAX_LENGTH),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = await getCurrentUserRole(user);
  if (!isAgencyPartnerRole(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = schema.parse(await request.json());
  if (body.newPassword !== body.confirmPassword) {
    return NextResponse.json({ error: "Passwords do not match" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  const { error } = await supabase.auth.admin.updateUserById(user.id, {
    password: body.newPassword,
  });

  if (error) {
    console.error("[ap/change-password] update_failed", { message: error.message });
    return NextResponse.json({ error: "Password could not be changed. Please try again." }, { status: 500 });
  }

  await supabase.from("profiles").update({ must_change_password: false }).eq("id", user.id);
  await supabase.from("agency_partners").update({ must_change_password: false }).eq("user_id", user.id);

  return NextResponse.json({ ok: true, redirectTo: "/dc-partner/dashboard" });
}
