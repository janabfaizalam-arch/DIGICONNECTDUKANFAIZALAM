import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAgencyPartnerByUserId } from "@/lib/ap-data";
import { attachPaymentLinkRelations } from "@/lib/payments/payment-link-relations";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const ap = await getAgencyPartnerByUserId(user.id);
    if (!ap) {
      return NextResponse.json({ error: "DC Partner profile not found." }, { status: 403 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "Database configuration error." }, { status: 500 });
    }

    // 1. Fetch Referrals
    const { data: referrals } = await supabase
      .from("service_referrals")
      .select("id, token, service_slug")
      .eq("partner_id", ap.id);

    const referralIds = (referrals || []).map(r => r.id);

    // 2. Fetch Clicks
    let totalClicks = 0;
    let uniqueVisitors = 0;
    const clicksBySource: Record<string, number> = {};
    let clicksList = [];

    if (referralIds.length) {
      const { data: clicks } = await supabase
        .from("referral_clicks")
        .select("*")
        .in("referral_id", referralIds)
        .order("created_at", { ascending: false });

      if (clicks) {
        totalClicks = clicks.length;
        uniqueVisitors = new Set(clicks.map(c => c.ip_address).filter(Boolean)).size;
        
        clicks.forEach(c => {
          const src = c.utm_source || "Direct / Organic";
          clicksBySource[src] = (clicksBySource[src] || 0) + 1;
        });

        clicksList = clicks.slice(0, 10);
      }
    }

    // 3. Fetch Conversions & Applications
    let totalConversions = 0;
    let paidConversions = 0;
    let conversionsList = [];

    if (referralIds.length) {
      // partner_conversion_logs.customer_id points at auth.users, not
      // public.profiles, so a profiles embed here has no relationship to walk
      // and PostgREST fails the whole query — which is why this counted zero
      // conversions no matter how many there were. The customer's name is
      // read separately below.
      const { data: conversions } = await supabase
        .from("partner_conversion_logs")
        .select("*, applications(service_name, amount, status)")
        .in("referral_id", referralIds)
        .order("created_at", { ascending: false });

      if (conversions) {
        totalConversions = conversions.length;
        paidConversions = conversions.filter(c => ["earned", "approved", "paid"].includes(c.commission_status)).length;
        conversionsList = conversions.slice(0, 10);

        const customerIds = [
          ...new Set(
            conversionsList
              .map((c) => c.customer_id)
              .filter((id): id is string => typeof id === "string" && Boolean(id)),
          ),
        ];

        if (customerIds.length) {
          const { data: customerProfiles } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", customerIds);

          const byId = new Map((customerProfiles ?? []).map((row) => [row.id, row]));
          conversionsList = conversionsList.map((c) => ({
            ...c,
            profiles: byId.get(c.customer_id) ?? null,
          }));
        }
      }
    }

    // 4. Fetch Commissions Stats
    const { data: commissions } = await supabase
      .from("ap_commissions")
      .select("calculated_amount, status")
      .eq("agency_partner_id", ap.id);

    let commissionEarned = 0;
    let pendingCommission = 0;

    if (commissions) {
      commissions.forEach(c => {
        const val = Number(c.calculated_amount || 0);
        if (["earned", "approved", "paid", "completed", "released"].includes(c.status)) {
          commissionEarned += val;
        } else if (["pending", "reserved"].includes(c.status)) {
          pendingCommission += val;
        }
      });
    }

    // 5. Fetch Payment Links
    // Plain columns, then the names by id. Neither applications nor profiles
    // can be embedded on payment_links in this schema — see
    // attachPaymentLinkRelations — and a failed embed returns no links at all.
    const { data: paymentLinkRows } = await supabase
      .from("payment_links")
      .select("*")
      .eq("partner_id", ap.id)
      .order("created_at", { ascending: false });

    const paymentLinks = await attachPaymentLinkRelations(supabase, paymentLinkRows);

    // 6. Map Top Services
    const serviceCounts: Record<string, { count: number; name: string }> = {};
    
    // Fetch conversions count over all conversions to rank top services
    if (referralIds.length) {
      const { data: allConvs } = await supabase
        .from("partner_conversion_logs")
        .select("*, applications(service_name)")
        .in("referral_id", referralIds);
        
      if (allConvs) {
        allConvs.forEach(c => {
          const name = c.applications?.service_name || "Unknown Service";
          if (!serviceCounts[name]) {
            serviceCounts[name] = { count: 0, name };
          }
          serviceCounts[name].count += 1;
        });
      }
    }
    
    const topServices = Object.values(serviceCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Map Traffic Sources Chart Data
    const trafficSources = Object.entries(clicksBySource).map(([source, count]) => ({
      source,
      count,
    }));

    return NextResponse.json({
      success: true,
      stats: {
        totalShared: referrals?.length || 0,
        clicks: totalClicks,
        uniqueVisitors,
        applications: totalConversions,
        payments: paidConversions,
        conversionRate: totalClicks > 0 ? Math.round((totalConversions / totalClicks) * 100) : 0,
        commissionEarned,
        pendingCommission,
      },
      topServices,
      trafficSources,
      paymentLinks,
      recentActivity: {
        clicks: clicksList,
        conversions: conversionsList,
      }
    });
  } catch (error) {
    console.error("[referrals/analytics] Error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
