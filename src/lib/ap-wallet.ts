// ============================================================================
// Agency Partner Wallet Operations
// DigiConnect Dukan — AP Ecosystem
// Append-only ledger — never mutate old financial records.
// ============================================================================

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { APWalletEntryType } from "@/lib/ap-types";

type WalletResult = {
  ok: boolean;
  entryId?: string;
  newBalance?: number;
  error?: string;
};

function safeNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Get current wallet balance by summing all ledger entries.
 * Credits (commission_credit, manual_credit, bonus, adjustment with positive amount) add.
 * Debits (manual_debit, payout_deduction, penalty, reversal) subtract.
 */
export async function getWalletBalance(agencyPartnerId: string): Promise<number> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return 0;

  const { data, error } = await supabase
    .from("ap_wallet_ledger")
    .select("amount, entry_type")
    .eq("agency_partner_id", agencyPartnerId)
    .order("created_at", { ascending: true });

  if (error || !data) return 0;

  return (data as { amount: number; entry_type: string }[]).reduce((balance, entry) => {
    const amt = safeNumber(entry.amount);
    const creditTypes = ["commission_credit", "manual_credit", "bonus"];
    const debitTypes = ["manual_debit", "payout_deduction", "penalty", "reversal"];

    if (creditTypes.includes(entry.entry_type)) return balance + amt;
    if (debitTypes.includes(entry.entry_type)) return balance - Math.abs(amt);

    // adjustment: use sign of amount
    if (entry.entry_type === "adjustment") return balance + amt;

    return balance;
  }, 0);
}

/**
 * Append a ledger entry. Computes running_balance automatically.
 */
async function appendLedgerEntry(params: {
  agencyPartnerId: string;
  entryType: APWalletEntryType;
  amount: number;
  referenceType?: string | null;
  referenceId?: string | null;
  description?: string | null;
  createdBy?: string | null;
}): Promise<WalletResult> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: "Missing server config" };

  const currentBalance = await getWalletBalance(params.agencyPartnerId);

  const creditTypes = ["commission_credit", "manual_credit", "bonus"];
  const debitTypes = ["manual_debit", "payout_deduction", "penalty", "reversal"];
  const amt = safeNumber(params.amount);

  let newBalance: number;
  if (creditTypes.includes(params.entryType)) {
    newBalance = currentBalance + amt;
  } else if (debitTypes.includes(params.entryType)) {
    newBalance = currentBalance - Math.abs(amt);
  } else {
    // adjustment
    newBalance = currentBalance + amt;
  }

  const { data, error } = await supabase
    .from("ap_wallet_ledger")
    .insert({
      agency_partner_id: params.agencyPartnerId,
      entry_type: params.entryType,
      amount: amt,
      running_balance: newBalance,
      reference_type: params.referenceType ?? null,
      reference_id: params.referenceId ?? null,
      description: params.description ?? null,
      created_by: params.createdBy ?? null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[ap-wallet] Failed to append ledger entry", error);
    return { ok: false, error: error.message };
  }

  return { ok: true, entryId: data.id as string, newBalance };
}

/**
 * Credit commission to AP wallet.
 */
export async function creditCommission(params: {
  agencyPartnerId: string;
  commissionId: string;
  amount: number;
  serviceName?: string;
}): Promise<WalletResult> {
  return appendLedgerEntry({
    agencyPartnerId: params.agencyPartnerId,
    entryType: "commission_credit",
    amount: params.amount,
    referenceType: "commission",
    referenceId: params.commissionId,
    description: `Commission earned${params.serviceName ? ` for ${params.serviceName}` : ""}`,
  });
}

/**
 * Deduct payout from AP wallet.
 */
export async function deductPayout(params: {
  agencyPartnerId: string;
  payoutId: string;
  amount: number;
  createdBy?: string;
}): Promise<WalletResult> {
  return appendLedgerEntry({
    agencyPartnerId: params.agencyPartnerId,
    entryType: "payout_deduction",
    amount: params.amount,
    referenceType: "payout",
    referenceId: params.payoutId,
    description: `Payout deduction`,
    createdBy: params.createdBy,
  });
}

/**
 * Manual credit (admin).
 */
export async function manualCredit(params: {
  agencyPartnerId: string;
  amount: number;
  description: string;
  createdBy: string;
}): Promise<WalletResult> {
  return appendLedgerEntry({
    agencyPartnerId: params.agencyPartnerId,
    entryType: "manual_credit",
    amount: params.amount,
    description: params.description,
    createdBy: params.createdBy,
  });
}

