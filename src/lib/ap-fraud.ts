// ============================================================================
// Agency Partner Fraud Detection
// DigiConnect Dukan — AP Ecosystem
// ============================================================================

import { getSupabaseAdmin } from "@/lib/supabase/admin";

type FraudCheckResult = {
  ok: boolean;
  warnings: FraudWarning[];
};

type FraudWarning = {
  type: "duplicate_mobile" | "duplicate_aadhaar" | "duplicate_pan" | "duplicate_email" | "blacklisted" | "suspicious_payout";
  message: string;
  existingPartnerId?: string;
  existingPartnerName?: string;
};

/**
 * Check for duplicate identifiers before creating/updating an AP.
 */
export async function checkAPFraud(params: {
  mobile?: string | null;
  aadhaarNumber?: string | null;
  panNumber?: string | null;
  email?: string | null;
  excludePartnerId?: string | null;
}): Promise<FraudCheckResult> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: true, warnings: [] };

  const warnings: FraudWarning[] = [];

  // Normalize
  const mobile = (params.mobile ?? "").replace(/\D/g, "").slice(-10);
  const aadhaar = (params.aadhaarNumber ?? "").replace(/\D/g, "");
  const pan = (params.panNumber ?? "").toUpperCase().trim();
  const email = (params.email ?? "").toLowerCase().trim();

  // Check duplicate mobile
  if (mobile && mobile.length === 10) {
    let query = supabase
      .from("agency_partners")
      .select("id, full_name, mobile")
      .eq("mobile", mobile)
      .limit(1);
    if (params.excludePartnerId) query = query.neq("id", params.excludePartnerId);
    const { data } = await query;
    if (data?.length) {
      const match = data[0] as { id: string; full_name: string };
      warnings.push({
        type: "duplicate_mobile",
        message: `Mobile number already registered to partner: ${match.full_name}`,
        existingPartnerId: match.id,
        existingPartnerName: match.full_name,
      });
    }
  }

  // Check duplicate Aadhaar
  if (aadhaar && aadhaar.length === 12) {
    let query = supabase
      .from("agency_partners")
      .select("id, full_name, aadhaar_number")
      .eq("aadhaar_number", aadhaar)
      .limit(1);
    if (params.excludePartnerId) query = query.neq("id", params.excludePartnerId);
    const { data } = await query;
    if (data?.length) {
      const match = data[0] as { id: string; full_name: string };
      warnings.push({
        type: "duplicate_aadhaar",
        message: `Aadhaar number already registered to partner: ${match.full_name}`,
        existingPartnerId: match.id,
        existingPartnerName: match.full_name,
      });
    }
  }

  // Check duplicate PAN
  if (pan && pan.length === 10) {
    let query = supabase
      .from("agency_partners")
      .select("id, full_name, pan_number")
      .eq("pan_number", pan)
      .limit(1);
    if (params.excludePartnerId) query = query.neq("id", params.excludePartnerId);
    const { data } = await query;
    if (data?.length) {
      const match = data[0] as { id: string; full_name: string };
      warnings.push({
        type: "duplicate_pan",
        message: `PAN number already registered to partner: ${match.full_name}`,
        existingPartnerId: match.id,
        existingPartnerName: match.full_name,
      });
    }
  }

  // Check duplicate email
  if (email) {
    let query = supabase
      .from("agency_partners")
      .select("id, full_name, email")
      .ilike("email", email)
      .limit(1);
    if (params.excludePartnerId) query = query.neq("id", params.excludePartnerId);
    const { data } = await query;
    if (data?.length) {
      const match = data[0] as { id: string; full_name: string };
      warnings.push({
        type: "duplicate_email",
        message: `Email already registered to partner: ${match.full_name}`,
        existingPartnerId: match.id,
        existingPartnerName: match.full_name,
      });
    }
  }

  // Check blacklist
  if (mobile || aadhaar || pan) {
    let blacklistQuery = supabase
      .from("agency_partners")
      .select("id, full_name")
      .eq("status", "blacklisted");

    if (mobile) blacklistQuery = blacklistQuery.or(`mobile.eq.${mobile}`);
    if (aadhaar) blacklistQuery = blacklistQuery.or(`aadhaar_number.eq.${aadhaar}`);
    if (pan) blacklistQuery = blacklistQuery.or(`pan_number.eq.${pan}`);

    const { data } = await blacklistQuery.limit(1);
    if (data?.length) {
      const match = data[0] as { id: string; full_name: string };
      warnings.push({
        type: "blacklisted",
        message: `Identifiers match a blacklisted partner: ${match.full_name}`,
        existingPartnerId: match.id,
        existingPartnerName: match.full_name,
      });
    }
  }

  return {
    ok: warnings.length === 0,
    warnings,
  };
}

/**
 * Check for suspicious payout activity.
 */
export async function checkPayoutFraud(params: {
  agencyPartnerId: string;
  requestedAmount: number;
}): Promise<FraudWarning[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const warnings: FraudWarning[] = [];

  // Check if multiple payout requests in last 24 hours
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: recentPayouts } = await supabase
    .from("ap_payouts")
    .select("id, amount")
    .eq("agency_partner_id", params.agencyPartnerId)
    .gte("created_at", dayAgo)
    .in("status", ["requested", "processing"]);

  if (recentPayouts && recentPayouts.length >= 3) {
    warnings.push({
      type: "suspicious_payout",
      message: `${recentPayouts.length} payout requests in the last 24 hours — potential abuse.`,
    });
  }

  // Check if requested amount exceeds wallet balance significantly
  const { data: walletEntries } = await supabase
    .from("ap_wallet_ledger")
    .select("amount, entry_type")
    .eq("agency_partner_id", params.agencyPartnerId);

  const balance = (walletEntries ?? []).reduce((total, entry) => {
    const e = entry as { amount: number; entry_type: string };
    const creditTypes = ["commission_credit", "manual_credit", "bonus"];
    const debitTypes = ["manual_debit", "payout_deduction", "penalty", "reversal"];
    if (creditTypes.includes(e.entry_type)) return total + Number(e.amount);
    if (debitTypes.includes(e.entry_type)) return total - Math.abs(Number(e.amount));
    return total + Number(e.amount);
  }, 0);

  if (params.requestedAmount > balance) {
    warnings.push({
      type: "suspicious_payout",
      message: `Payout amount (₹${params.requestedAmount}) exceeds wallet balance (₹${balance}).`,
    });
  }

  return warnings;
}
