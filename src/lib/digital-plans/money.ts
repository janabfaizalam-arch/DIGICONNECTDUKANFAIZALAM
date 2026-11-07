import type { AddonUnit, QuoteLine } from "./types";

/**
 * Money for RNOS Digital packages. Everything is integer paise; these are the
 * only places a rupee figure is produced or parsed.
 */

const INR = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 0 });

/** 99900 → "₹999"; 3000 → "₹30"; 12345 → "₹123.45". */
export function formatPaise(paise: number): string {
  const rupees = paise / 100;
  return `₹${INR.format(Number.isInteger(rupees) ? rupees : Number(rupees.toFixed(2)))}`;
}

/** The figure a price label shows, with "onwards" when the price is a floor. */
export function formatPrice(paise: number, starting = false): string {
  return starting ? `${formatPaise(paise)} onwards` : formatPaise(paise);
}

export const UNIT_SUFFIX: Record<AddonUnit, string> = {
  one_time: "",
  monthly: "/month",
  per_page: "/page",
  per_product: "/product",
};

export const UNIT_LABEL: Record<AddonUnit, string> = {
  one_time: "One-time",
  monthly: "Per month",
  per_page: "Per page",
  per_product: "Per product",
};

export function formatAddonPrice(paise: number, unit: AddonUnit, starting = false): string {
  const base = `${formatPaise(paise)}${UNIT_SUFFIX[unit]}`;
  return starting ? `${base} onwards` : base;
}

/**
 * A rupee amount typed into a form → paise. Accepts "1,999", "1999.50",
 * "₹ 999". Returns null for anything that is not a non-negative amount with
 * at most two decimals, rather than guessing.
 */
export function rupeesToPaise(input: string | number): number | null {
  const text = String(input).replace(/[₹,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
  const [whole, fraction = ""] = text.split(".");
  const paise = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(paise) ? paise : null;
}

/** Paise → the value an admin form field shows, e.g. 99900 → "999". */
export function paiseToRupeesInput(paise: number): string {
  return paise % 100 === 0 ? String(paise / 100) : (paise / 100).toFixed(2);
}

/** GST on an amount, rounded to the nearest paisa. */
export function gstOn(paise: number, percent: number): number {
  return Math.round((paise * percent) / 100);
}

export type QuoteTotals = {
  /** Setup fee plus one-time lines: what is paid before work starts. */
  oneTimePaise: number;
  /** Monthly fee plus monthly lines. */
  monthlyPaise: number;
  oneTimeGstPaise: number;
  monthlyGstPaise: number;
  /** One-time total with GST plus the first month with GST. */
  firstPaymentPaise: number;
  /** Over the minimum commitment, before GST: setup + months × monthly. */
  commitmentValuePaise: number;
};

/**
 * The arithmetic of a quotation. Per-unit lines (pages, products) are entered
 * already multiplied out, so they count as one-time.
 */
export function quoteTotals(input: {
  monthlyPaise: number;
  setupPaise: number;
  lines?: QuoteLine[];
  gstPercent: number;
  commitmentMonths: number;
}): QuoteTotals {
  const lines = input.lines ?? [];
  const monthlyLines = lines.filter((line) => line.unit === "monthly").reduce((sum, line) => sum + line.amountPaise, 0);
  const oneTimeLines = lines.filter((line) => line.unit !== "monthly").reduce((sum, line) => sum + line.amountPaise, 0);

  const oneTimePaise = input.setupPaise + oneTimeLines;
  const monthlyPaise = input.monthlyPaise + monthlyLines;
  const oneTimeGstPaise = gstOn(oneTimePaise, input.gstPercent);
  const monthlyGstPaise = gstOn(monthlyPaise, input.gstPercent);

  return {
    oneTimePaise,
    monthlyPaise,
    oneTimeGstPaise,
    monthlyGstPaise,
    firstPaymentPaise: oneTimePaise + oneTimeGstPaise + monthlyPaise + monthlyGstPaise,
    commitmentValuePaise: oneTimePaise + monthlyPaise * Math.max(0, input.commitmentMonths),
  };
}
