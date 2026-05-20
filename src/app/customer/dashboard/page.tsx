import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CustomerDashboard } from "@/components/portal/customer-dashboard";
import { getCurrentUser, getCurrentUserRole, getRoleHome, isCustomerRole, syncUserProfile } from "@/lib/auth";
import { getCustomerDashboardProfile } from "@/lib/customer-profile";
import { getCustomerDashboardData } from "@/lib/customer-dashboard-data";
import { completeCustomerAccount } from "@/lib/customer-identity";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Customer Dashboard | DigiConnect Dukan",
  description: "Track DigiConnect Dukan applications, documents, invoices, payments, and admin updates.",
};

function textValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function logDashboardLoadFailed(step: string, userId: string | null, error: unknown) {
  const supabaseError = error as { message?: string; code?: string; details?: string; hint?: string } | null;
  console.error("CUSTOMER_DASHBOARD_LOAD_FAILED", {
    step,
    userId,
    errorMessage: error instanceof Error ? error.message : supabaseError?.message ?? String(error),
    errorCode: supabaseError?.code ?? null,
    errorDetails: supabaseError?.details ?? null,
    errorHint: supabaseError?.hint ?? null,
  });
}

export default async function CustomerDashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login/customer");
  }

  try {
    await syncUserProfile(user);
  } catch (error) {
    logDashboardLoadFailed("sync_user_profile", user.id, error);
  }

  const role = await getCurrentUserRole(user);

  if (!isCustomerRole(role)) {
    redirect(getRoleHome(role));
  }

  const metadataName = textValue(user.user_metadata.full_name) || textValue(user.user_metadata.name);
  const metadataMobile = textValue(user.phone) || textValue(user.user_metadata.mobile) || textValue(user.user_metadata.phone);
  const metadataEmail = user.email ?? "";

  if (user.email_confirmed_at) {
    if (!metadataEmail || !metadataMobile) {
      console.info("CLAIM_SKIPPED_MISSING_IDENTITY", {
        userId: user.id,
        email: metadataEmail || null,
        hasMobile: Boolean(metadataMobile),
      });
    } else {
      const supabase = await getSupabaseServerClient();
      if (supabase) {
        const { error } = await supabase.rpc("claim_customer_applications");
        if (error) {
          console.warn("CUSTOMER_SYNC_WARNING", {
            step: "claim_customer_applications",
            userId: user.id,
            errorMessage: error.message,
            errorCode: error.code,
          });
        }
      }
    }
  }
  const supabaseAdmin = getSupabaseAdmin();

  if (supabaseAdmin) {
    try {
      await completeCustomerAccount(supabaseAdmin, {
        userId: user.id,
        fullName: metadataName || "Customer",
        email: metadataEmail,
        mobile: metadataMobile,
        pincode: textValue(user.user_metadata.pincode),
        city: textValue(user.user_metadata.city),
        state: textValue(user.user_metadata.state),
        source: "online",
        avatarUrl: textValue(user.user_metadata.avatar_url) || textValue(user.user_metadata.picture),
      });
    } catch (error) {
      logDashboardLoadFailed("auto_repair_customer_account", user.id, error);
    }
  }

  const customerProfile = await getCustomerDashboardProfile(user.id).catch((error) => {
    console.error("CUSTOMER_DASHBOARD_PROFILE_FETCH_FAILED", {
      step: "dashboard_profile_wrapper",
      userId: user.id,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return null;
  });

  const { applications, notifications, walletSnapshot } = await getCustomerDashboardData(user.id).catch((error) => {
    logDashboardLoadFailed("dashboard_data_wrapper", user.id, error);
    return {
      applications: [],
      notifications: [],
      walletSnapshot: {
        wallet: null,
        transactions: [],
        cashbackEarned: 0,
        cashbackUsed: 0,
        expiringSoonAmount: 0,
        referralSummary: null,
      },
    };
  });
  const name =
    textValue(customerProfile?.full_name) ||
    metadataName ||
    textValue(customerProfile?.email) ||
    metadataEmail ||
    textValue(customerProfile?.mobile) ||
    metadataMobile ||
    "Customer";
  const email = textValue(customerProfile?.email) || metadataEmail;
  const avatarUrl =
    textValue(customerProfile?.photo_url) ||
    textValue(customerProfile?.avatar_url) ||
    textValue(user.user_metadata.avatar_url) ||
    textValue(user.user_metadata.picture);

  return (
    <CustomerDashboard
      applications={applications}
      notifications={notifications}
      walletSnapshot={walletSnapshot}
      profile={{ name, email, avatarUrl }}
    />
  );
}
