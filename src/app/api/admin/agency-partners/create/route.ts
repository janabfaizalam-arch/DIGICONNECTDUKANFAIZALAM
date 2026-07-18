import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { agencyInternalEmail } from "@/lib/auth/phone";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const schema = z.object({
  fullName: z.string().trim().min(2).max(120),
  username: z.string().trim().min(3).max(64).regex(/^[a-zA-Z0-9._-]+$/),
  mobile: z.string().trim().min(10).max(20),
  email: z.string().email().optional().or(z.literal("")),
  temporaryPassword: z.string().min(8).max(128),
  partnerCode: z.string().trim().min(2).max(40).optional(),
  commissionType: z.enum(["fixed", "percentage"]).default("fixed"),
  commissionValue: z.number().min(0).max(100000).default(0),
  kycStatus: z.enum(["pending", "approved", "rejected"]).default("pending"),
  accountStatus: z.enum(["active", "pending", "suspended"]).default("pending"),
});

export async function POST(request: Request) {
  const admin = await getCurrentUser();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = await getCurrentUserRole(admin);
  if (!isAdminRole(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = schema.parse(await request.json());
    const username = body.username.trim().toLowerCase();
    const supabase = getSupabaseAdmin();
    if (!supabase) return NextResponse.json({ error: "Service unavailable" }, { status: 503 });

    const { data: existingUser } = await supabase.from("profiles").select("id").eq("username", username).maybeSingle();
    if (existingUser) {
      return NextResponse.json({ error: "Username already taken" }, { status: 409 });
    }

    const email = agencyInternalEmail(username);
    const { data: created, error } = await supabase.auth.admin.createUser({
      email,
      password: body.temporaryPassword,
      email_confirm: true,
      user_metadata: {
        full_name: body.fullName,
        username,
        role: "agency_partner",
      },
      app_metadata: { role: "agency_partner" },
    });

    if (error || !created.user) {
      return NextResponse.json({ error: error?.message ?? "Create failed" }, { status: 500 });
    }

    const userId = created.user.id;
    const partnerStatus = body.accountStatus === "active" ? "active" : body.accountStatus;

    await supabase.from("profiles").upsert({
      id: userId,
      role: "agency_partner",
      full_name: body.fullName,
      email: body.email || email,
      phone: body.mobile.replace(/\D/g, "").slice(-10),
      mobile: body.mobile.replace(/\D/g, "").slice(-10),
      username,
      partner_code: body.partnerCode ?? null,
      account_status: body.accountStatus === "active" ? "active" : "pending",
      must_change_password: true,
      phone_verified: false,
    });

    const { data: partner, error: partnerError } = await supabase
      .from("agency_partners")
      .insert({
        user_id: userId,
        username,
        business_name: body.fullName,
        contact_name: body.fullName,
        mobile: body.mobile.replace(/\D/g, "").slice(-10),
        email: body.email || "",
        status: partnerStatus,
        commission_rate: body.commissionType === "percentage" ? body.commissionValue : 0,
        must_change_password: true,
        partner_code: body.partnerCode ?? null,
        kyc_status: body.kycStatus,
      })
      .select("id")
      .maybeSingle();

    if (partnerError) {
      // best-effort: profile exists; surface partner error
      console.error("[ap-create]", partnerError.message);
    }

    return NextResponse.json({
      ok: true,
      message: "Agency Partner created. Username login enabled; password change required on first login.",
      userId,
      partnerId: partner?.id ?? null,
      partnerCode: body.partnerCode ?? null,
      username,
      mustChangePassword: true,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid agent payload", details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
}
