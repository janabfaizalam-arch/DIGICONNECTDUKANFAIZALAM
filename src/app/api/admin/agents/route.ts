import { NextResponse } from "next/server";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

function jsonError(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function normalizeMobile(value: string) {
  return value.replace(/\D/g, "").slice(0, 10);
}

function normalizeAgentCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user || !isAdminRole(role)) {
    return jsonError("Admin access required.", 403);
  }

  const supabase = getSupabaseAdmin();

  if (!supabase) {
    console.error("[admin-agents] Supabase service role key is missing.");
    return jsonError("Agent creation is not available right now.", 500);
  }

  const formData = await request.formData();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const mobile = normalizeMobile(String(formData.get("mobile") ?? ""));
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const agentCode = normalizeAgentCode(String(formData.get("agentCode") ?? ""));
  const address = String(formData.get("address") ?? "").trim();
  const commissionType = String(formData.get("commissionType") ?? "fixed");
  const commissionValue = Number(formData.get("commissionValue") ?? 0);
  const isActive = String(formData.get("isActive") ?? "true") === "true";

  if (!fullName || !mobile || !email || !password || !agentCode || !address) {
    return jsonError("Agent name, mobile, email, agent code, password, and address are required.", 400);
  }

  if (!/^\d{10}$/.test(mobile)) {
    return jsonError("Enter a valid 10 digit Indian mobile number.", 400);
  }

  if (!isValidEmail(email)) {
    return jsonError("Enter a valid email address.", 400);
  }

  if (password.length < 8) {
    return jsonError("Password must be at least 8 characters.", 400);
  }

  if (!["fixed", "percentage"].includes(commissionType)) {
    return jsonError("Invalid commission type.", 400);
  }

  if (!Number.isFinite(commissionValue) || commissionValue < 0) {
    return jsonError("Commission value must be a positive number.", 400);
  }

  const { data: existingAgentCode, error: codeLookupError } = await supabase
    .from("profiles")
    .select("id")
    .ilike("agent_code", agentCode)
    .maybeSingle();

  if (codeLookupError) {
    console.error("[admin-agents] Agent code lookup failed.", codeLookupError.message);
    return jsonError("Agent details could not be validated.", 500);
  }

  if (existingAgentCode) {
    return jsonError("Agent code is already in use.", 409);
  }

  const [{ data: existingProfileEmail, error: profileEmailError }, { data: existingUserEmail, error: userEmailError }] =
    await Promise.all([
      supabase.from("profiles").select("id").eq("email", email).maybeSingle(),
      supabase.from("users").select("id").eq("email", email).maybeSingle(),
    ]);

  if (profileEmailError || userEmailError) {
    console.error("[admin-agents] Email lookup failed.", profileEmailError?.message ?? userEmailError?.message);
    return jsonError("Agent details could not be validated.", 500);
  }

  if (existingProfileEmail || existingUserEmail) {
    return jsonError("Email is already in use.", 409);
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
    const alreadyExists = createError?.message.toLowerCase().includes("already") ?? false;
    console.error("[admin-agents] Supabase auth user creation failed.", createError?.message);
    return jsonError(alreadyExists ? "Email is already in use." : "Agent user could not be created.", alreadyExists ? 409 : 500);
  }

  const profilePayload = {
    id: created.user.id,
    full_name: fullName,
    email,
    mobile,
    role: "agent",
    agent_code: agentCode,
    address,
    area: address,
    commission_type: commissionType,
    commission_value: commissionValue,
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
    console.error("[admin-agents] Agent profile save failed.", profileError?.message ?? userError?.message);
    await supabase.auth.admin.deleteUser(created.user.id).catch((deleteError) => {
      console.error("[admin-agents] Failed to clean up auth user after profile error.", deleteError.message);
    });
    return jsonError("Agent profile could not be saved.", 500);
  }

  return NextResponse.json({
    message: "Agent created successfully.",
    agentId: created.user.id,
    agentName: fullName,
    agentCode,
    loginUrl: "/login/agent",
  });
}
