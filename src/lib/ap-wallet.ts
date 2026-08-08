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

const CREDIT_TYPES = ["commission_credit", "manual_credit", "bonus"];
const DEBIT_TYPES = ["manual_debit", "payout_deduction", "penalty", "reversal"];

/** Ledger rows fetched per request. PostgREST caps a single response, so the
 *  balance has to be paged — a one-shot select silently truncates a busy
 *  partner's ledger and understates their balance. */
const LEDGER_PAGE_SIZE = 1000;

export function applyLedgerEntry(balance: number, entry: { amount: unknown; entry_type: string }): number {
  const amt = safeNumber(entry.amount);
  if (CREDIT_TYPES.includes(entry.entry_type)) return balance + amt;
  if (DEBIT_TYPES.includes(entry.entry_type)) return balance - Math.abs(amt);
  // adjustment: use sign of amount
  if (entry.entry_type === "adjustment") return balance + amt;
  return balance;
}

/**
 * Canonical wallet balance — the single source of truth for every AP balance
 * read. Pages through the whole ledger and reports failure explicitly, so a
 * caller can never mistake "query failed" for "zero balance".
 */
export async function calculateWalletBalance(
  agencyPartnerId: string,
): Promise<{ ok: true; balance: number; entries: number } | { ok: false; error: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: "Missing server config" };

  let balance = 0;
  let entries = 0;

  for (let page = 0; ; page += 1) {
    const from = page * LEDGER_PAGE_SIZE;
    const { data, error } = await supabase
      .from("ap_wallet_ledger")
      .select("amount, entry_type")
      .eq("agency_partner_id", agencyPartnerId)
      .order("created_at", { ascending: true })
      .range(from, from + LEDGER_PAGE_SIZE - 1);

    if (error) {
      console.error("[ap-wallet] balance_read_failed", { agencyPartnerId, error: error.message });
      return { ok: false, error: error.message };
    }

    const rows = (data ?? []) as { amount: number; entry_type: string }[];
    for (const row of rows) {
      balance = applyLedgerEntry(balance, row);
    }
    entries += rows.length;

    if (rows.length < LEDGER_PAGE_SIZE) break;
  }

  return { ok: true, balance, entries };
}

/**
 * Get current wallet balance by summing all ledger entries.
 * Credits (commission_credit, manual_credit, bonus, adjustment with positive amount) add.
 * Debits (manual_debit, payout_deduction, penalty, reversal) subtract.
 *
 * Returns 0 when the ledger cannot be read — safe for display, but never use
 * this for a spend decision; use `calculateWalletBalance` and check `ok`.
 */
export async function getWalletBalance(agencyPartnerId: string): Promise<number> {
  const result = await calculateWalletBalance(agencyPartnerId);
  return result.ok ? result.balance : 0;
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

  // running_balance is an audit column — writing it from a failed balance read
  // would silently corrupt the ledger's history, so refuse to append instead.
  const current = await calculateWalletBalance(params.agencyPartnerId);
  if (!current.ok) {
    return { ok: false, error: `Could not read wallet balance: ${current.error}` };
  }

  const amt = safeNumber(params.amount);
  const newBalance = applyLedgerEntry(current.balance, { amount: amt, entry_type: params.entryType });

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
 * Look up an existing ledger entry for a reference, so money operations can be
 * retried without paying twice.
 */
async function findLedgerEntryByReference(
  agencyPartnerId: string,
  referenceType: string,
  referenceId: string,
  entryType: APWalletEntryType,
): Promise<{ id: string } | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("ap_wallet_ledger")
    .select("id")
    .eq("agency_partner_id", agencyPartnerId)
    .eq("reference_type", referenceType)
    .eq("reference_id", referenceId)
    .eq("entry_type", entryType)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[ap-wallet] reference_lookup_failed", { referenceId, error: error.message });
    return null;
  }
  return data ? { id: String(data.id) } : null;
}

/**
 * Credit commission to AP wallet — idempotent per commission.
 *
 * A retried approval must not pay the partner twice, so an existing
 * commission_credit for the same commission short-circuits.
 */
export async function creditCommission(params: {
  agencyPartnerId: string;
  commissionId: string;
  amount: number;
  serviceName?: string;
}): Promise<WalletResult & { deduped?: boolean }> {
  const existing = await findLedgerEntryByReference(
    params.agencyPartnerId,
    "commission",
    params.commissionId,
    "commission_credit",
  );

  if (existing) {
    return { ok: true, entryId: existing.id, deduped: true };
  }

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
 * Claw a credited commission back out of the wallet — idempotent per commission.
 * Used when an already-approved commission is cancelled or reversed; without it
 * the money stays spendable after the commission is revoked.
 */
export async function reverseCommissionCredit(params: {
  agencyPartnerId: string;
  commissionId: string;
  amount: number;
  createdBy?: string | null;
  reason?: string | null;
}): Promise<WalletResult & { deduped?: boolean }> {
  const credited = await findLedgerEntryByReference(
    params.agencyPartnerId,
    "commission",
    params.commissionId,
    "commission_credit",
  );

  // Nothing was ever credited — nothing to claw back.
  if (!credited) return { ok: true, deduped: true };

  const alreadyReversed = await findLedgerEntryByReference(
    params.agencyPartnerId,
    "commission_reversal",
    params.commissionId,
    "reversal",
  );

  if (alreadyReversed) return { ok: true, entryId: alreadyReversed.id, deduped: true };

  return appendLedgerEntry({
    agencyPartnerId: params.agencyPartnerId,
    entryType: "reversal",
    amount: params.amount,
    referenceType: "commission_reversal",
    referenceId: params.commissionId,
    description: params.reason?.trim() || "Commission reversed",
    createdBy: params.createdBy ?? null,
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

  const amount = safeNumber(params.amount, NaN);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "Payout amount must be greater than zero." };
  }

  // A failed balance read must never be treated as a zero balance here — it has
  // to block the withdrawal, not silently reject or approve it on bad data.
  const current = await calculateWalletBalance(params.agencyPartnerId);
  if (!current.ok) {
    return { ok: false, error: "Could not verify wallet balance. Please try again." };
  }
  if (current.balance < amount) {
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

  // Insert payout request. A partial unique index on
  // ap_payouts(agency_partner_id) WHERE status IN ('requested','processing')
  // makes "one active payout per partner" a database guarantee — without it two
  // concurrent requests both pass the balance check and both withdraw.
  const { data: payout, error: payoutError } = await supabase
    .from("ap_payouts")
    .insert({
      agency_partner_id: params.agencyPartnerId,
      amount,
      status: "requested",
      bank_account_snapshot: bankSnapshot,
      requested_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (payoutError || !payout) {
    if (payoutError?.code === "23505" || /duplicate key|unique constraint/i.test(payoutError?.message ?? "")) {
      return { ok: false, error: "You already have an active payout request under process." };
    }
    return { ok: false, error: "Failed to create payout request: " + payoutError?.message };
  }

  // Deduct payout ledger entry
  const ledgerRes = await deductPayout({
    agencyPartnerId: params.agencyPartnerId,
    payoutId: payout.id as string,
    amount,
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

