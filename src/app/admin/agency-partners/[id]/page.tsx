import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { AdminPartnerNotFound } from "@/components/admin/admin-partner-not-found";
import { AdminPageHeader } from "@/components/admin/admin-shell";
import {
  ADMIN_AGENCY_PARTNERS_ROUTE,
  parseAdminPartnerDetailTab,
  parseAgencyPartnerIdParam,
} from "@/lib/admin/agency-partner-routes";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  getAgencyPartnerById,
  getAPApplications,
  getAPCommissions,
  getAPKycDocuments,
  getAPPayouts,
  getAPWalletBalance,
  getAPWalletLedger,
} from "@/lib/ap-data";
import { PartnerCrmClient } from "./partner-crm-client";

export const dynamic = "force-dynamic";

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ tab?: string }>;
};

/**
 * Canonical admin partner detail.
 * Route param is always agency_partners.id (not user_id, not partner_code).
 */
export default async function AdminAPDetailPage({ params, searchParams }: PageProps) {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  const { id: rawId } = await params;
  const partnerId = parseAgencyPartnerIdParam(rawId);
  if (!partnerId) {
    return <AdminPartnerNotFound reason="malformed" />;
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return <AdminPartnerNotFound reason="unavailable" />;
  }

  // CRITICAL: load by agency_partners.id — list View/Verify links pass ap.id
  const ap = await getAgencyPartnerById(partnerId);
  if (!ap) {
    return <AdminPartnerNotFound reason="missing" />;
  }

  const query = await searchParams;
  const initialTab = parseAdminPartnerDetailTab(query?.tab);

  const [applications, commissions, balance, kycDocuments, walletLedger, payouts, authResult] =
    await Promise.all([
      getAPApplications(ap.id, 50),
      getAPCommissions(ap.id, 500),
      getAPWalletBalance(ap.id),
      getAPKycDocuments(ap.id),
      getAPWalletLedger(ap.id, 500),
      getAPPayouts(ap.id, 100),
      ap.user_id
        ? supabase.auth.admin.getUserById(ap.user_id)
        : Promise.resolve({ data: { user: null }, error: null }),
    ]);

  let loginStatus = "Auth user unavailable";
  let lastSignIn = "-";

  if (authResult.data.user) {
    loginStatus = authResult.data.user.email_confirmed_at ? "Email confirmed" : "Email pending";
    lastSignIn = formatDate(authResult.data.user.last_sign_in_at);
  }

  return (
    <div className="space-y-6">
      <Link
        href={ADMIN_AGENCY_PARTNERS_ROUTE}
        className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Agency Partners
      </Link>

      <AdminPageHeader
        eyebrow="AP Detailing Center"
        title={ap.full_name || "Agency Partner"}
        description="Verify uploaded KYC documents, perform wallet adjustments, audit commissions, and update configurations."
      />

      <PartnerCrmClient
        ap={ap}
        applications={applications}
        commissions={commissions}
        balance={balance}
        kycDocuments={kycDocuments}
        walletLedger={walletLedger}
        payouts={payouts}
        loginStatus={loginStatus}
        lastSignIn={lastSignIn}
        initialTab={initialTab}
      />
    </div>
  );
}
