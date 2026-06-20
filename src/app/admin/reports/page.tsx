import { redirect } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { AdminPageHeader } from "@/components/admin/admin-shell";
import { ReportsClient } from "./reports-client";

export const dynamic = "force-dynamic";

export type ReportApplicationItem = {
  id: string;
  serviceName: string;
  customerName: string;
  partnerName: string;
  partnerCode: string;
  amount: number;
  status: string;
  paymentStatus: string;
  district: string;
  state: string;
  createdAt: string;
};

export type ReportPartnerItem = {
  id: string;
  name: string;
  partnerCode: string;
  district: string;
  state: string;
  appCount: number;
  revenue: number;
  commission: number;
};

export default async function AdminReportsPage() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return (
      <div className="space-y-6">
        <AdminPageHeader eyebrow="Reports" title="Operations Intelligence Console" />
        <p className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-600">Database client is currently unavailable.</p>
      </div>
    );
  }

  // Load all required logs in parallel
  const [appsRes, partnersRes, commissionsRes, walletsRes] = await Promise.all([
    supabase.from("applications").select("id, service_name, customer_name, amount, status, payment_status, created_at, agency_partner_id"),
    supabase.from("agency_partners").select("id, full_name, partner_code, state, district"),
    supabase.from("ap_commissions").select("agency_partner_id, calculated_amount, status, created_at"),
    supabase.from("reward_wallets").select("balance, lifetime_earned"),
  ]);

  const rawApps = appsRes.data ?? [];
  const rawPartners = partnersRes.data ?? [];
  const rawCommissions = commissionsRes.data ?? [];
  const rawWallets = walletsRes.data ?? [];

  // Build clean items for filtering and CSV export
  const partnerMap = new Map(rawPartners.map((p) => [p.id, p]));

  const applications: ReportApplicationItem[] = rawApps.map((app) => {
    const partner = app.agency_partner_id ? partnerMap.get(app.agency_partner_id) : null;
    return {
      id: app.id,
      serviceName: app.service_name || "Unspecified Service",
      customerName: app.customer_name || "Customer",
      partnerName: partner?.full_name || "Direct Customer",
      partnerCode: partner?.partner_code || "DIRECT",
      amount: Number(app.amount || 0),
      status: app.status || "new",
      paymentStatus: app.payment_status || "pending",
      district: partner?.district || "Main Desk",
      state: partner?.state || "Delhi",
      createdAt: app.created_at,
    };
  });

  const partners: ReportPartnerItem[] = rawPartners.map((p) => {
    const partnerApps = rawApps.filter((app) => app.agency_partner_id === p.id);
    const partnerRevenue = partnerApps
      .filter((app) => ["completed", "approved", "submitted", "in_process", "in_progress"].includes(app.status))
      .reduce((sum, app) => sum + Number(app.amount || 0), 0);

    const partnerCommissions = rawCommissions
      .filter((c) => c.agency_partner_id === p.id && ["earned", "approved", "paid"].includes(c.status))
      .reduce((sum, c) => sum + Number(c.calculated_amount || 0), 0);

    return {
      id: p.id,
      name: p.full_name || "Partner Name",
      partnerCode: p.partner_code || "",
      district: p.district || "",
      state: p.state || "",
      appCount: partnerApps.length,
      revenue: partnerRevenue,
      commission: partnerCommissions,
    };
  });

  // Calculate generic statistics
  const totalRevenue = applications
    .filter((app) => ["completed", "approved", "submitted", "in_process", "in_progress"].includes(app.status))
    .reduce((sum, app) => sum + app.amount, 0);

  const totalCommissions = rawCommissions
    .filter((c) => ["earned", "approved", "paid"].includes(c.status))
    .reduce((sum, c) => sum + Number(c.calculated_amount || 0), 0);

  const totalWalletLiability = rawWallets.reduce((sum, w) => sum + Number(w.balance || 0), 0);
  const totalCashbackIssued = rawWallets.reduce((sum, w) => sum + Number(w.lifetime_earned || 0), 0);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Financial Intelligence"
        title="Operations Reporting Cockpit"
        description="Audit multi-branch filings, partner commission structures, ledger liabilities, and download compiled audit worksheets."
      />
      <ReportsClient
        applications={applications}
        partners={partners}
        stats={{
          totalRevenue,
          totalCommissions,
          totalWalletLiability,
          totalCashbackIssued,
        }}
      />
    </div>
  );
}
