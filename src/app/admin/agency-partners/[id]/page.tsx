import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ClipboardList, Landmark } from "lucide-react";

import { AdminEmptyState, AdminPageHeader, AdminStatCard } from "@/components/admin/admin-shell";
import { AgentPasswordResetForm } from "@/components/portal/agent-password-reset-form";
import { Card } from "@/components/ui/card";
import { safeCurrency } from "@/lib/admin-format";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getAgencyPartnerByUserId, getAPApplications, getAPWalletBalance, getAPCommissions } from "@/lib/ap-data";

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

  const [applications, commissions, balance, authResult] = await Promise.all([
    getAPApplications(ap.id, 50),
    getAPCommissions(ap.id, 500),
    getAPWalletBalance(ap.id),
    supabase.auth.admin.getUserById(id),
  ]);

  let loginStatus = "Auth user unavailable";
  let lastSignIn = "-";

  if (authResult.data.user) {
    loginStatus = authResult.data.user.email_confirmed_at ? "Email confirmed" : "Email pending";
    lastSignIn = formatDate(authResult.data.user.last_sign_in_at);
  }

  const pendingCommission = commissions
    .filter((c) => ["pending", "earned", "approved"].includes(c.status))
    .reduce((total, c) => total + Number(c.calculated_amount ?? 0), 0);
  const paidCommission = commissions
    .filter((c) => c.status === "paid")
    .reduce((total, c) => total + Number(c.calculated_amount ?? 0), 0);

  return (
    <div className="space-y-5">
      <Link href="/admin/agency-partners" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--primary)] hover:underline">
        <ArrowLeft className="h-4 w-4" />
        Back to Agency Partners
      </Link>

      <AdminPageHeader
        eyebrow="AP Ecosystem Profile"
        title={ap.full_name || "Agency Partner"}
        description="Verify uploaded KYC files, view ledger wallets, and manage custom partner credentials."
      />

      <div className="grid gap-3 md:grid-cols-4">
        <AdminStatCard title="Applications" value={applications.length} icon="clipboardList" tone="blue" />
        <AdminStatCard title="Ledger Balance" value={safeCurrency(balance)} icon="wallet" tone="green" />
        <AdminStatCard title="Pending Settlement" value={safeCurrency(pendingCommission)} icon="indianRupee" tone="slate" />
        <AdminStatCard title="Paid Out" value={safeCurrency(paidCommission)} icon="indianRupee" tone="orange" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
        {/* Profile Card */}
        <Card className="p-5 md:p-6 space-y-4">
          <div className="flex items-start justify-between gap-3 border-b pb-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Business Details</p>
              <h2 className="text-xl font-bold text-slate-950">{ap.business_name || "Shop Name Pending"}</h2>
              <p className="text-xs text-slate-500 font-semibold mt-1">Representative: {ap.full_name}</p>
            </div>
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold border capitalize ${
              ap.status === "active" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-amber-50 border-amber-200 text-amber-700"
            }`}>
              {ap.status}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <InfoTile label="Partner ID / Code" value={ap.partner_code} mono />
            <InfoTile label="Partner Type" value={ap.partner_type.replace("_", " ")} />
            <InfoTile label="Mobile" value={ap.mobile} mono />
            <InfoTile label="WhatsApp" value={ap.whatsapp || "—"} mono />
            <InfoTile label="Email" value={ap.email} />
            <InfoTile label="District / State" value={`${ap.district || "—"}, ${ap.state || "—"}`} />
            <InfoTile label="Pincode" value={ap.pin || "—"} mono />
            <InfoTile label="Full Address" value={ap.address || "—"} />
          </div>
        </Card>

        {/* Bank & Plan details */}
        <div className="space-y-5">
          <Card className="p-5 md:p-6 space-y-4">
            <h3 className="font-bold text-slate-950 flex items-center gap-2">
              <Landmark className="h-4.5 w-4.5 text-blue-500" />
              Settlement Bank Profile
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoTile label="Bank Name" value={ap.bank_name || "—"} />
              <InfoTile label="Account Holder" value={ap.bank_account_name || "—"} />
              <InfoTile label="Account Number" value={ap.bank_account_number || "—"} mono />
              <InfoTile label="IFSC / UPI ID" value={[ap.bank_ifsc, ap.upi_id].filter(Boolean).join(" / ") || "—"} mono />
            </div>
          </Card>

          <Card className="p-5 md:p-6 space-y-4">
            <h3 className="font-bold text-slate-950">System Configurations</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoTile label="Partner Tier" value={ap.tier?.name || "AP Starter"} />
              <InfoTile label="Commission Plan" value={`${ap.commission_type} - ${ap.commission_value || ap.commission_rate || 0}`} />
              <InfoTile label="Login Status" value={loginStatus} />
              <InfoTile label="Last Sync / Login" value={lastSignIn} />
            </div>
          </Card>
        </div>
      </div>

      {/* Nominee details */}
      <Card className="p-5 md:p-6 space-y-4">
        <h3 className="font-bold text-slate-950">Nominee & KYC Identifiers</h3>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          <InfoTile label="Aadhaar Card" value={ap.aadhaar_number || "—"} mono />
          <InfoTile label="PAN Card" value={ap.pan_number || "—"} mono />
          <InfoTile label="GSTIN" value={ap.gstin || "—"} mono />
          <InfoTile label="Emergency Contact" value={ap.emergency_contact || "—"} mono />
          <InfoTile label="Nominee Name" value={ap.nominee_name || "—"} />
          <InfoTile label="Nominee Relation" value={ap.nominee_relation || "—"} />
          <InfoTile label="Referral Source" value={ap.referral_source || "—"} />
          <InfoTile label="Onboarded At" value={formatDate(ap.created_at)} />
        </div>
      </Card>

      {/* Admin credentials reset */}
      <Card className="p-5 md:p-6">
        <p className="text-xs font-bold uppercase tracking-wider text-orange-600">On-demand Security</p>
        <h2 className="mt-1 text-xl font-bold text-slate-950">Reset Partner Password</h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">
          Reset password directly on Supabase Auth. Updates are executed using admin privileges and never written to plain tables.
        </p>
        <div className="max-w-xl mt-4">
          <AgentPasswordResetForm agentId={ap.user_id} />
        </div>
      </Card>

      {/* Applications created by this AP */}
      <Card className="p-5 md:p-6">
        <div className="flex items-center gap-2 mb-4">
          <ClipboardList className="h-5 w-5 text-orange-600" />
          <h2 className="font-bold text-slate-950">Recent Partner Submissions</h2>
        </div>
        <div className="grid gap-3">
          {applications.length ? (
            applications.slice(0, 10).map((app) => (
              <div key={app.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-4 border border-slate-100">
                <div>
                  <p className="font-bold text-slate-900">{app.service_name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Customer: {app.customerName || app.customer_name || "—"}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold capitalize border ${
                    app.status === "completed"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                      : "bg-blue-50 border-blue-200 text-blue-700"
                  }`}>
                    {app.status}
                  </span>
                  <p className="text-xs text-slate-500 font-mono">{formatDate(app.created_at)}</p>
                </div>
              </div>
            ))
          ) : (
            <AdminEmptyState title="No applications submitted" description="Submissions from this partner will compile here." />
          )}
        </div>
      </Card>
    </div>
  );
}

function InfoTile({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`mt-1 break-words font-bold text-slate-950 text-sm ${mono ? "font-mono text-xs" : ""}`}>{value}</p>
    </div>
  );
}
