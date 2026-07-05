import { NextResponse } from "next/server";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    const role = await getCurrentUserRole(user);

    if (!user || !isAdminRole(role)) {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    const { referralId, targetPartnerId } = await request.json();
    if (!referralId || !targetPartnerId) {
      return NextResponse.json({ error: "Referral ID and Target Partner ID are required." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "Database configuration error." }, { status: 500 });
    }

    // Check target partner exists
    const { data: partner } = await supabase
      .from("agency_partners")
      .select("id, full_name")
      .eq("id", targetPartnerId)
      .maybeSingle();

    if (!partner) {
      return NextResponse.json({ error: "Target partner profile not found." }, { status: 404 });
    }

    // Check referral exists
    const { data: referral } = await supabase
      .from("service_referrals")
      .select("id, service_slug")
      .eq("id", referralId)
      .maybeSingle();

    if (!referral) {
      return NextResponse.json({ error: "Referral record not found." }, { status: 404 });
    }

    // Verify uniqueness: a partner cannot have duplicate referral links for the same service
    const { data: existingDup } = await supabase
      .from("service_referrals")
      .select("id")
      .eq("partner_id", targetPartnerId)
      .eq("service_slug", referral.service_slug)
      .maybeSingle();

    if (existingDup) {
      return NextResponse.json({ error: `Target partner already has a referral link for "${referral.service_slug}".` }, { status: 400 });
    }

    // Perform update
    const { error: updateError } = await supabase
      .from("service_referrals")
      .update({ partner_id: targetPartnerId })
      .eq("id", referralId);

    if (updateError) {
      console.error("[admin/referrals/transfer] Update error:", updateError);
      return NextResponse.json({ error: "Failed to transfer referral ownership." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Referral link ownership transferred successfully to ${partner.full_name}.`
    });
  } catch (error) {
    console.error("[admin/referrals/transfer] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
