/**
 * Digi Partner currency and number formatting.
 * Always prefers ₹ (never "Rs") in partner-facing UI.
 */

export function formatINR(value: unknown, options?: { compact?: boolean; fallback?: string }): string {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return options?.fallback ?? "₹0";

  if (options?.compact && Math.abs(amount) >= 100_000) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(amount);
  }

  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

export function formatCount(value: unknown, fallback = "0"): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return fallback;
  return Math.round(n).toLocaleString("en-IN");
}

export function formatPercentDelta(current: number, previous: number): { label: string; tone: "up" | "down" | "flat" } {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) {
    if (current > 0 && previous === 0) return { label: "New", tone: "up" };
    return { label: "—", tone: "flat" };
  }
  const delta = ((current - previous) / Math.abs(previous)) * 100;
  const rounded = Math.round(delta);
  if (rounded === 0) return { label: "0%", tone: "flat" };
  return {
    label: `${rounded > 0 ? "+" : ""}${rounded}%`,
    tone: rounded > 0 ? "up" : "down",
  };
}

export function partnerInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "DP";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}
