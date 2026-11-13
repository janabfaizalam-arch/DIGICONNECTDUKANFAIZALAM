import "server-only";

import type { APWalletEntryType } from "@/lib/ap-types";
import { getWalletBalance } from "@/lib/ap-wallet";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * Paying for an application out of the partner's wallet.
 *
 * The partner is the buyer now. They pay the platform's price for the service,
 * the payout lands in their wallet when the work is done, and that wallet pays
 * for the next application before any card does: ITR at ₹100 with a ₹25 payout
 * costs ₹75 at the counter the second time, and nothing once ₹100 has built up.
 *
 * It takes two steps because Razorpay has to be told an amount before checkout
 * opens, and that amount depends on the balance. So the wallet part is debited
 * first -- the ledger entry's own id is the reserve -- and the application is
 * created against that reserve afterwards. Reserving before checkout rather
 * than after is what stops two applications started in two tabs from spending
 * the same rupee twice: the balance is already gone by the time the second one
 * asks.
 *
 * A reserve that no application ever claims is money the partner cannot see or
 * spend, so nothing here is allowed to leave one behind quietly: a new reserve
 * releases the partner's previous unclaimed one first.
 */

const SPEND: APWalletEntryType = "application_spend";

export type WalletSplit = {
  /** The platform's price for the service, in rupees. */
  price: number;
  /** What the wallet will cover. */
  fromWallet: number;
  /** What the partner still has to pay through Razorpay. */
  fromRazorpay: number;
  /** The balance the split was computed against. */
  balance: number;
};

/** A number we are willing to treat as money. Anything else is zero. */
function rupees(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * What the wallet covers of a price, without touching anything.
 *
 * The balance rounds DOWN: ₹24.90 in hand must not buy ₹25 of service. The
 * price rounds to the nearest rupee because that is what the partner is shown
 * and what Razorpay is told, and the two have to agree.
 */
export function splitForPrice(price: number, balance: number): WalletSplit {
  const safePrice = Math.max(0, Math.round(rupees(price)));
  const safeBalance = Math.max(0, Math.floor(rupees(balance)));
  const fromWallet = Math.min(safeBalance, safePrice);
  return {
    price: safePrice,
    fromWallet,
    fromRazorpay: safePrice - fromWallet,
    balance: safeBalance,
  };
}

export async function previewSplit(agencyPartnerId: string, price: number): Promise<WalletSplit> {
  const balance = await getWalletBalance(agencyPartnerId);
  return splitForPrice(price, balance);
}

/* ─────────────────────────────────────────────────────────────────────────
   Reserving
   ───────────────────────────────────────────────────────────────────────── */

export type Reserve =
  | { ok: true; split: WalletSplit; reserveId: string | null }
  | { ok: false; error: string };

/**
 * An `application_spend` entry this partner has not spent on an application.
 *
 * There is at most one, because `reserveWalletForApplication` releases the
 * previous one before making another.
 */
async function findUnclaimedReserve(
  agencyPartnerId: string,
): Promise<{ id: string; amount: number } | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data: entries } = await supabase
    .from("ap_wallet_ledger")
    .select("id, amount")
    .eq("agency_partner_id", agencyPartnerId)
    .eq("entry_type", SPEND)
    .order("created_at", { ascending: false })
    .limit(20);

  for (const entry of entries ?? []) {
    const id = String(entry.id);
    const { data: claimed } = await supabase
      .from("applications")
      .select("id")
      .eq("wallet_reserve_id", id)
      .maybeSingle();
    if (!claimed) return { id, amount: Number(entry.amount) || 0 };
  }

  return null;
}

/**
 * Give an unclaimed reserve back.
 *
 * A `reversal` keyed on the reserve, so running this twice cannot credit the
 * partner twice -- `reverseEntry` already dedupes on the entry it reverses.
 */
