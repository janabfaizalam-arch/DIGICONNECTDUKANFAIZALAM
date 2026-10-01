import "server-only";

import {
  PayoutError,
  bankFingerprint,
  createContact,
  createFundAccount,
  createPayout,
  readRazorpayXConfig,
  redactPayoutSecrets,
  resolvePayoutMode,
  validateBankDetails,
  type BankDetails,
} from "@/lib/payouts/razorpayx";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * Turning one approved withdrawal into money leaving the account.
 *
 * The wallet has already been debited by the time anything here runs -- that
 * happens in `debitPayout`, inside the same step that creates the payout row --
 * so this never decides whether the partner can afford it. Its whole job is to
 * get the request to RazorpayX and record what came back.
 *
 * It never refunds. A payout that fails is refunded by the webhook, in one
 * place, so a failure seen twice cannot pay the partner back twice.
 */

export type DispatchResult =
  | { ok: true; dispatched: false; reason: "manual_mode" | "not_configured" }
  | { ok: true; dispatched: true; payoutId: string; razorpayStatus: string }
  | { ok: false; error: string; retryable: boolean };

type PartnerRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  mobile: string | null;
  bank_account_number: string | null;
  bank_ifsc: string | null;
  bank_name: string | null;
  upi_id: string | null;
  razorpayx_contact_id: string | null;
  razorpayx_fund_account_id: string | null;
  razorpayx_fund_account_fingerprint: string | null;
};

const PARTNER_COLUMNS =
  "id, full_name, email, mobile, bank_account_number, bank_ifsc, bank_name, upi_id, " +
  "razorpayx_contact_id, razorpayx_fund_account_id, razorpayx_fund_account_fingerprint";

function bankOf(partner: PartnerRow): BankDetails {
  return {
    accountHolderName: partner.full_name ?? "",
    accountNumber: partner.bank_account_number,
    ifsc: partner.bank_ifsc,
    upiId: partner.upi_id,
  };
}

/**
 * Whether this partner can be paid automatically at all.
 *
 * Worth asking before a partner presses withdraw rather than after: being told
 * "your IFSC is wrong" while the money is already held is a far worse moment
 * than being told it on the profile screen.
 */
export function canDispatchAutomatically(partner: {
  bank_account_number?: string | null;
  bank_ifsc?: string | null;
  upi_id?: string | null;
  full_name?: string | null;
}): { ok: true } | { ok: false; error: string } {
  if (resolvePayoutMode() !== "auto") return { ok: false, error: "Automatic payouts are off." };
  if (!readRazorpayXConfig()) return { ok: false, error: "RazorpayX is not configured." };
  return validateBankDetails({
    accountHolderName: partner.full_name ?? "",
    accountNumber: partner.bank_account_number ?? null,
    ifsc: partner.bank_ifsc ?? null,
    upiId: partner.upi_id ?? null,
  });
}

/**
 * Make sure this partner has a fund account at Razorpay, and return its id.
 *
 * A fund account at Razorpay cannot be edited, so the fingerprint of the bank
 * details it was built from is stored beside it. When the partner changes
 * their account number the fingerprint stops matching and a new fund account
 * is created -- without that, every later payout would keep going to the
 * account they moved away from.
 */
async function ensureFundAccount(partner: PartnerRow): Promise<{ fundAccountId: string; useUpi: boolean }> {
  const config = readRazorpayXConfig();
  if (!config) throw new PayoutError("not_configured", "RazorpayX is not configured.");

  const supabase = getSupabaseAdmin();
  if (!supabase) throw new PayoutError("upstream", "Database unavailable.", true);

  const bank = bankOf(partner);
  const valid = validateBankDetails(bank);
  if (!valid.ok) throw new PayoutError("invalid_account", valid.error);

  const useUpi = Boolean((bank.upiId ?? "").trim());
  const fingerprint = bankFingerprint(bank);

  if (partner.razorpayx_fund_account_id && partner.razorpayx_fund_account_fingerprint === fingerprint) {
    return { fundAccountId: partner.razorpayx_fund_account_id, useUpi };
  }

  let contactId = partner.razorpayx_contact_id;
  if (!contactId) {
    const contact = await createContact(config, {
      name: (partner.full_name ?? "DC Partner").slice(0, 50),
      referenceId: partner.id,
      email: partner.email,
      contact: partner.mobile,
    });
    contactId = contact.id;
  }

  const fundAccount = await createFundAccount(config, { contactId, bank });

  await supabase
    .from("agency_partners")
    .update({
      razorpayx_contact_id: contactId,
      razorpayx_fund_account_id: fundAccount.id,
      razorpayx_fund_account_fingerprint: fingerprint,
      updated_at: new Date().toISOString(),
    })
    .eq("id", partner.id);

  return { fundAccountId: fundAccount.id, useUpi };
}

/**
 * Send an already-created payout request to RazorpayX.
 *
 * `payoutId` is our own row, and it doubles as the idempotency key: a retry
 * after a timeout returns the payout Razorpay already made rather than making
 * a second one.
 */
export async function dispatchPayout(input: {
  payoutId: string;
  agencyPartnerId: string;
  amount: number;
}): Promise<DispatchResult> {
  if (resolvePayoutMode() !== "auto") return { ok: true, dispatched: false, reason: "manual_mode" };

  const config = readRazorpayXConfig();
  if (!config) return { ok: true, dispatched: false, reason: "not_configured" };

  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: "Database unavailable.", retryable: true };

  const { data: partnerRow } = await supabase
    .from("agency_partners")
    .select(PARTNER_COLUMNS)
    .eq("id", input.agencyPartnerId)
    .maybeSingle();

  if (!partnerRow) return { ok: false, error: "Partner not found.", retryable: false };
  /* The generated client types predate the `razorpayx_*` columns that
     20261001090000 adds, so the typed select cannot narrow this on its own. */
  const partner = partnerRow as unknown as PartnerRow;

  try {
    const { fundAccountId, useUpi } = await ensureFundAccount(partner);

    const payout = await createPayout(config, {
      fundAccountId,
      amountRupees: input.amount,
      idempotencyKey: input.payoutId,
      referenceId: input.payoutId,
      narration: "DigiConnect payout",
      useUpi,
    });

    await supabase
      .from("ap_payouts")
      .update({
        razorpayx_payout_id: payout.id,
        razorpayx_status: payout.status,
        status: "processing",
        payment_method: useUpi ? "upi" : "bank_transfer",
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.payoutId);

    return { ok: true, dispatched: true, payoutId: payout.id, razorpayStatus: payout.status };
  } catch (caught) {
    const error = caught instanceof PayoutError ? caught : new PayoutError("upstream", String(caught), true);

    console.error("[ap-payout-dispatch] failed", {
      payoutId: input.payoutId,
      failure: error.failure,
      retryable: error.retryable,
      error: redactPayoutSecrets(error.message),
    });

    /*
      The row is annotated but deliberately left where it is: the money is
      still held, and the admin queue is where a stuck payout should surface.
      Refunding here would race the webhook for a payout that may yet have been
      accepted -- a timeout tells us nothing about whether Razorpay took it.
    */
    await supabase
      .from("ap_payouts")
      .update({
        failure_reason: redactPayoutSecrets(error.message).slice(0, 500),
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.payoutId);

    return { ok: false, error: error.message, retryable: error.retryable };
  }
}
