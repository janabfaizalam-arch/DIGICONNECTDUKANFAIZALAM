import { redirect } from "next/navigation";
import {
  getAgencyPartnerByUserId,
  getAPDashboardStats,
  getAPApplications,
  getPartnerAnalytics,
  getActiveAnnouncements,
  getAPWalletLedger,
  getMonthlyChartData,
} from "@/lib/ap-data";
import { getCurrentUser, isActiveAgent, isCeoPartnerType } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { APDashboardClient } from "./dashboard-client";

export const dynamic = "force-dynamic";

export default async function APDashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/ap/login");
  }

  const active = await isActiveAgent(user);
  if (!active) {
    redirect("/unauthorized");
  }

  const ap = await getAgencyPartnerByUserId(user.id);
  if (!ap) {
    redirect("/unauthorized");
  }

  const [stats, applications, announcements, analytics, transactions, chartData] = await Promise.all([
    getAPDashboardStats(ap.id),
    getAPApplications(ap.id, 5),
    getActiveAnnouncements(ap.id, ap.tier_id),
    getPartnerAnalytics(ap.id),
    getAPWalletLedger(ap.id, 5),
    getMonthlyChartData(ap.id),
  ]);

  // Fetch team member data for CEO partners
  let teamMemberCount = 0;
  let teamMembers: { id: string; full_name: string; partner_type: string; status: string; partner_code: string }[] = [];

  if (isCeoPartnerType(ap.partner_type)) {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      const { data: members, count } = await supabase
        .from("agency_partners")
        .select("id, full_name, partner_type, status, partner_code", { count: "exact" })
        .eq("created_by_user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      teamMemberCount = count ?? 0;
      teamMembers = (members ?? []).map((m) => ({
        id: m.id,
        full_name: m.full_name,
        partner_type: m.partner_type,
        status: m.status,
        partner_code: m.partner_code,
      }));
    }
  }

  const recentApps = applications.slice(0, 5).map((app) => ({
    id: app.id,
    customerName: app.customerName ?? undefined,
    customer_name: app.customer_name ?? undefined,
    service_name: app.service_name,
    application_code: app.application_code ?? undefined,
    status: app.status,
  }));

  const mappedAnnouncements = announcements.map((ann) => ({
    id: ann.id,
    announcement_type: ann.announcement_type,
    published_at: ann.published_at ?? undefined,
    title: ann.title,
    body: ann.body,
  }));

  const mappedTransactions = transactions.map((tx) => ({
    id: tx.id,
    title: tx.description || tx.entry_type.replace(/_/g, " "),
    amount: Number(tx.amount),
    type: ["commission_credit", "manual_credit", "bonus"].includes(tx.entry_type) ? ("credit" as const) : ("debit" as const),
    status: "success" as const,
    date: tx.created_at,
  }));

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-[#0F172A] px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <APDashboardClient
          ap={ap as unknown as {
            id: string;
            full_name: string;
            partner_code: string;
            partner_type: string;
            kyc_status: string;
            status: string;
            district?: string | null;
            state?: string | null;
            tier?: { name: string };
          }}
          stats={stats}
          recentApps={recentApps}
          announcements={mappedAnnouncements}
          analytics={analytics}
          dbTransactions={mappedTransactions}
          chartData={chartData}
          teamMemberCount={teamMemberCount}
          teamMembers={teamMembers}
        />
      </div>
    </main>
  );
}

