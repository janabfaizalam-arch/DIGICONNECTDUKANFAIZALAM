import { NextResponse } from "next/server";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  if (!user || !isAdminRole(role)) {
    return NextResponse.json({ message: "Admin access required." }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ message: "Supabase service role key is missing." }, { status: 500 });
  }

  const url = new URL(request.url);
  const serviceSlug = url.searchParams.get("slug");

  try {
    // 1. Base Query for Applications
    let baseQuery = supabase
      .from("applications")
      .select("id, amount, status, created_at, service_slug, service_name, created_by, agency_partner_id, customer_details");

    if (serviceSlug) {
      baseQuery = baseQuery.eq("service_slug", serviceSlug);
    }

    const { data: apps, error: appsError } = await baseQuery;
    if (appsError || !apps) {
      return NextResponse.json({ message: appsError?.message ?? "Failed to fetch applications." }, { status: 500 });
    }

    const totalApplications = apps.length;
    const verifiedApps = apps.filter((a) => ["completed", "approved", "submitted", "in_process", "in_progress"].includes(a.status));
    const totalRevenue = verifiedApps.reduce((sum, a) => sum + Number(a.amount || 0), 0);

    const completedCount = apps.filter((a) => a.status === "completed").length;
    const rejectedCount = apps.filter((a) => a.status === "rejected").length;
    const resolvedCount = completedCount + rejectedCount;

    const approvalRate = resolvedCount > 0 ? Math.round((completedCount / resolvedCount) * 100) : 100;
    const completionRate = totalApplications > 0 ? Math.round((completedCount / totalApplications) * 100) : 0;

    // 2. Fetch Profiles for Partner aggregation
    const partnerIds = Array.from(new Set(apps.map((a) => a.created_by).filter(Boolean)));
    const { data: profiles } = partnerIds.length
      ? await supabase.from("profiles").select("id, full_name").in("id", partnerIds)
      : { data: [] };
    const profileMap = new Map(profiles?.map((p) => [p.id, p.full_name]) ?? []);

    const partnerStats = new Map<string, { count: number; revenue: number }>();
    apps.forEach((a) => {
      if (!a.created_by) return;
      const partnerName = profileMap.get(a.created_by) || "Unknown Partner";
      const stats = partnerStats.get(partnerName) || { count: 0, revenue: 0 };
      stats.count += 1;
      if (["completed", "approved", "submitted", "in_process", "in_progress"].includes(a.status)) {
        stats.revenue += Number(a.amount || 0);
      }
      partnerStats.set(partnerName, stats);
    });

    const topPartners = Array.from(partnerStats.entries())
      .map(([name, s]) => ({ name, count: s.count, revenue: s.revenue }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 3. Fetch Agency Partners for Branch aggregation
    const agencyPartnerIds = Array.from(new Set(apps.map((a) => a.agency_partner_id).filter(Boolean)));
    const { data: agencyPartners } = agencyPartnerIds.length
      ? await supabase.from("agency_partners").select("id, state, district").in("id", agencyPartnerIds)
      : { data: [] };
    const apMap = new Map(agencyPartners?.map((ap) => [ap.id, `${ap.state || "Unknown State"} - ${ap.district || "Main Branch"}`]) ?? []);

    const branchStats = new Map<string, { count: number; revenue: number }>();
    apps.forEach((a) => {
      if (!a.agency_partner_id) return;
      const branchKey = apMap.get(a.agency_partner_id) || "Unassigned Branch";
      const stats = branchStats.get(branchKey) || { count: 0, revenue: 0 };
      stats.count += 1;
      if (["completed", "approved", "submitted", "in_process", "in_progress"].includes(a.status)) {
        stats.revenue += Number(a.amount || 0);
      }
      branchStats.set(branchKey, stats);
    });

    const topBranches = Array.from(branchStats.entries())
      .map(([branch, s]) => ({ branch, count: s.count, revenue: s.revenue }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 4. Growth Trends (last 6 months)
    const monthlyStats: Record<string, { count: number; revenue: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const label = d.toLocaleString("default", { month: "short", year: "2-digit" });
      monthlyStats[label] = { count: 0, revenue: 0 };
    }

    apps.forEach((a) => {
      const date = new Date(a.created_at);
      const label = date.toLocaleString("default", { month: "short", year: "2-digit" });
      if (monthlyStats[label]) {
        monthlyStats[label].count += 1;
        if (["completed", "approved", "submitted", "in_process", "in_progress"].includes(a.status)) {
          monthlyStats[label].revenue += Number(a.amount || 0);
        }
      }
    });

    const growthTrends = Object.entries(monthlyStats).map(([date, s]) => ({
      date,
      applications: s.count,
      revenue: s.revenue,
    }));

    // 5. Category distribution
    const categoryStats = new Map<string, { count: number; revenue: number }>();
    apps.forEach((a) => {
      const cat = a.service_name?.split(" ")[0] || "Services"; // rough categorization from service name
      const stats = categoryStats.get(cat) || { count: 0, revenue: 0 };
      stats.count += 1;
      if (["completed", "approved", "submitted", "in_process", "in_progress"].includes(a.status)) {
        stats.revenue += Number(a.amount || 0);
      }
      categoryStats.set(cat, stats);
    });

    const categoryTrends = Array.from(categoryStats.entries()).map(([category, s]) => ({
      category,
      count: s.count,
      revenue: s.revenue,
    }));

    // 6. Latest 10 applications
    const latestApplications = apps
      .slice()
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10)
      .map((a) => {
        const customer = (a.customer_details as Record<string, unknown> | null | undefined) || {};
        return {
          id: a.id,
          amount: a.amount,
          status: a.status,
          created_at: a.created_at,
          customerName: customer.name || "N/A",
          customerMobile: customer.mobile || "N/A",
        };
      });

    return NextResponse.json({
      summary: {
        totalApplications,
        totalRevenue,
        approvalRate,
        completionRate,
      },
      growthTrends,
      categoryTrends,
      topPartners,
      topBranches,
      latestApplications,
    });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Error computing analytics." }, { status: 500 });
  }
}
