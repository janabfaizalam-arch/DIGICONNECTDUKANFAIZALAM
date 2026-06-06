import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getCustomerProfile } from "@/lib/customer-profile";
import { getCustomerDashboardData } from "@/lib/customer-dashboard-data";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({
        isLoggedIn: false,
        profile: null,
        wallet: null,
        activeApplications: [],
      });
    }

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Server database connection failed." }, { status: 500 });
    }

    // 1. Get profile data
    const profile = await getCustomerProfile(user.id);

    // 2. Get wallet and referral dashboard data
    const dashboardData = await getCustomerDashboardData(user.id).catch(() => ({
      applications: [],
      stats: {
        code: "",
        link: "",
        totalReferrals: 0,
        todayEarning: 0,
        lifetimeEarning: 0,
        walletBalance: 0,
      },
    }));

    // 3. Get detailed list of applications (including service_slug)
    const { data: dbApplications, error: appError } = await supabaseAdmin
      .from("applications")
      .select("id, service_name, service_slug, status, payment_status, created_at, amount")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (appError) {
      console.error("[profile_api] Failed to fetch user applications", appError);
    }

    const activeApplications = (dbApplications ?? []).map((app) => ({
      id: app.id,
      serviceName: app.service_name,
      serviceSlug: app.service_slug,
      status: app.status,
      paymentStatus: app.payment_status,
      createdAt: app.created_at,
      amount: app.amount,
    }));

    return NextResponse.json({
      isLoggedIn: true,
      profile: {
        name: profile?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || "Customer",
        email: profile?.email || user.email || "",
        mobile: profile?.mobile || user.phone || "",
        dob: profile?.dob || "",
        gender: profile?.gender || "",
        address: profile?.address || "",
        city: profile?.city || "",
        district: profile?.district || "",
        state: profile?.state || "",
        pincode: profile?.pincode || "",
        photoUrl: profile?.photo_url || user.user_metadata?.avatar_url || "",
      },
      wallet: {
        balance: dashboardData.stats.walletBalance,
        referralCode: dashboardData.stats.code,
        referralLink: dashboardData.stats.link,
        totalReferrals: dashboardData.stats.totalReferrals,
        lifetimeEarned: dashboardData.stats.lifetimeEarning,
        todayEarned: dashboardData.stats.todayEarning,
      },
      activeApplications,
    });
  } catch (error) {
    console.error("[profile_api_error]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error." },
      { status: 500 }
    );
  }
}