/**
 * Manual debit (admin).
 */
export async function manualDebit(params: {
  agencyPartnerId: string;
  amount: number;
  description: string;
  createdBy: string;
}): Promise<WalletResult> {
  return appendLedgerEntry({
    agencyPartnerId: params.agencyPartnerId,
    entryType: "manual_debit",
    amount: params.amount,
    description: params.description,
    createdBy: params.createdBy,
  });
}

/**
 * Adjustment (admin — can be positive or negative).
 */
export async function walletAdjustment(params: {
  agencyPartnerId: string;
  amount: number;
  description: string;
  createdBy: string;
}): Promise<WalletResult> {
  return appendLedgerEntry({
    agencyPartnerId: params.agencyPartnerId,
    entryType: "adjustment",
    amount: params.amount,
    description: params.description,
    createdBy: params.createdBy,
  });
}

/**
 * Bonus credit (admin).
 */
export async function creditBonus(params: {
  agencyPartnerId: string;
  amount: number;
  description: string;
  createdBy: string;
}): Promise<WalletResult> {
  return appendLedgerEntry({
    agencyPartnerId: params.agencyPartnerId,
    entryType: "bonus",
    amount: params.amount,
    description: params.description,
    createdBy: params.createdBy,
  });
}

/**
 * Penalty debit (admin).
 */
export async function debitPenalty(params: {
  agencyPartnerId: string;
  amount: number;
  description: string;
  createdBy: string;
}): Promise<WalletResult> {
  return appendLedgerEntry({
    agencyPartnerId: params.agencyPartnerId,
    entryType: "penalty",
    amount: params.amount,
    description: params.description,
    createdBy: params.createdBy,
  });
}

/**
 * Reversal (admin).
 */
export async function reverseEntry(params: {
  agencyPartnerId: string;
  amount: number;
  originalEntryId: string;
  description: string;
  createdBy: string;
}): Promise<WalletResult> {
  return appendLedgerEntry({
    agencyPartnerId: params.agencyPartnerId,
    entryType: "reversal",
    amount: params.amount,
    referenceType: "reversal",
    referenceId: params.originalEntryId,
    description: params.description,
    createdBy: params.createdBy,
  });
}

/**
 * Atomic debit and payout creation for AP wallet withdrawals.
 */
export async function debitPayout(params: {
  agencyPartnerId: string;
  amount: number;
  description: string;
  createdBy: string;
}): Promise<{ ok: boolean; payoutId?: string; newBalance?: number; error?: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: "Missing database client" };

  const balance = await getWalletBalance(params.agencyPartnerId);
  if (balance < params.amount) {
    return { ok: false, error: "Insufficient wallet balance." };
  }

  // Get bank details snapshot from agency_partners
  const { data: ap } = await supabase
    .from("agency_partners")
    .select("bank_account_name, bank_account_number, bank_ifsc, bank_name, upi_id")
    .eq("id", params.agencyPartnerId)
    .single();

  const bankSnapshot = ap ? {
    bank_account_name: ap.bank_account_name,
    bank_account_number: ap.bank_account_number,
    bank_ifsc: ap.bank_ifsc,
    bank_name: ap.bank_name,
    upi_id: ap.upi_id
  } : null;

  // Insert payout request
  const { data: payout, error: payoutError } = await supabase
    .from("ap_payouts")
    .insert({
      agency_partner_id: params.agencyPartnerId,
      amount: params.amount,
      status: "requested",
      bank_account_snapshot: bankSnapshot,
      requested_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (payoutError || !payout) {
    return { ok: false, error: "Failed to create payout request: " + payoutError?.message };
  }

  // Deduct payout ledger entry
  const ledgerRes = await deductPayout({
    agencyPartnerId: params.agencyPartnerId,
    payoutId: payout.id as string,
    amount: params.amount,
    createdBy: params.createdBy,
  });

  if (!ledgerRes.ok) {
    // Delete payout if ledger failed
    await supabase.from("ap_payouts").delete().eq("id", payout.id);
    return { ok: false, error: ledgerRes.error || "Failed to log ledger debit transaction" };
  }

  return {
    ok: true,
    payoutId: payout.id as string,
    newBalance: ledgerRes.newBalance,
  };
}

