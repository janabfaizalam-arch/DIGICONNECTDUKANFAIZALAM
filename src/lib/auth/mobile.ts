/**
 * Client-safe Indian mobile normalization helpers.
 * No Node/server imports — safe for Client Components and shared validation.
 */

/** Build common Indian mobile storage variants for equality lookups. */
export function mobileLookupVariants(local10: string): string[] {
  const local = local10.replace(/\D/g, "").slice(-10);
  return Array.from(
    new Set([local, `91${local}`, `+91${local}`, `0${local}`, `+91 ${local}`, `+91-${local}`]),
  );
}

/** Canonical storage/comparison form: 10-digit Indian mobile, or null if invalid length. */
export function normalizeStoredMobile(value: string | null | undefined): string | null {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return null;
  let local = digits;
  if (local.startsWith("91") && local.length === 12) local = local.slice(2);
  if (local.length === 11 && local.startsWith("0")) local = local.slice(1);
  return local.length === 10 ? local : null;
}

export function matchesLocal(value: string | null | undefined, localPhone: string) {
  return normalizeStoredMobile(value) === localPhone;
}
