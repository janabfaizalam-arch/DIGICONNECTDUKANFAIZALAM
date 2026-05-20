import { NextResponse } from "next/server";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import {
  assertCustomerIdentityAvailable,
  completeCustomerAccount,
  CUSTOMER_EXISTS_MESSAGE,
  findAuthUserByEmailOrMobile,
  INCOMPLETE_ACCOUNT_MESSAGE,
  isCustomerUniqueConstraintError,
  normalizeCustomerMobile,
} from "@/lib/customer-identity";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

function jsonError(message: string, status: number) {
  return NextResponse.json({ message, error: message }, { status });
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function logAdminCustomerFailure({
  step,
  email,
  mobile,
  userId,
  error,
}: {
  step: string;
  email: string;
  mobile: string;
  userId?: string | null;
  error: unknown;
}) {
  const supabaseError = error as { message?: string; code?: string; details?: string; hint?: string } | null;
  console.error("[admin-customers] Step failed", {
    step,
    email,
    mobile,
    userId: userId ?? null,
    errorMessage: error instanceof Error ? error.message : supabaseError?.message ?? String(error),
    errorCode: supabaseError?.code ?? null,
    errorDetails: supabaseError?.details ?? null,
    errorHint: supabaseError?.hint ?? null,
  });
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

  const existingAuthUser = await findAuthUserByEmailOrMobile(supabase, email, mobile);

  if (existingAuthUser) {
    console.info("[admin-customers] Existing auth user found; attempting safe customer repair.", {
      step: "existing_auth_lookup",
      email,
      mobile,
      authUserId: existingAuthUser.id,
    });

    const duplicateCheck = await assertCustomerIdentityAvailable(supabase, {
      email,
      mobile,
      excludeUserId: existingAuthUser.id,
    });

    if (duplicateCheck?.ok === false) {
      return jsonError(duplicateCheck.message, 409);
    }

    try {
      const { error: updateError } = await supabase.auth.admin.updateUserById(existingAuthUser.id, {
        password,
        email_confirm: true,
        user_metadata: {
          ...existingAuthUser.user_metadata,
          full_name: fullName,
          mobile,
          phone: mobile,
          pincode,
          city,
          state,
          role: "customer",
        },
      });

      if (updateError) {
        throw updateError;
      }

      const customerId = await completeCustomerAccount(supabase, {
        userId: existingAuthUser.id,
        fullName,
        email,
        mobile,
        pincode,
        city,
        state,
        address,
        source: "offline",
        createdBy: user.id,
        avatarUrl: String(existingAuthUser.user_metadata.avatar_url ?? existingAuthUser.user_metadata.picture ?? ""),
      });

      return NextResponse.json({
        message: INCOMPLETE_ACCOUNT_MESSAGE,
        customerId,
        userId: existingAuthUser.id,
        customerName: fullName,
        loginUrl: "/login/customer",
      });
    } catch (repairError) {
      logAdminCustomerFailure({
        step: "repair_existing_auth_user",
        email,
        mobile,
        userId: existingAuthUser.id,
        error: repairError,
      });
      return jsonError(
        isCustomerUniqueConstraintError(repairError) ? CUSTOMER_EXISTS_MESSAGE : "Customer account repair failed.",
        isCustomerUniqueConstraintError(repairError) ? 409 : 500,
      );
    }
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
    logAdminCustomerFailure({ step: "auth_admin_create_user", email, mobile, error: createError ?? "Missing created user" });
    return jsonError(alreadyExists ? CUSTOMER_EXISTS_MESSAGE : "Customer user could not be created.", alreadyExists ? 409 : 500);
  }

  try {
    const customerId = await completeCustomerAccount(supabase, {
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
    logAdminCustomerFailure({
      step: "sync_customer_records_after_auth_create",
      email,
      mobile,
      userId: created.user.id,
      error,
    });

    const { error: deleteError } = await supabase.auth.admin.deleteUser(created.user.id);

    if (deleteError) {
      logAdminCustomerFailure({
        step: "rollback_auth_user_after_sync_failure",
        email,
        mobile,
        userId: created.user.id,
        error: deleteError,
      });
      return jsonError(
        isCustomerUniqueConstraintError(error) ? CUSTOMER_EXISTS_MESSAGE : "Customer record could not be created. Auth cleanup also failed.",
        isCustomerUniqueConstraintError(error) ? 409 : 500,
      );
    }

    return jsonError(
      isCustomerUniqueConstraintError(error) ? CUSTOMER_EXISTS_MESSAGE : "Customer record could not be created.",
      isCustomerUniqueConstraintError(error) ? 409 : 500,
    );
  }
}