export async function releaseReserve(
  agencyPartnerId: string,
  reserveId: string,
  amount: number,
  reason: string,
): Promise<boolean> {
  const { reverseEntry } = await import("@/lib/ap-wallet");
  const result = await reverseEntry({
    agencyPartnerId,
    amount,
    originalEntryId: reserveId,
    description: reason,
    createdBy: "wallet-application-payment",
  });

  if (!result.ok) {
    console.error("[wallet-application] release_failed", { reserveId, error: result.error });
  }
  return result.ok;
}

/**
 * Hold the wallet's share of a price and return the reserve.
 *
 * `reserveId` is null when the wallet covers nothing -- an empty wallet is not
 * an error, it just means the partner pays the whole price at the counter.
 */
export async function reserveWalletForApplication(params: {
  agencyPartnerId: string;
  price: number;
  serviceName?: string | null;
}): Promise<Reserve> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: "Wallet is unavailable right now." };

  /*
    Any reserve from a form the partner filled and abandoned goes back first.
    Otherwise starting a second application would find the balance short by an
    amount that is not spent and not visible.
  */
  const stale = await findUnclaimedReserve(params.agencyPartnerId);
  if (stale) {
    const released = await releaseReserve(
      params.agencyPartnerId,
      stale.id,
      stale.amount,
      "Pichhli application poori nahi hui — amount wapas wallet mein",
    );
    if (!released) {
      return { ok: false, error: "Pichhla wallet hold release nahi hua. Thodi der baad try kijiye." };
    }
  }

  const split = await previewSplit(params.agencyPartnerId, params.price);

  if (split.fromWallet <= 0) {
    return { ok: true, split, reserveId: null };
  }

  const balanceBefore = split.balance;
  const { data, error } = await supabase
    .from("ap_wallet_ledger")
    .insert({
      agency_partner_id: params.agencyPartnerId,
      entry_type: SPEND,
      amount: split.fromWallet,
      running_balance: balanceBefore - split.fromWallet,
      reference_type: "application_payment",
      description: params.serviceName ? `Service liya — ${params.serviceName}` : "Service liya",
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    console.error("[wallet-application] reserve_failed", { error: error?.message });
    return { ok: false, error: "Wallet se amount nahi kat paya. Dobara try kijiye." };
  }

  return { ok: true, split, reserveId: String(data.id) };
}

/* ─────────────────────────────────────────────────────────────────────────
   Claiming
   ───────────────────────────────────────────────────────────────────────── */

export type ClaimCheck =
  | { ok: true; fromWallet: number }
  | { ok: false; error: string };

/**
 * Whether a reserve may be spent on the application now being created.
 *
 * Checked against the ledger rather than against whatever the browser sent,
 * because the browser is the one party here with a reason to overstate what
 * the wallet paid.
 */
export async function checkReserve(params: {
  agencyPartnerId: string;
  reserveId: string;
}): Promise<ClaimCheck> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: "Wallet is unavailable right now." };

  const { data: entry } = await supabase
    .from("ap_wallet_ledger")
    .select("id, agency_partner_id, entry_type, amount")
    .eq("id", params.reserveId)
    .maybeSingle();

  if (!entry) return { ok: false, error: "Wallet hold nahi mila. Form dobara bhariye." };
  if (String(entry.agency_partner_id) !== params.agencyPartnerId) {
    // Somebody else's reserve. Say nothing about whose.
    return { ok: false, error: "Wallet hold nahi mila. Form dobara bhariye." };
  }
  if (String(entry.entry_type) !== SPEND) {
    return { ok: false, error: "Wallet hold theek nahi hai. Form dobara bhariye." };
  }

  const { data: claimed } = await supabase
    .from("applications")
    .select("id")
    .eq("wallet_reserve_id", params.reserveId)
    .maybeSingle();

  if (claimed) {
    return { ok: false, error: "Ye wallet hold pehle hi ek application mein lag chuka hai." };
  }

  return { ok: true, fromWallet: Number(entry.amount) || 0 };
}
