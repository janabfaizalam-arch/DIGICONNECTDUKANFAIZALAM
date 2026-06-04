import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CustomerDashboard } from "@/components/portal/customer-dashboard";
import { getCurrentUser, getCurrentUserRole, getRoleHome, isCustomerRole, syncUserProfile } from "@/lib/auth";
import { getCustomerDashboardProfile, getCustomerProfileStatus } from "@/lib/customer-profile";
import { getCustomerDashboardData } from "@/lib/customer-dashboard-data";
import { getWalletSnapshot } from "@/lib/wallet";
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

export interface ApplicationDocument {
  id: string;
  application_id: string;
  document_type: string;
  document_name?: string | null;
  file_name: string;
  file_url: string;
  file_type?: string | null;
  storage_path?: string | null;
  status?: string | null;
  review_status?: string | null;
  uploaded_by_role?: string | null;
  is_final?: boolean | null;
  uploaded_at?: string | null;
  created_at: string;
}

export interface CustomerNotification {
  id: string;
  user_id: string;
  application_id?: string | null;
  title: string;
  message: string;
  read_at?: string | null;
  created_at: string;
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
  const customerProfile = await getCustomerDashboardProfile(user.id).catch((error) => {
    console.error("CUSTOMER_DASHBOARD_PROFILE_FETCH_FAILED", {
      step: "dashboard_profile_wrapper",
      userId: user.id,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return null;
  });
  const { applications, stats } = await getCustomerDashboardData(user.id).catch((error) => {
    logDashboardLoadFailed("dashboard_data_wrapper", user.id, error);
    return {
      applications: [],
      stats: {
        code: "",
        link: "",
        totalReferrals: 0,
        todayEarning: 0,
        lifetimeEarning: 0,
        walletBalance: 0,
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
  const supabaseAdmin = getSupabaseAdmin();
  let userProfile = null;
  if (supabaseAdmin) {
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("mobile, pincode, city, state")
      .eq("id", user.id)
      .maybeSingle();
    userProfile = data;
  }
  const isProfileIncomplete = !userProfile?.mobile || !userProfile?.pincode || !userProfile?.city || !userProfile?.state;

  // Fetch Wallet Snapshot (credits, debits, referral summary, transactions)
  const walletSnapshot = await getWalletSnapshot(user.id).catch((error) => {
    logDashboardLoadFailed("wallet_snapshot", user.id, error);
    return null;
  });

  // Fetch detailed Profile status (pincode, address completion stats)
  const profileStatus = await getCustomerProfileStatus(user.id).catch((error) => {
    logDashboardLoadFailed("profile_status", user.id, error);
    return null;
  });

  // Fetch all documents related to the user's active applications
  let documents: ApplicationDocument[] = [];
  const appIds = applications.map((a) => a.id);
  if (appIds.length > 0 && supabaseAdmin) {
    const { data: docsData } = await supabaseAdmin
      .from("application_documents")
      .select("id, application_id, document_type, document_name, file_name, file_url, file_type, storage_path, status, review_status, uploaded_by_role, is_final, uploaded_at, created_at")
      .in("application_id", appIds)
      .order("created_at", { ascending: false });
    if (docsData) {
      documents = docsData as unknown as ApplicationDocument[];
    }
  }

  // Fetch user-specific notifications
  let notifications: CustomerNotification[] = [];
  if (supabaseAdmin) {
    const { data: notifData } = await supabaseAdmin
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(15);
    if (notifData) {
      notifications = notifData as unknown as CustomerNotification[];
    }
  }

  return (
    <CustomerDashboard
      applications={applications}
      stats={stats}
      profile={{ name }}
      isProfileIncomplete={isProfileIncomplete}
      walletSnapshot={walletSnapshot}
      profileStatus={profileStatus}
      documents={documents}
      notifications={notifications}
      user={user}
    />
  );
}
