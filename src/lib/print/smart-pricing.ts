/**
 * What a Smart Print job costs, and why.
 *
 * One function, used in two places that must never disagree: the sticky bar
 * the customer watches change as they tap, and the server that creates the
 * order. The client's figure is only ever a display of this; the server
 * recomputes it and refuses a mismatch, because the price a browser sends is
 * a number a browser can edit.
 *
 * Everything is built from the shop's own four rates. A partner who has set
 * A4 colour at ₹10 has already told us what colour costs them; glossy paper
 * and premium quality are multipliers on that rather than a second rate card
 * nobody remembers to keep up to date.
 */

import type { PrintRates } from "@/lib/print/stations";
import { PAPER_SIZES } from "@/lib/print/sheet-layout";
import type { PaperFinish, PrintQuality, SmartPrintSettings } from "@/lib/print/smart-print";

export type PriceLine = { label: string; detail?: string; amount: number };

export type PriceQuote = {
  /** Sheets of paper this job puts through the printer. */
  sheets: number;
  /** What one sheet costs before copies. */
  perSheet: number;
  total: number;
  lines: PriceLine[];
};

/**
 * Photo paper and better ink cost the shop more, so they cost the customer
 * more. Kept here, in one small table, rather than as four more numbers in
 * every partner's settings screen.
 */
export const FINISH_MULTIPLIER: Record<PaperFinish, number> = {
  normal: 1,
  glossy: 2.5,
  matte: 2.2,
};

export const QUALITY_MULTIPLIER: Record<PrintQuality, number> = {
  standard: 1,
  high: 1.4,
  premium: 1.8,
};

/** A3 costs about twice an A4; the small sizes are not cheaper to run. */
const PAPER_MULTIPLIER: Record<string, number> = {
  A4: 1,
  A5: 1,
  A3: 1,
  Legal: 1.15,
  Letter: 1,
  "4x6": 0.6,
  "5x7": 0.8,
  "6x8": 1,
  "8x10": 1.3,
};

/** Rounded to the rupee, because a print counter does not hand out paise. */
function rupees(value: number): number {
  return Math.max(1, Math.round(value));
}

/**
 * The base rate for a sheet: the shop's own price for that paper and colour.
 *
 * A3 has its own rate. Everything else is priced off A4, which is the rate a
 * partner actually thinks in.
 */
export function baseRate(rates: PrintRates, settings: SmartPrintSettings): number {
  const isA3 = settings.paper === "A3";
  const colour = settings.color === "color";

  const base = isA3
    ? colour
      ? rates.a3_color
      : rates.a3_mono
    : colour
      ? rates.a4_color
      : rates.a4_mono;

  return base * (PAPER_MULTIPLIER[settings.paper] ?? 1);
}

/**
 * The whole quote, itemised.
 *
 * `sheets` comes from the layout — it is the one number this cannot work out
 * for itself, because how many passport photos fit on an A4 is geometry, not
 * pricing. Passing it in keeps the two apart and keeps both testable.
 */
export function quote(
  rates: PrintRates,
  settings: SmartPrintSettings,
  sheets: number,
): PriceQuote {
  const paper = PAPER_SIZES[settings.paper] ?? PAPER_SIZES.A4;
  const copies = Math.max(1, Math.floor(settings.copies || 1));
  const sheetCount = Math.max(1, Math.floor(sheets || 1));

  const base = baseRate(rates, settings);
  const finish = FINISH_MULTIPLIER[settings.finish] ?? 1;
  const quality = QUALITY_MULTIPLIER[settings.quality] ?? 1;

  const perSheet = base * finish * quality;
  const total = rupees(perSheet * sheetCount * copies);

  const lines: PriceLine[] = [
    {
      label: `${paper.label} · ${settings.color === "color" ? "Colour" : "Black & white"}`,
      detail: `₹${rupees(base)} per sheet`,
      amount: rupees(base) * sheetCount * copies,
    },
  ];

  if (finish !== 1) {
    lines.push({
      label: settings.finish === "glossy" ? "Glossy paper" : "Matte paper",
      detail: `× ${finish}`,
      amount: rupees(base * (finish - 1)) * sheetCount * copies,
    });
  }

  if (quality !== 1) {
    lines.push({
      label: settings.quality === "premium" ? "Premium quality" : "High quality",
      detail: `× ${quality}`,
      amount: rupees(base * finish * (quality - 1)) * sheetCount * copies,
    });
  }

  return {
    sheets: sheetCount,
    perSheet: rupees(perSheet),
    total,
    lines,
  };
}

/**
 * Whether a price a browser sent matches what this shop actually charges.
 *
 * Not a rounding check: the client and the server run the same function on the
 * same numbers, so anything but equality means the settings were edited on the
 * way. One rupee of slack, because the client rounds for display.
 */
export function priceMatches(expected: number, claimed: unknown): boolean {
  const value = Number(claimed);
  if (!Number.isFinite(value)) return false;
  return Math.abs(value - expected) <= 1;
}
