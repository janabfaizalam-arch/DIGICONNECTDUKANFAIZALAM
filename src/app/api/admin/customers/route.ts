import { NextResponse } from "next/server";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import {
  assertCustomerIdentityAvailable,
  CUSTOMER_EXISTS_MESSAGE,
  normalizeCustomerMobile,
  syncCustomerIdentity,
} from "@/lib/customer-identity";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

function jsonError(message: string, status: number) {
  return NextResponse.json({ message, error: message }, { status });
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user || !isAdminRole(role)) {
    return jsonError("Admin access required.", 403);
  }

  const formData = await request.formData();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const mobile = normalizeCustomerMobile(String(formData.get("mobile") ?? ""));
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const pincode = String(formData.get("pincode") ?? "").replace(/\D/g, "").slice(0, 6);
  const city = String(formData.get("city") ?? "").trim();
  const state = String(formData.get("state") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();

  if (!fullName || !mobile || !email || !password) {
    return jsonError("Full name, email, mobile number, and password are required.", 400);
  }

  if (!/^\d{10}$/.test(mobile)) {
    return jsonError("Enter a valid 10 digit mobile number.", 400);
  }

  if (!isValidEmail(email)) {
    return jsonError("Enter a valid email address.", 400);
  }

  if (password.length < 6) {
    return jsonError("Password must be at least 6 characters.", 400);
  }

  if (pincode && !/^\d{6}$/.test(pincode)) {
    return jsonError("Enter a valid 6 digit PIN code.", 400);
  }

  const supabase = getSupabaseAdmin();

  if (!supabase) {
    console.error("[admin-customers] Supabase service role key is missing.");
    return jsonError("Customer creation is not available right now.", 500);
  }

  const duplicateCheck = await assertCustomerIdentityAvailable(supabase, { email, mobile });

  if (duplicateCheck?.ok === false) {
    return jsonError(duplicateCheck.message, 409);
  }

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      mobile,
      phone: mobile,
      pincode,
      city,
      state,
      role: "customer",
    },
  });

  if (createError || !created.user) {
    const alreadyExists = createError?.message.toLowerCase().includes("already") ?? false;
    console.error("[admin-customers] Supabase auth customer creation failed.", createError?.message);
    return jsonError(alreadyExists ? CUSTOMER_EXISTS_MESSAGE : "Customer user could not be created.", alreadyExists ? 409 : 500);
  }

  const now = new Date().toISOString();

  const [{ error: profileError }, { error: userError }] = await Promise.all([
    supabase.from("profiles").upsert(
      {
        id: created.user.id,
        full_name: fullName,
        email,
        mobile,
        role: "customer",
        pincode,
        city,
        state,
        active: true,
        is_active: true,
        updated_at: now,
      },
      { onConflict: "id" },
    ),
    supabase.from("users").upsert(
      {
        id: created.user.id,
        full_name: fullName,
        email,
        role: "customer",
        avatar_url: "",
        updated_at: now,
      },
      { onConflict: "id" },
    ),
  ]);

  if (profileError || userError) {
    console.error("[admin-customers] Customer profile save failed.", profileError?.message ?? userError?.message);
    await supabase.auth.admin.deleteUser(created.user.id).catch((deleteError) => {
      console.error("[admin-customers] Failed to clean up auth user after profile error.", deleteError.message);
    });
    return jsonError("Customer profile could not be saved.", 500);
  }

  try {
    const customerId = await syncCustomerIdentity(supabase, {
      userId: created.user.id,
      fullName,
      email,
      mobile,
      pincode,
      city,
      state,
      address,
      source: "offline",
      createdBy: user.id,
    });

    return NextResponse.json({
      message: "Customer created successfully.",
      customerId,
      userId: created.user.id,
      customerName: fullName,
      loginUrl: "/login/customer",
    });
  } catch (error) {
    console.error("[admin-customers] Customer identity sync failed.", error);
    await supabase.auth.admin.deleteUser(created.user.id).catch((deleteError) => {
      console.error("[admin-customers] Failed to clean up auth user after customer sync error.", deleteError.message);
    });
    return jsonError("Customer record could not be created.", 500);
  }
}
