"use server";

import { getCurrentUser } from "@/lib/auth";
import { getAgencyPartnerByUserId } from "@/lib/ap-data";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function getShareReferralCode(): Promise<string | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const ap = await getAgencyPartnerByUserId(user.id);
  if (ap && ap.partner_code) {
    return ap.partner_code;
  }

  // Fallback to older tables if needed
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data } = await supabase
      .from("profiles")
      .select("referral_code, partner_code")
      .eq("id", user.id)
      .maybeSingle();

    if (data?.partner_code) return data.partner_code;
    if (data?.referral_code) return data.referral_code;
  }

  return null;
}
