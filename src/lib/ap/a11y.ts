/** Shared Digi Partner accessibility helpers. */

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/** Screen-reader friendly INR announcement (pairs with visible ₹ formatting). */
export function speakINR(amount: unknown): string {
  const n = Number(amount ?? 0);
  if (!Number.isFinite(n)) return "0 rupees";
  return `${Math.round(n).toLocaleString("en-IN")} rupees`;
}

/** Status text that does not rely on color alone. */
export function speakStatus(status: string, label?: string): string {
  const text = (label || status || "unknown").replace(/_/g, " ");
  return `Status: ${text}`;
}
