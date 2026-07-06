import { NextResponse } from "next/server";
import crypto from "crypto";
import { getCurrentUser } from "@/lib/auth";
import { getAgencyPartnerByUserId } from "@/lib/ap-data";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    const ap = await getAgencyPartnerByUserId(user.id);
    if (!ap) {
      return NextResponse.json({ error: "Agency Partner profile not found." }, { status: 403 });
    }

    if (ap.status !== "active") {
      return NextResponse.json({ error: "Agency Partner profile is not active." }, { status: 403 });
    }

    const { serviceSlug } = await request.json();
    if (!serviceSlug || typeof serviceSlug !== "string") {
      return NextResponse.json({ error: "Service slug is required." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "Database configuration error." }, { status: 500 });
    }

    // Check if referral token already exists for this partner & service
    const { data: existing } = await supabase
      .from("service_referrals")
      .select("token")
      .eq("partner_id", ap.id)
      .eq("service_slug", serviceSlug)
      .maybeSingle();

    if (existing?.token) {
      return NextResponse.json({ success: true, token: existing.token });
    }

    // Generate secure referral token (12-char hex token)
    const token = crypto.randomBytes(6).toString("hex").toUpperCase();

    const { error: insertError } = await supabase
      .from("service_referrals")
      .insert({
        partner_id: ap.id,
        service_slug: serviceSlug,
        token: token,
      });

    if (insertError) {
      console.error("[referrals/generate] Insert error:", insertError);
      return NextResponse.json({ error: "Failed to generate referral link. Please try again." }, { status: 500 });
    }

    return NextResponse.json({ success: true, token });
  } catch (error) {
    console.error("[referrals/generate] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
