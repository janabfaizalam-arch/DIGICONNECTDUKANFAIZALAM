import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import {
  assertMobileAvailableForAuthenticatedUser,
  completeCustomerAccount,
} from "@/lib/customer-identity";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const body = await request.json();
    const { mobile, pincode, city, state, district } = body;

    const cleanMobile = String(mobile ?? "").replace(/\D/g, "").slice(-10);
    const cleanPincode = String(pincode ?? "").replace(/\D/g, "").slice(0, 6);

    if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
      return NextResponse.json({ error: "Enter a valid Indian 10-digit mobile number." }, { status: 400 });
    }

    if (!/^\d{6}$/.test(cleanPincode)) {
      return NextResponse.json({ error: "Enter a valid 6-digit PIN code." }, { status: 400 });
    }

    if (!city || !city.trim() || !state || !state.trim()) {
      return NextResponse.json({ error: "City and state are mandatory fields." }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Server database connection failed." }, { status: 500 });
    }

    // 1. Prevent duplicate customer profiles (mobile already in use by another confirmed user in the public schema)
    // We ignore the user's own email completely and ignore unowned legacy rows.
    const check = await assertMobileAvailableForAuthenticatedUser(supabaseAdmin, cleanMobile, user.id);

    if (check && !check.ok) {
      return NextResponse.json({ error: check.message }, { status: 409 });
    }

    // 2. Update user metadata in Supabase Auth to reflect completed onboarding details
    await supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        mobile: cleanMobile,
        phone: cleanMobile,
        pincode: cleanPincode,
        city: city.trim(),
        district: district ? String(district).trim() : "",
        state: state.trim(),
        onboarding_completed: true,
      },
    }).catch((error) => {
      console.warn("[complete-profile] Auth user metadata update warning", error);
    });

    const fullName = String(user.user_metadata?.full_name ?? user.user_metadata?.name ?? "Customer").trim();
    const avatarUrl = String(user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? "");

    // 3. Persist profile details across profiles, customer_profiles, customers, and users tables
    await completeCustomerAccount(supabaseAdmin, {
      userId: user.id,
      fullName,
      email: user.email!,
      mobile: cleanMobile,
      pincode: cleanPincode,
      city: city.trim(),
      district: district ? String(district).trim() : "",
      state: state.trim(),
      avatarUrl,
    });

    return NextResponse.json({
      success: true,
      message: "Customer profile completed successfully.",
    });
  } catch (error) {
    console.error("[complete_profile_api_error]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Profile update failed. Please try again." },
      { status: 500 }
    );
  }
}
