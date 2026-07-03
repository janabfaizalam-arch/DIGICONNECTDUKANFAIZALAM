import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeAppRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const supabase = await getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const metadataRole = normalizeAppRole(user.user_metadata?.role);
    let role = metadataRole;
    if (!role) {
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      role = normalizeAppRole(profile?.role);
    }

    if (role !== "agency_partner" && role !== "admin") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }
    const { searchParams } = new URL(request.url);
    const mobile = String(searchParams.get("mobile") ?? "").trim().replace(/\D/g, "");

    if (!mobile || mobile.length !== 10) {
      return NextResponse.json({ success: false, error: "Invalid mobile number" }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, error: "Database connection failed" }, { status: 500 });
    }

    // 1. Locate customer profile matching mobile number
    const { data: profileData, error } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, mobile, city, address, pincode, state, district, avatar_url, created_at")
      .eq("mobile", mobile)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    let profile = profileData;

    // Fallback search in customer_profiles table
    if (!profile) {
      const { data: custProfile, error: custError } = await supabaseAdmin
        .from("customer_profiles")
        .select("id, full_name, email, mobile, city, address, pincode, state, district, photo_url, created_at")
        .eq("mobile", mobile)
        .maybeSingle();

      if (custError) {
        return NextResponse.json({ success: false, error: custError.message }, { status: 500 });
      }

      if (!custProfile) {
        return NextResponse.json({ success: true, found: false });
      }

      profile = {
        id: custProfile.id,
        full_name: custProfile.full_name,
        email: custProfile.email,
        mobile: custProfile.mobile,
        city: custProfile.city,
        address: custProfile.address,
        pincode: custProfile.pincode,
        state: custProfile.state,
        district: custProfile.district,
        avatar_url: custProfile.photo_url || "",
        created_at: custProfile.created_at,
      };
    }

    const userId = profile.id;

    // 2. Fetch Customer 360 Metrics
    // Fetch wallet balance points using core missing rewards RPC
    const { data: walletData } = await supabaseAdmin.rpc("create_reward_wallet_if_missing", { p_user_id: userId });
    const walletBalance = walletData ? Number((walletData as { balance?: number }).balance ?? 0) : 0;

    // Query list of user's past applications to aggregate stats
    const { data: apps } = await supabaseAdmin
      .from("applications")
      .select("id, service_name, service_slug, status, amount, created_at, assigned_to")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    const totalApplications = apps ? apps.length : 0;
    const completedApplications = apps ? apps.filter((a) => a.status === "completed").length : 0;
    const pendingApplications = apps ? apps.filter((a) => a.status !== "completed" && a.status !== "rejected").length : 0;
    
    const recentServices = apps
      ? Array.from(new Set(apps.slice(0, 5).map((a) => a.service_name)))
      : [];

    const recentApplications = apps
      ? apps.slice(0, 10).map((a) => ({
          id: a.id,
          serviceName: a.service_name,
          serviceSlug: a.service_slug,
          status: a.status,
          amount: Number(a.amount || 0),
          createdAt: a.created_at,
          assignedTo: a.assigned_to || "Pending Assignment",
        }))
      : [];

    const formattedDate = new Date(profile.created_at).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    return NextResponse.json({
      success: true,
      found: true,
      profile: {
        id: userId,
        name: profile.full_name || "Customer",
        email: profile.email,
        mobile: profile.mobile,
        city: profile.city || "",
        address: profile.address || "",
        pincode: profile.pincode || "",
        state: profile.state || "",
        district: profile.district || "",
        avatarUrl: profile.avatar_url || "",
      },
      stats: {
        totalApplications,
        completedApplications,
        pendingApplications,
        recentServices,
        recentApplications,
        walletBalance,
        customerSince: formattedDate,
        lastVisit: recentApplications[0] ? new Date(recentApplications[0].createdAt).toLocaleDateString("en-IN") : formattedDate,
      },
    });
  } catch (error) {
    console.error("[customer_lookup_api_error]", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
