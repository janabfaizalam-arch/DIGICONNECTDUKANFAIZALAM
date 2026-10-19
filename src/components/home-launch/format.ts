import type { ResolvedModule } from "@/lib/homepage/launch-catalog";

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export function formatINR(amount: number) {
  return inr.format(amount);
}

/** How a module's price reads, from its resolved catalogue entry only. */
export function priceText(resolved: ResolvedModule) {
  if (resolved.availability === "checkout" && resolved.fee) return formatINR(resolved.fee);
  if (resolved.priceLabel) return resolved.priceLabel;
  return null;
}

export const AVAILABILITY_LABEL: Record<ResolvedModule["availability"], string> = {
  checkout: "Buy online",
  listed: "Listed service",
  enquiry: "Quote on request",
};
