import { redirect } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { AdminPageHeader } from "@/components/admin/admin-shell";
import { BranchesClient } from "./branches-client";

export const dynamic = "force-dynamic";

export type BranchMetrics = {
  branchName: string;
  state: string;
  district: string;
  partnerCount: number;
  activePartners: number;
  totalApplications: number;
  pendingApplications: number;
  completedApplications: number;
  totalRevenue: number;
  avgCommission: number;
  conversionRate: number;
};

export default async function AdminBranchesPage() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return (
      <div className="space-y-6">
        <AdminPageHeader eyebrow="Branches" title="Regional Branches Console" />
        <p className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-600">Database client is currently unavailable.</p>
      </div>
    );
  }

  // Load all partners and applications to group geographically
  const [partnersRes, appsRes, commissionsRes] = await Promise.all([
    supabase.from("agency_partners").select("id, state, district, status"),
    supabase.from("applications").select("id, agency_partner_id, amount, status"),
    supabase.from("ap_commissions").select("agency_partner_id, calculated_amount"),
  ]);

  const partners = partnersRes.data ?? [];
  const applications = appsRes.data ?? [];
  const commissions = commissionsRes.data ?? [];

  // Group by State and District (interpreted as "Branches")
  const branchMap = new Map<string, BranchMetrics>();

  partners.forEach((partner) => {
    const stateName = partner.state?.trim() || "Unspecified State";
    const districtName = partner.district?.trim() || "Main Branch";
    const branchKey = `${stateName} - ${districtName}`;

    // Filter applications for this partner
    const partnerApps = applications.filter((app) => app.agency_partner_id === partner.id);
    const partnerCommissions = commissions.filter((c) => c.agency_partner_id === partner.id);

    const partnerRevenue = partnerApps
      .filter((app) => ["completed", "approved", "submitted", "in_process", "in_progress"].includes(app.status))
      .reduce((sum, app) => sum + Number(app.amount || 0), 0);

    const totalComms = partnerCommissions.reduce((sum, c) => sum + Number(c.calculated_amount || 0), 0);

    if (branchMap.has(branchKey)) {
      const existing = branchMap.get(branchKey)!;
      existing.partnerCount += 1;
      if (partner.status === "active") existing.activePartners += 1;
      existing.totalApplications += partnerApps.length;
      existing.pendingApplications += partnerApps.filter((app) => !["completed", "rejected", "cancelled"].includes(app.status)).length;
      existing.completedApplications += partnerApps.filter((app) => app.status === "completed").length;
      existing.totalRevenue += partnerRevenue;
      existing.avgCommission += totalComms;
    } else {
      branchMap.set(branchKey, {
        branchName: districtName,
        state: stateName,
        district: districtName,
        partnerCount: 1,
        activePartners: partner.status === "active" ? 1 : 0,
        totalApplications: partnerApps.length,
        pendingApplications: partnerApps.filter((app) => !["completed", "rejected", "cancelled"].includes(app.status)).length,
        completedApplications: partnerApps.filter((app) => app.status === "completed").length,
        totalRevenue: partnerRevenue,
        avgCommission: totalComms,
        conversionRate: 0,
      });
    }
  });

  const branchList = Array.from(branchMap.values()).map((branch) => {
    const rate = branch.totalApplications > 0
      ? Math.round((branch.completedApplications / branch.totalApplications) * 100)
      : 0;
    const avgComm = branch.partnerCount > 0 ? Math.round(branch.avgCommission / branch.partnerCount) : 0;
    return {
      ...branch,
      conversionRate: rate,
      avgCommission: avgComm,
    };
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Network Analytics"
        title="Regional Branches Operating Snapshot"
        description="Monitor partner concentrations, local revenue streams, and service operational conversion rates sorted by districts."
      />
      <BranchesClient initialBranches={branchList} />
    </div>
  );
}
