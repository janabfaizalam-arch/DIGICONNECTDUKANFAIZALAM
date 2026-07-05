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

    const { sourceUserId, targetUserId } = await request.json();
    if (!sourceUserId || !targetUserId) {
      return NextResponse.json({ error: "Source and Target User IDs are required." }, { status: 400 });
    }

    if (sourceUserId === targetUserId) {
      return NextResponse.json({ error: "Source and Target User IDs cannot be the same." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "Database configuration error." }, { status: 500 });
    }

    // 1. Update associated records
    // Applications
    await supabase
      .from("applications")
      .update({ user_id: targetUserId })
      .eq("user_id", sourceUserId);

    // Payment Links
    await supabase
      .from("payment_links")
      .update({ customer_id: targetUserId })
      .eq("customer_id", sourceUserId);

    // Referral Clicks
    await supabase
      .from("referral_clicks")
      .update({ customer_id: targetUserId })
      .eq("customer_id", sourceUserId);

    // Partner Conversion Logs
    await supabase
      .from("partner_conversion_logs")
      .update({ customer_id: targetUserId })
      .eq("customer_id", sourceUserId);

    // Referral Attributions
    // Check if target already has an attribution
    const { data: targetAtt } = await supabase
      .from("referral_attributions")
      .select("id")
      .eq("customer_id", targetUserId)
      .maybeSingle();

    if (targetAtt) {
      // Target already has one, so delete source attribution
      await supabase
        .from("referral_attributions")
        .delete()
        .eq("customer_id", sourceUserId);
    } else {
      // Otherwise update source attribution to point to target user
      await supabase
        .from("referral_attributions")
        .update({ customer_id: targetUserId })
        .eq("customer_id", sourceUserId);
    }

    // Reward Wallets merge balance
    const { data: sourceWallet } = await supabase
      .from("reward_wallets")
      .select("*")
      .eq("user_id", sourceUserId)
      .maybeSingle();

    const { data: targetWallet } = await supabase
      .from("reward_wallets")
      .select("*")
      .eq("user_id", targetUserId)
      .maybeSingle();

    if (sourceWallet) {
      const sourceBal = Number(sourceWallet.balance || 0);
      const sourceLifetime = Number(sourceWallet.lifetime_earned || 0);
      if (targetWallet) {
        // Add balance to target
        await supabase
          .from("reward_wallets")
          .update({
            balance: Number(targetWallet.balance || 0) + sourceBal,
            lifetime_earned: Number(targetWallet.lifetime_earned || 0) + sourceLifetime,
            updated_at: new Date().toISOString()
          })
          .eq("id", targetWallet.id);

        // Delete source wallet
        await supabase
          .from("reward_wallets")
          .delete()
          .eq("id", sourceWallet.id);
      } else {
        // Just point source wallet to targetUserId
        await supabase
          .from("reward_wallets")
          .update({ user_id: targetUserId })
          .eq("id", sourceWallet.id);
      }
    }

    // Wallet Ledger
    await supabase
      .from("ap_wallet_ledger")
      .update({ agency_partner_id: targetUserId })
      .eq("agency_partner_id", sourceUserId);

    // Delete customer_profiles & profiles
    await supabase
      .from("customer_profiles")
      .delete()
      .eq("id", sourceUserId);

    await supabase
      .from("profiles")
      .delete()
      .eq("id", sourceUserId);

    // Delete auth user via Supabase admin client
    await supabase.auth.admin.deleteUser(sourceUserId);

    console.info(`[admin/merge] Successfully merged customer ${sourceUserId} into ${targetUserId}`);

    return NextResponse.json({
      success: true,
      message: "Customer accounts merged successfully."
    });
  } catch (error) {
    console.error("[admin/merge] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
