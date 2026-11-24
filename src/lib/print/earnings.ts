/**
 * How a Digi Print payment is split between the shop and the platform.
 *
 * The customer pays the whole price into the platform's Razorpay account. The
 * partner's wallet is credited with the price minus the platform fee, and
 * that wallet balance is what they spend on the platform's other services or
 * withdraw.
 *
 * Pure and dependency-free so it can be tested without a database.
 */

export const MAX_PLATFORM_FEE_PERCENT = 50;

/**
 * The fee percent that applies to a station.
 *
 * The station's own value wins (an admin can set a shop's deal); otherwise the
 * platform default from PRINT_PLATFORM_FEE_PERCENT; otherwise zero — the shop
 * keeps everything. Anything unparseable or out of range falls through rather
 * than charging a shop something nobody chose.
 */
export function effectiveFeePercent(
  stationPercent: number | null | undefined,
  envValue: string | undefined = process.env.PRINT_PLATFORM_FEE_PERCENT,
): number {
  const valid = (value: unknown) => {
    if (value === null || value === undefined || value === "") return null;
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 && n <= MAX_PLATFORM_FEE_PERCENT ? n : null;
  };
  return valid(stationPercent) ?? valid(envValue) ?? 0;
}

/** Rupees to the partner and to the platform, rounded to paise, summing to the price. */
export function splitPrintEarning(price: number, feePercent: number): { partner: number; platform: number } {
  const pricePaise = Math.max(0, Math.round(Number(price) * 100));
  const fee = Math.min(MAX_PLATFORM_FEE_PERCENT, Math.max(0, Number(feePercent) || 0));
  const platformPaise = Math.round((pricePaise * fee) / 100);
  return { partner: (pricePaise - platformPaise) / 100, platform: platformPaise / 100 };
}
