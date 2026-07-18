"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { getAPWalletBalance } from "@/lib/ap-data";
import type { APStatus, APKycStatus, APWalletEntryType } from "@/lib/ap-types";

// Helper to check admin session
async function verifyAdmin() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  if (!user || !isAdminRole(role)) {
    throw new Error("Admin access is required.");
  }
  return user;
}

export async function updatePartnerStatusAction(
  apId: string,
  status: APStatus,
  kycStatus: APKycStatus,
  notes: string
) {
  const admin = await verifyAdmin();
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Database client is offline.");

  const payload: Record<string, unknown> = {
    status,
    kyc_status: kycStatus,
    admin_notes: notes,
    updated_at: new Date().toISOString(),
  };

  if (status === "active") {
    payload.activated_at = new Date().toISOString();
  } else if (status === "suspended") {
    payload.suspended_at = new Date().toISOString();
  } else if (status === "blacklisted") {
    payload.blacklisted_at = new Date().toISOString();
  }

  if (kycStatus === "approved") {
    payload.kyc_verified_at = new Date().toISOString();
    payload.kyc_verified_by = admin.id;
  }

  // Find the partner's user_id first to update profiles
  const { data: partner } = await supabase
    .from("agency_partners")
    .select("user_id")
    .eq("id", apId)
    .single();

  const { error } = await supabase
    .from("agency_partners")
    .update(payload)
    .eq("id", apId);

  if (error) {
    throw new Error(`Failed to update partner: ${error.message}`);
  }

  // Sync to profiles table
  if (partner?.user_id) {
    const profilePayload: Record<string, unknown> = {
      kyc_status: kycStatus === "approved" ? "approved" : "pending",
      active: status === "active",
      is_active: status === "active",
      updated_at: new Date().toISOString(),
    };
    
    await supabase
      .from("profiles")
      .update(profilePayload)
      .eq("id", partner.user_id);
  }

  revalidatePath(`/admin/agency-partners/${apId}`);
}

export async function adjustWalletBalanceAction(
  apId: string,
  amount: number,
  entryType: APWalletEntryType,
  description: string
) {
  const admin = await verifyAdmin();
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Database client is offline.");

  if (amount <= 0) throw new Error("Adjustment amount must be positive.");

  // Get current balance
  const currentBalance = await getAPWalletBalance(apId);

  const isCredit = [
    "commission_credit",
    "manual_credit",
    "bonus",
    "adjustment",
  ].includes(entryType);

  const netAmount = isCredit ? amount : -Math.abs(amount);
  const newRunningBalance = currentBalance + netAmount;

  const { error } = await supabase.from("ap_wallet_ledger").insert({
    agency_partner_id: apId,
    entry_type: entryType,
    amount: netAmount,
    running_balance: newRunningBalance,
    description: description || `Manual adjustment by admin (${entryType})`,
    created_by: admin.id,
    created_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(`Failed to write wallet ledger: ${error.message}`);
  }

  revalidatePath(`/admin/agency-partners/${apId}`);
}

export async function reviewKycDocumentAction(
  docId: string,
  action: "accepted" | "rejected",
  reason?: string
) {
  const admin = await verifyAdmin();
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Database client is offline.");

  const { error } = await supabase
    .from("agency_partner_kyc_documents")
    .update({
      status: action,
      rejection_reason: action === "rejected" ? reason || "Rejected by verification officer" : null,
      reviewed_by: admin.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", docId);

  if (error) {
    throw new Error(`Failed to review document: ${error.message}`);
  }

  // Get document detail to revalidate path
  const { data: doc } = await supabase
    .from("agency_partner_kyc_documents")
    .select("agency_partner_id")
    .eq("id", docId)
    .single();

  if (doc?.agency_partner_id) {
    revalidatePath(`/admin/agency-partners/${doc.agency_partner_id}`);
  }
}

export async function resetPartnerPasswordAction(userId: string, password: string) {
  await verifyAdmin();
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Database client is offline.");

  if (!userId) throw new Error("Partner user id is required.");
  if (password.length < 8) throw new Error("Password must be at least 8 characters.");

  // Confirm the user belongs to an agency partner before resetting credentials.
  const { data: partner } = await supabase
    .from("agency_partners")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!partner) {
    throw new Error("No agency partner account found for this user.");
  }

  const { error } = await supabase.auth.admin.updateUserById(userId, { password });
  if (error) {
    throw new Error(error.message || "Password could not be updated.");
  }

  revalidatePath(`/admin/agency-partners/${partner.id}`);
  return { message: "Partner password updated successfully." };
}
