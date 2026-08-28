import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CustomerPortal } from "@/components/customer/portal-shell";
import { getCurrentUser, getCurrentUserRole, getRoleHome, isCustomerRole, syncUserProfile } from "@/lib/auth";
import { getCustomerDashboardProfile, getCustomerProfileStatus } from "@/lib/customer-profile";
import { getCustomerDashboardData } from "@/lib/customer-dashboard-data";
import { getWalletSnapshot } from "@/lib/wallet";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isCustomerVisibleDocument } from "@/lib/applications/document-visibility";
import type { ApplicationDocument as PortalApplicationDocument } from "@/lib/portal-types";

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
  status?: string | null;
  review_status?: string | null;
  uploaded_by_role?: string | null;
  is_final?: boolean | null;
  customer_visible?: boolean | null;
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

const NOTIFICATION_SELECT = "id, user_id, application_id, title, message, read_at, created_at";
const DOCUMENT_SELECT =
  "id, application_id, document_type, document_name, file_name, file_url, file_type, status, review_status, uploaded_by_role, is_final, customer_visible, uploaded_at, created_at";

export default async function CustomerDashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login/customer");
  }

  const metadataName = textValue(user.user_metadata.full_name) || textValue(user.user_metadata.name);
  const metadataMobile = textValue(user.phone) || textValue(user.user_metadata.mobile) || textValue(user.user_metadata.phone);
  const metadataEmail = user.email ?? "";

  /**
   * Three independent pieces of setup, run together.
   *
   * They used to be three sequential awaits in front of everything else, so
   * every visit paid for a profile mirror, then a role read, then the claim
   * RPC, and only then asked for any of the data the page actually renders.
   * None of the three needs the others.
   *
   * The claim RPC does have to finish before the loaders below: it attaches
   * applications that were filed before the customer had an account, and a
   * read that overtook it would show a newly signed-up customer an empty
   * dashboard on the one visit where it matters most. So it is hoisted into
   * this group rather than moved after the reads.
   */
  const [, , role] = await Promise.all([
    syncUserProfile(user).catch((error) => {
      logDashboardLoadFailed("sync_user_profile", user.id, error);
    }),
    (async () => {
      if (!user.email_confirmed_at || !metadataEmail || !metadataMobile) return;
      const supabase = await getSupabaseServerClient();
      if (!supabase) return;
      const { error } = await supabase.rpc("claim_customer_applications");
      if (error) {
        console.warn("CUSTOMER_SYNC_WARNING", {
          userId: user.id,
          message: error.message,
          code: error.code,
        });
      }
    })(),
    getCurrentUserRole(user),
  ]);

  if (!isCustomerRole(role)) {
    redirect(getRoleHome(role));
  }

  const supabaseAdmin = getSupabaseAdmin();

  const [customerProfile, dashboardData, walletSnapshot, profileStatus] = await Promise.all([
    getCustomerDashboardProfile(user.id).catch((error) => {
      logDashboardLoadFailed("dashboard_profile", user.id, error);
      return null;
    }),
    getCustomerDashboardData(user.id).catch((error) => {
      logDashboardLoadFailed("dashboard_data", user.id, error);
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
    }),
    getWalletSnapshot(user.id).catch((error) => {
      logDashboardLoadFailed("wallet_snapshot", user.id, error);
      return null;
    }),
    getCustomerProfileStatus(user.id).catch((error) => {
      logDashboardLoadFailed("profile_status", user.id, error);
      return null;
    }),
  ]);

  const { applications, stats } = dashboardData;
  const name =
    textValue(customerProfile?.full_name) ||
    metadataName ||
    textValue(customerProfile?.email) ||
    metadataEmail ||
    textValue(customerProfile?.mobile) ||
    metadataMobile ||
    "Customer";

  // Profile completeness is derived from `profileStatus.completion`, which
  // `getCustomerProfileStatus` already computes from the one list of required
  // fields. This page used to re-check four of those fields by hand and pass
  // its own boolean, so the header and the profile form could disagree about
  // whether a profile was finished.

  let documents: ApplicationDocument[] = [];
  let notifications: CustomerNotification[] = [];
  const appIds = applications.map((a) => a.id);

  if (supabaseAdmin) {
    const [docsResult, notifResult] = await Promise.all([
      appIds.length > 0
        ? supabaseAdmin
            .from("application_documents")
            .select(DOCUMENT_SELECT)
            .in("application_id", appIds)
            .order("created_at", { ascending: false })
            .limit(100)
        : Promise.resolve({ data: null }),
      supabaseAdmin
        .from("notifications")
        .select(NOTIFICATION_SELECT)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(15),
    ]);

    if (docsResult.data) {
      documents = (docsResult.data as unknown as ApplicationDocument[]).filter((doc) =>
        isCustomerVisibleDocument(doc as PortalApplicationDocument),
      );
    }
    if (notifResult.data) {
      notifications = notifResult.data as unknown as CustomerNotification[];
    }
  }

  // Prefer wallet snapshot balance over duplicate reward_wallets read in dashboard stats
  const mergedStats = {
    ...stats,
    walletBalance: walletSnapshot?.wallet?.balance_points ?? stats.walletBalance,
    lifetimeEarning: walletSnapshot?.referralSummary?.rewardEarned ?? stats.lifetimeEarning,
  };

  return (
    <CustomerPortal
      applications={applications}
      stats={mergedStats}
      profile={{ name }}
      walletSnapshot={walletSnapshot}
      profileStatus={profileStatus}
      documents={documents}
      notifications={notifications}
      user={user}
    />
  );
}
