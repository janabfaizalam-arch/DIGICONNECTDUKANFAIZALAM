import {
  evaluateCoupon,
  messageForCouponFailure,
  reasonFromRedeemError,
  type CouponCheck,
  type CouponRules,
} from "@/lib/coupons-core";
import { getCoupons as getFileCoupons } from "@/lib/coupons";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * Database-backed coupon store.
 *
 * Replaces the JSON file, which could not be written at runtime on Vercel, and
 * which had no way to record that a coupon had actually been used.
 */

const SELECT =
  "code, discount_type, discount_value, applicable_service, min_order_amount, max_discount, usage_limit, per_user_usage_limit, start_date, expiry_date, active, used_count";

type Row = {
  code: string;
  discount_type: "fixed" | "percentage";
  discount_value: number | string;
  applicable_service: string;
  min_order_amount: number | string | null;
  max_discount: number | string | null;
  usage_limit: number | null;
  per_user_usage_limit: number | null;
  start_date: string | null;
  expiry_date: string | null;
  active: boolean;
  used_count: number;
};

function isMissingTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === "42P01" || /does not exist|schema cache/i.test(error.message ?? "");
}

function num(value: number | string | null): number | undefined {
  if (value === null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toRules(row: Row): CouponRules {
  return {
    code: row.code,
    discountType: row.discount_type,
    discountValue: Number(row.discount_value) || 0,
    applicableService: row.applicable_service || "All",
    minOrderAmount: num(row.min_order_amount),
    maxDiscount: num(row.max_discount),
    usageLimit: row.usage_limit ?? undefined,
    perUserUsageLimit: row.per_user_usage_limit ?? undefined,
    startDate: row.start_date ?? undefined,
    expiryDate: row.expiry_date ?? undefined,
    active: Boolean(row.active),
    usedCount: Number(row.used_count) || 0,
  };
}

/**
 * The retired JSON store, consulted only when the coupons table is absent.
 *
 * Without this, deploying ahead of the migration would invalidate every code
 * already in circulation — customers would be told their coupon is not valid.
 */
function fromFileStore(code: string): CouponRules | null {
  const match = getFileCoupons().find((c) => c.code.trim().toUpperCase() === code);
  if (!match) return null;
  return {
    code: match.code,
    discountType: match.discountType,
    discountValue: match.discountValue,
    applicableService: match.applicableService,
    minOrderAmount: match.minOrderAmount,
    maxDiscount: match.maxDiscount,
    usageLimit: match.usageLimit,
    perUserUsageLimit: match.perUserUsageLimit,
    startDate: match.startDate,
    expiryDate: match.expiryDate,
    active: match.active,
    usedCount: match.usedCount ?? 0,
  };
}

export async function getCouponByCode(code: string): Promise<CouponRules | null> {
  const normalized = String(code ?? "").trim().toUpperCase();
  if (!normalized) return null;

  const supabase = getSupabaseAdmin();
  if (!supabase) return fromFileStore(normalized);

  const { data, error } = await supabase.from("coupons").select(SELECT).eq("code", normalized).maybeSingle();

  if (error) {
    if (isMissingTable(error)) return fromFileStore(normalized);
    console.error("[coupons] lookup_failed", { code: error.code, error: error.message });
    return null;
  }

  return data ? toRules(data as Row) : null;
}

export async function listCoupons(): Promise<{ rows: CouponRules[]; tableMissing: boolean }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { rows: [], tableMissing: false };

  const { data, error } = await supabase.from("coupons").select(SELECT).order("created_at", { ascending: false });

  if (error) return { rows: [], tableMissing: isMissingTable(error) };
  return { rows: ((data ?? []) as Row[]).map(toRules), tableMissing: false };
}

/** How many times this customer has already redeemed the code. */
async function countUserRedemptions(code: string, userId: string | null): Promise<number | undefined> {
  if (!userId) return undefined;

  const supabase = getSupabaseAdmin();
  if (!supabase) return undefined;

  const { count, error } = await supabase
    .from("coupon_redemptions")
    .select("id", { count: "exact", head: true })
    .eq("code", code)
    .eq("user_id", userId);

  if (error) {
    console.error("[coupons] user_count_failed", { code: error.code, error: error.message });
    // Unknown usage is treated as none here; the database re-checks the limit
    // under a lock when the coupon is actually redeemed.
    return undefined;
  }

  return count ?? 0;
}

/**
 * Check a coupon for an order. Read-only — nothing is consumed here.
 */
export async function checkCoupon(input: {
  code: string;
  amount: number;
  serviceSlug?: string | null;
  userId?: string | null;
}): Promise<CouponCheck> {
  const normalized = String(input.code ?? "").trim().toUpperCase();
  const coupon = await getCouponByCode(normalized);
  const userUses = coupon ? await countUserRedemptions(normalized, input.userId ?? null) : undefined;

  return evaluateCoupon({
    coupon,
    amount: input.amount,
    serviceSlug: input.serviceSlug ?? null,
    userUses,
  });
}

export type RedeemResult =
  | { ok: true; discountAmount: number }
  | { ok: false; message: string; reason: string };

/**
 * Consume a coupon.
 *
 * All limits are re-checked inside the database under a row lock, so this is
 * the only place a coupon is genuinely spent. Call it once the order exists.
 */
export async function redeemCoupon(input: {
  code: string;
  userId?: string | null;
  applicationId?: string | null;
  orderId?: string | null;
  discountAmount: number;
}): Promise<RedeemResult> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, message: "Service unavailable", reason: "service_unavailable" };

  const normalized = String(input.code ?? "").trim().toUpperCase();
  if (!normalized) return { ok: true, discountAmount: 0 };

  const { data, error } = await supabase.rpc("redeem_coupon", {
    p_code: normalized,
    p_user_id: input.userId ?? null,
    p_application_id: input.applicationId ?? null,
    p_order_id: input.orderId ?? null,
    p_discount_amount: input.discountAmount,
  });

  if (error) {
    const reason = reasonFromRedeemError(error);
    console.warn("[coupons] redeem_failed", { code: normalized, reason, error: error.message });
    return {
      ok: false,
      message: reason ? messageForCouponFailure(reason) : "This coupon could not be applied.",
      reason: reason ?? "redeem_failed",
    };
  }

  return { ok: true, discountAmount: Number(data) || 0 };
}
