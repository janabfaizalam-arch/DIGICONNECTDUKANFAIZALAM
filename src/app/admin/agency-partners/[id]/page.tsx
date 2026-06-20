import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/admin-shell";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  getAgencyPartnerByUserId,
  getAPApplications,
  getAPWalletBalance,
  getAPCommissions,
  getAPKycDocuments,
  getAPWalletLedger,
} from "@/lib/ap-data";
import { PartnerCrmClient } from "./partner-crm-client";

export const dynamic = "force-dynamic";

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

export default async function AdminAPDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  const { id } = await params;
  const supabase = getSupabaseAdmin();

  if (!supabase) notFound();

  // Load AP record matching this ID (we query by the AP user_id = ID)
  const ap = await getAgencyPartnerByUserId(id);
  if (!ap) notFound();

  const [applications, commissions, balance, kycDocuments, walletLedger, authResult] = await Promise.all([
    getAPApplications(ap.id, 50),
    getAPCommissions(ap.id, 500),
    getAPWalletBalance(ap.id),
    getAPKycDocuments(ap.id),
    getAPWalletLedger(ap.id, 500),
    supabase.auth.admin.getUserById(id),
  ]);

  let loginStatus = "Auth user unavailable";
  let lastSignIn = "-";

  if (authResult.data.user) {
    loginStatus = authResult.data.user.email_confirmed_at ? "Email confirmed" : "Email pending";
    lastSignIn = formatDate(authResult.data.user.last_sign_in_at);
  }

  return (
    <div className="space-y-6">
      <Link href="/admin/agency-partners" className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:underline">
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
        loginStatus={loginStatus}
        lastSignIn={lastSignIn}
      />
    </div>
  );
}
