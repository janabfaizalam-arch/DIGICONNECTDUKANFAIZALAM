import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import {
  assertMobileAvailableForAuthenticatedUser,
  completeCustomerAccount,
} from "@/lib/customer-identity";
import { attachReferralOnSignup, ensureReferralCodeForUser } from "@/lib/referrals";
import { createWalletIfMissing } from "@/lib/rewards-wallet";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { creditSignupBonus } from "@/lib/wallet-ledger";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    console.info("ONBOARDING_CURRENT_USER", {
      userId: user.id,
      email: user.email ?? null,
      hasMetadataMobile: Boolean(user.user_metadata?.mobile),
      hasMetadataPincode: Boolean(user.user_metadata?.pincode),
      onboardingCompleted: Boolean(user.user_metadata?.onboarding_completed),
    });

    const body = await request.json();
    const { mobile, pincode, city, district, state } = body;

    const cleanMobile = String(mobile ?? "").replace(/\D/g, "").slice(-10);
    const cleanPincode = String(pincode ?? "").replace(/\D/g, "").slice(0, 6);

    if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
      return NextResponse.json({ error: "Enter a valid Indian 10-digit mobile number." }, { status: 400 });
    }

    if (!/^\d{6}$/.test(cleanPincode)) {
      return NextResponse.json({ error: "Enter a valid 6-digit PIN code." }, { status: 400 });
    }

    if (!city || !city.trim() || !state || !state.trim()) {
      return NextResponse.json({ error: "City and state are mandatory onboarding fields." }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Server database connection failed." }, { status: 500 });
    }

    // 1. Prevent duplicate customer profiles (mobile already in use by another confirmed user)
    // For authenticated onboarding, we use the mobile-only check and ignore the user's own email.
    const check = await assertMobileAvailableForAuthenticatedUser(supabaseAdmin, cleanMobile, user.id);

    if (check && !check.ok) {
      return NextResponse.json({ error: check.message }, { status: 409 });
    }

    // 2. Claim legacy unowned rows (one-time repair/claim step)
    // Claim customers rows with same email/mobile and user_id null
    const { data: legacyCustomers } = await supabaseAdmin
      .from("customers")
      .select("id, user_id, email, mobile")
      .or(`email.ilike.${user.email},mobile.eq.${cleanMobile}`)
      .is("user_id", null);

    if (legacyCustomers && legacyCustomers.length > 0) {
      console.info("ONBOARDING_CLAIM_LEGACY_CUSTOMERS", {
        count: legacyCustomers.length,
        userId: user.id,
      });

      // Update the first legacy row to point to the user ID
      const firstLegacy = legacyCustomers[0];
      const { error: updateError } = await supabaseAdmin
        .from("customers")
        .update({
          user_id: user.id,
          email: user.email!,
          mobile: cleanMobile,
          updated_at: new Date().toISOString(),
        })
        .eq("id", firstLegacy.id);

      if (updateError) {
        console.error("ONBOARDING_CLAIM_LEGACY_CUSTOMER_FAILED", {
          id: firstLegacy.id,
          error: updateError,
        });
      } else {
        console.info("ONBOARDING_CLAIM_LEGACY_CUSTOMER_SUCCESS", {
          id: firstLegacy.id,
          userId: user.id,
        });

        // Delete other legacy rows that match the same criteria to avoid duplicates
        if (legacyCustomers.length > 1) {
          const otherIds = legacyCustomers.slice(1).map((r) => r.id);
          const { error: deleteError } = await supabaseAdmin
            .from("customers")
            .delete()
            .in("id", otherIds);

          if (deleteError) {
            console.warn("ONBOARDING_CLEANUP_DUPLICATE_LEGACY_CUSTOMERS_FAILED", {
              ids: otherIds,
              error: deleteError,
            });
          }
        }
      }
    }

    // Claim customer_profiles rows with same email/mobile and user_id null
    const { data: legacyCPs } = await supabaseAdmin
      .from("customer_profiles")
      .select("id, user_id, email, mobile")
      .or(`email.ilike.${user.email},mobile.eq.${cleanMobile}`)
      .is("user_id", null);

    if (legacyCPs && legacyCPs.length > 0) {
      console.info("ONBOARDING_CLAIM_LEGACY_CP", {
        count: legacyCPs.length,
        userId: user.id,
      });

      const firstLegacyCP = legacyCPs[0];
      const { error: updateError } = await supabaseAdmin
        .from("customer_profiles")
        .update({
          id: user.id,
          user_id: user.id,
          email: user.email!,
          mobile: cleanMobile,
          updated_at: new Date().toISOString(),
        })
        .eq("id", firstLegacyCP.id);

      if (updateError) {
        console.error("ONBOARDING_CLAIM_LEGACY_CP_FAILED", {
          id: firstLegacyCP.id,
          error: updateError,
        });
      } else {
        console.info("ONBOARDING_CLAIM_LEGACY_CP_SUCCESS", {
          id: firstLegacyCP.id,
          userId: user.id,
        });

        if (legacyCPs.length > 1) {
          const otherIds = legacyCPs.slice(1).map((r) => r.id);
          const { error: deleteError } = await supabaseAdmin
            .from("customer_profiles")
            .delete()
            .in("id", otherIds);

          if (deleteError) {
            console.warn("ONBOARDING_CLEANUP_DUPLICATE_LEGACY_CP_FAILED", {
              ids: otherIds,
              error: deleteError,
            });
          }
        }
      }
    }

    // 3. Persist profile details across profiles, customer_profiles, customers, and users tables
    const avatarUrl = String(user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? "");
    const fullName = String(user.user_metadata?.full_name ?? user.user_metadata?.name ?? "Customer").trim();

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

    // 3. Ensure referral configurations, reward wallets, and signup rewards are created and credited (idempotent)
    await ensureReferralCodeForUser(user.id).catch((error) => {
      console.error("[onboarding] Referral code generation failed", error);
    });

    await createWalletIfMissing(user.id).catch((error) => {
      console.error("[onboarding] Wallet creation failed", error);
    });

    await creditSignupBonus(user.id).catch((error) => {
      console.error("[onboarding] Signup bonus credit failed", error);
    });

    // 4. Attach referral if metadata indicates an invite signup code
    const referralCode = String(
      user.user_metadata?.referred_by ?? user.user_metadata?.referral_code ?? user.user_metadata?.ref ?? ""
    )
      .trim()
      .toUpperCase();

    if (referralCode) {
      await attachReferralOnSignup(user.id, referralCode, null, null).catch((error) => {
        console.error("[onboarding] Referral attachment failed", error);
      });
    }

    // Update user metadata in Supabase Auth to reflect completed onboarding details
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
      console.warn("[onboarding] Auth user metadata update warning", error);
    });

    return NextResponse.json({
      success: true,
      message: "Customer onboarding successfully completed.",
      destination: "/customer/dashboard",
    });
  } catch (error) {
    console.error("[onboarding_api_error]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Onboarding failed. Please try again." },
      { status: 500 }
    );
  }
}
