/**
 * Payment totals for the admin surface.
 *
 * One implementation, deliberately. These four numbers were already computed
 * correctly for the dashboard — via the `admin_dashboard_payment_totals` RPC,
 * with a paginated fallback — while `/admin/payments` computed its own from
 * the last 300 rows it happened to be displaying and labelled the result
 * "Verified Payments" and "Verified Amount". Two implementations of one
 * business figure is how they come to disagree.
 *
 * The RPC is preferred because PostgreSQL does the aggregation: nothing
 * crosses the wire that `db.max_rows` could truncate. The fallback exists
 * because the RPC is `security definer` and granted to `service_role` only, so
 * an environment whose migrations have not been applied would otherwise show
 * zero rather than a slower but correct number.
 */

import { countRows, sumPages, toAmount } from "@/lib/supabase/paged-read";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type PaymentTotals = {
  /** Rupees actually collected — `real_payment_amount`, falling back to `amount`. */
  verifiedSum: number;
  verifiedCount: number;
  pendingCount: number;
  failedCount: number;
};

export const EMPTY_PAYMENT_TOTALS: PaymentTotals = {
  verifiedSum: 0,
  verifiedCount: 0,
  pendingCount: 0,
  failedCount: 0,
};

/**
 * Status spellings, matching the RPC's `lower(coalesce(status::text, ''))`.
 *
 * Both spellings of "cancelled" are listed because both appear in the data.
 */
export const VERIFIED_STATUSES = ["verified", "paid"] as const;
export const PENDING_STATUSES = ["pending", "unpaid"] as const;
export const FAILED_STATUSES = ["failed", "cancelled", "canceled"] as const;

type Range = { fromIso?: string | null; toIso?: string | null };

/**
 * The four payment figures over an optional date range.
 *
 * The range is half-open — `>= from`, `< to` — so a payment at 23:59:59.999 is
 * neither counted twice nor dropped between two adjacent periods. This matches
 * the RPC's own comparison exactly.
 */
export async function getPaymentTotals({ fromIso = null, toIso = null }: Range = {}): Promise<PaymentTotals> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ...EMPTY_PAYMENT_TOTALS };

  const { data, error } = await supabase.rpc("admin_dashboard_payment_totals", {
    p_from: fromIso,
    p_to: toIso,
  });

  if (!error && data) {
    const row = data as Record<string, unknown>;
    return {
      verifiedSum: toAmount(row.verified_sum_rupees),
      verifiedCount: toAmount(row.verified_count),
      pendingCount: toAmount(row.pending_count),
      failedCount: toAmount(row.failed_count),
    };
  }

  if (error) {
    console.warn("[payment-totals] RPC unavailable; falling back to paginated read", error.message);
  }

  // Reassignment preserves the builder's type through the optional filters,
  // so `.range()` below still typechecks.
  const amountsFor = (statuses: readonly string[]) => {
    let query = supabase
      .from("payments")
      .select("real_payment_amount, amount")
      .in("status", [...statuses]);
    if (fromIso) query = query.gte("created_at", fromIso);
    if (toIso) query = query.lt("created_at", toIso);
    return query;
  };

  const countFor = (statuses: readonly string[]) => {
    let query = supabase
      .from("payments")
      .select("id", { count: "exact", head: true })
      .in("status", [...statuses]);
    if (fromIso) query = query.gte("created_at", fromIso);
    if (toIso) query = query.lt("created_at", toIso);
    return query;
  };

  const [verified, verifiedCount, pendingCount, failedCount] = await Promise.all([
    sumPages(
      (from, to) => amountsFor(VERIFIED_STATUSES).range(from, to),
      (row: { real_payment_amount?: unknown; amount?: unknown }) =>
        toAmount(row.real_payment_amount ?? row.amount),
      { label: "payments.verifiedSum" },
    ),
    countRows(() => countFor(VERIFIED_STATUSES), "payments.verifiedCount"),
    countRows(() => countFor(PENDING_STATUSES), "payments.pendingCount"),
    countRows(() => countFor(FAILED_STATUSES), "payments.failedCount"),
  ]);

  return {
    verifiedSum: verified.total,
    verifiedCount: verifiedCount.count,
    pendingCount: pendingCount.count,
    failedCount: failedCount.count,
  };
}
