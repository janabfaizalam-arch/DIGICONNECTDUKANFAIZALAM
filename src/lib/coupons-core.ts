/**
 * Coupon rules, with no I/O so they can be tested directly.
 *
 * The money-affecting decisions live here: whether a code applies, and what
 * discount it is worth.
 */

export type CouponRules = {
  code: string;
  discountType: "fixed" | "percentage";
  discountValue: number;
  /** "All" or a service slug. */
  applicableService: string;
  minOrderAmount?: number;
  maxDiscount?: number;
  usageLimit?: number;
  perUserUsageLimit?: number;
  startDate?: string;
  expiryDate?: string;
  active: boolean;
  usedCount: number;
};

export type CouponCheck = {
  valid: boolean;
  discountAmount: number;
  message: string;
  /** Stable reason, for logs and for mapping RPC failures back to a message. */
  reason?: CouponFailureReason;
};

export type CouponFailureReason =
  | "coupon_not_found"
  | "coupon_inactive"
  | "coupon_not_started"
  | "coupon_expired"
  | "coupon_min_order"
  | "coupon_wrong_service"
  | "coupon_usage_limit_reached"
  | "coupon_user_limit_reached";

const MESSAGES: Record<CouponFailureReason, string> = {
  coupon_not_found: "This coupon code is not valid.",
  coupon_inactive: "This coupon is no longer active.",
  coupon_not_started: "This coupon is not active yet.",
  coupon_expired: "This coupon has expired.",
  coupon_min_order: "Your order does not meet this coupon's minimum amount.",
  coupon_wrong_service: "This coupon does not apply to the selected service.",
  coupon_usage_limit_reached: "This coupon has reached its usage limit.",
  coupon_user_limit_reached: "You have already used this coupon the maximum number of times.",
};

export function messageForCouponFailure(reason: CouponFailureReason): string {
  return MESSAGES[reason] ?? "This coupon could not be applied.";
}

/** Map a Postgres error raised by redeem_coupon back to a customer message. */
export function reasonFromRedeemError(raw: unknown): CouponFailureReason | null {
  const message = String(
    (raw && typeof raw === "object" && "message" in raw ? (raw as { message?: unknown }).message : raw) ?? "",
  );
  for (const reason of Object.keys(MESSAGES) as CouponFailureReason[]) {
    if (message.includes(reason)) return reason;
  }
  return null;
}

function fail(reason: CouponFailureReason): CouponCheck {
  return { valid: false, discountAmount: 0, message: messageForCouponFailure(reason), reason };
}

/**
 * Work out the discount a coupon is worth for this order.
 *
 * `userUses` is how many times this customer has already redeemed the code.
 * It is checked here for a fast, friendly rejection, but it is NOT the
 * enforcement point — two simultaneous checkouts would both pass. The database
 * re-checks every limit under a row lock when the coupon is actually redeemed.
 */
export function evaluateCoupon(input: {
  coupon: CouponRules | null;
  amount: number;
  serviceSlug?: string | null;
  userUses?: number;
  now?: number;
}): CouponCheck {
  const { coupon, amount } = input;
  const now = input.now ?? Date.now();

  if (!coupon) return fail("coupon_not_found");
  if (!coupon.active) return fail("coupon_inactive");

  if (coupon.startDate) {
    const start = new Date(coupon.startDate).getTime();
    if (!Number.isNaN(start) && start > now) return fail("coupon_not_started");
  }

  if (coupon.expiryDate) {
    const expiry = new Date(coupon.expiryDate).getTime();
    // An unparseable expiry is treated as expired rather than as "no expiry" —
    // failing open here would hand out an unbounded discount.
    if (Number.isNaN(expiry) || expiry < now) return fail("coupon_expired");
  }

  const applicable = String(coupon.applicableService ?? "All").trim();
  if (applicable && applicable.toLowerCase() !== "all") {
    if (!input.serviceSlug || input.serviceSlug !== applicable) return fail("coupon_wrong_service");
  }

  if (coupon.minOrderAmount !== undefined && amount < coupon.minOrderAmount) {
    return {
      ...fail("coupon_min_order"),
      message: `Minimum order amount of ₹${coupon.minOrderAmount} is required.`,
    };
  }

  if (coupon.usageLimit !== undefined && coupon.usedCount >= coupon.usageLimit) {
    return fail("coupon_usage_limit_reached");
  }

  if (
    coupon.perUserUsageLimit !== undefined &&
    input.userUses !== undefined &&
    input.userUses >= coupon.perUserUsageLimit
  ) {
    return fail("coupon_user_limit_reached");
  }

  let discountAmount =
    coupon.discountType === "fixed"
      ? coupon.discountValue
      : Math.round(amount * (coupon.discountValue / 100));

  if (coupon.maxDiscount !== undefined) {
    discountAmount = Math.min(discountAmount, coupon.maxDiscount);
  }

  // Never exceed the order, and never go negative on a malformed value.
  discountAmount = Math.max(0, Math.min(amount, discountAmount));

  return { valid: true, discountAmount, message: "Coupon applied successfully!" };
}
