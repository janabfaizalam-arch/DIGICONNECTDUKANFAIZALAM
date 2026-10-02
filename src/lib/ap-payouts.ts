import { reverseEntry } from "@/lib/ap-wallet";
import { checkTransition, refundsWallet, type PayoutStatus } from "@/lib/ap-payout-transitions";
import {
  EMPTY_PAYOUT_SUMMARY,
  SUMMARISED_PAYOUT_STATUSES,
  summarisePayouts,
  type PayoutSummary,
  type PayoutSummaryRow,
} from "@/lib/ap/payout-summary";
import { readPages } from "@/lib/supabase/paged-read";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type AdminPayoutRow = {
  id: string;
  agencyPartnerId: string;
  partnerName: string;
  partnerCode: string | null;
  amount: number;
  status: string;
  paymentReference: string | null;
  bankSnapshot: Record<string, unknown> | null;
  requestedAt: string | null;
  paidAt: string | null;
  notes: string | null;
};

const SELECT =
  "id, agency_partner_id, amount, status, payment_reference, bank_account_snapshot, requested_at, paid_at, notes";

/** Payout requests for the admin queue, newest first. */
export async function listPayoutsForAdmin(status?: string): Promise<{
  rows: AdminPayoutRow[];
  summary: PayoutSummary;
  /**
   * False when the summary could not be read in full. The figures are money,
   * so a caller that cares can say "unavailable" rather than show a number
   * that is quietly too small.
   */
  summaryComplete: boolean;
}> {
  const empty = { rows: [], summary: { ...EMPTY_PAYOUT_SUMMARY }, summaryComplete: false };

  const supabase = getSupabaseAdmin();
  if (!supabase) return empty;

  let query = supabase.from("ap_payouts").select(SELECT).order("requested_at", { ascending: false }).limit(200);
  if (status && status !== "all") query = query.eq("status", status);

  const { data, error } = await query;
  if (error) {
    console.error("[ap-payouts] list_failed", { code: error.code, error: error.message });
    return empty;
  }

  const rows = data ?? [];
  const partnerIds = [...new Set(rows.map((row) => String(row.agency_partner_id)))];

  const partners = new Map<string, { name: string; code: string | null }>();
  if (partnerIds.length) {
    const { data: partnerRows } = await supabase
      .from("agency_partners")
      .select("id, full_name, partner_code")
      .in("id", partnerIds);
    for (const p of partnerRows ?? []) {
      partners.set(String(p.id), {
        name: String(p.full_name ?? "Unknown partner"),
        code: (p.partner_code as string | null) ?? null,
      });
    }
  }

  // Totals are computed over every payout, not the filtered view — a queue that
  // only counts what is on screen is misleading.
  //
  // This used to be a single unbounded `select("amount, status")`, which
  // PostgREST truncates at `db.max_rows` (1000 by default) and returns without
  // an error. The comment above has always claimed "every payout"; past a
  // thousand of them it was not true, and `requestedAmount` and `paidAmount`
  // were understated with nothing to show for it. Paging makes the claim hold.
  //
  // Narrowed to the three statuses the summary actually reads, so `rejected`
  // payouts — which belong in neither total — are not transferred at all.
  const { rows: summaryRows, complete: summaryComplete } = await readPages<PayoutSummaryRow>(
    (from, to) =>
      supabase
        .from("ap_payouts")
        .select("amount, status")
        .in("status", [...SUMMARISED_PAYOUT_STATUSES])
        .range(from, to),
    { label: "ap_payouts.summary" },
  );

  const summary = summarisePayouts(summaryRows);

  return {
    rows: rows.map((row) => {
      const partner = partners.get(String(row.agency_partner_id));
      return {
        id: String(row.id),
        agencyPartnerId: String(row.agency_partner_id),
        partnerName: partner?.name ?? "Unknown partner",
        partnerCode: partner?.code ?? null,
        amount: Number(row.amount) || 0,
        status: String(row.status ?? "requested"),
        paymentReference: (row.payment_reference as string | null) ?? null,
        bankSnapshot: (row.bank_account_snapshot as Record<string, unknown> | null) ?? null,
        requestedAt: (row.requested_at as string | null) ?? null,
        paidAt: (row.paid_at as string | null) ?? null,
        notes: (row.notes as string | null) ?? null,
      };
    }),
    summary,
    summaryComplete,
  };
}

export type ProcessResult =
  | { ok: true; status: PayoutStatus; refunded: boolean }
  | { ok: false; error: string; status?: number };

/**
 * Move a payout to its next status.
 *
 * The status write is conditioned on the status we read, so two admins acting
 * at once cannot both pay the same payout — the second update matches no row.
 * A rejection credits the amount back first: if the refund fails we stop,
 * because marking it rejected without returning the money loses it.
 */
export async function processPayout(input: {
  payoutId: string;
  to: PayoutStatus;
  paymentReference?: string | null;
  notes?: string | null;
  adminId: string;
}): Promise<ProcessResult> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: "Service unavailable", status: 503 };

  const { data: payout, error } = await supabase
    .from("ap_payouts")
    .select("id, agency_partner_id, amount, status")
    .eq("id", input.payoutId)
    .maybeSingle();

  if (error) {
    console.error("[ap-payouts] load_failed", { code: error.code, error: error.message });
    return { ok: false, error: "Could not load this payout.", status: 500 };
  }
  if (!payout) return { ok: false, error: "Payout not found.", status: 404 };

  const from = String(payout.status ?? "");
  const check = checkTransition({ from, to: input.to, paymentReference: input.paymentReference });
  if (!check.ok) return { ok: false, error: check.error, status: 409 };

  const amount = Number(payout.amount) || 0;
  let refunded = false;

  if (refundsWallet(input.to)) {
    const refund = await reverseEntry({
      agencyPartnerId: String(payout.agency_partner_id),
      amount,
      originalEntryId: String(payout.id),
      description: `Payout rejected — amount returned to wallet`,
      createdBy: input.adminId,
    });

    if (!refund.ok) {
      console.error("[ap-payouts] refund_failed", { payoutId: input.payoutId, error: refund.error });
      return {
        ok: false,
        error: "The wallet refund failed, so the payout was left unchanged. Try again.",
        status: 500,
      };
    }
    refunded = true;
  }

  const patch: Record<string, unknown> = {
    status: input.to,
    processed_by: input.adminId,
    processed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (input.paymentReference) patch.payment_reference = input.paymentReference.trim();
  if (input.notes) patch.notes = input.notes.trim();
  if (input.to === "paid") patch.paid_at = new Date().toISOString();

  const { data: updated, error: updateError } = await supabase
    .from("ap_payouts")
    .update(patch)
    .eq("id", input.payoutId)
    // Guards against two admins acting at the same time.
    .eq("status", from)
    .select("id")
    .maybeSingle();

  if (updateError) {
    console.error("[ap-payouts] update_failed", { code: updateError.code, error: updateError.message });
    return { ok: false, error: "Could not update this payout.", status: 500 };
  }
  if (!updated) {
    return { ok: false, error: "This payout was changed by someone else. Reload and try again.", status: 409 };
  }

  console.info("[ap-payouts] transitioned", {
    payoutId: input.payoutId,
    from,
    to: input.to,
    refunded,
    adminId: input.adminId,
  });

  return { ok: true, status: input.to, refunded };
}
