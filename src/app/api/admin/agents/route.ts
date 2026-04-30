import { NextResponse } from "next/server";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

function jsonError(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user || !isAdminRole(role)) {
    return jsonError("Admin access required.", 403);
  }

  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return jsonError("Supabase service role key is missing.", 500);
  }

  const formData = await request.formData();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const mobile = String(formData.get("mobile") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const agentCode = String(formData.get("agentCode") ?? "").trim();
  const commissionType = String(formData.get("commissionType") ?? "fixed");
  const commissionValue = Number(formData.get("commissionValue") ?? 0);
  const isActive = String(formData.get("isActive") ?? "true") === "true";

  if (!fullName || !mobile || !email || !password || !agentCode) {
    return jsonError("Full name, mobile, email, password, and agent code are required.", 400);
  }

  if (!["fixed", "percentage"].includes(commissionType)) {
    return jsonError("Invalid commission type.", 400);
  }

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role: "agent",
    },
  });

  if (createError || !created.user) {
    return jsonError(createError?.message ?? "Agent user could not be created.", 500);
  }

  const profilePayload = {
    id: created.user.id,
    full_name: fullName,
    email,
    mobile,
    role: "agent",
    agent_code: agentCode,
    commission_type: commissionType,
    commission_value: Number.isFinite(commissionValue) ? commissionValue : 0,
    commission_rate: commissionType === "percentage" ? commissionValue : null,
    active: isActive,
    is_active: isActive,
    updated_at: new Date().toISOString(),
  };

  const [{ error: profileError }, { error: userError }] = await Promise.all([
    supabase.from("profiles").upsert(profilePayload, { onConflict: "id" }),
    supabase.from("users").upsert(
      {
        id: created.user.id,
        full_name: fullName,
        email,
        role: "agent",
        avatar_url: "",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    ),
  ]);

  if (profileError || userError) {
    return jsonError(profileError?.message ?? userError?.message ?? "Agent profile could not be saved.", 500);
  }

  return NextResponse.json({ message: "Agent created successfully.", agentId: created.user.id });
}
