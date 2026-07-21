/**
 * Pure, testable building blocks for the admin login flow.
 * No I/O here — the API route and the form both consume these.
 */

import { normalizeStoredMobile } from "@/lib/auth/customer-lookup";

// ── Hard timeout ──────────────────────────────────────────────────────────

export class TimeoutError extends Error {
  constructor(label: string, ms: number) {
    super(`${label} timed out after ${ms}ms`);
    this.name = "TimeoutError";
  }
}

/** Reject with TimeoutError if `promise` does not settle within `ms`. */
export async function withTimeout<T>(promise: PromiseLike<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new TimeoutError(label, ms)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// ── Duplicate-safe admin profile selection ────────────────────────────────

export type AdminProfileRow = {
  id: string;
  role?: string | null;
  email?: string | null;
  mobile?: string | null;
  phone?: string | null;
  full_name?: string | null;
  active?: boolean | null;
  is_active?: boolean | null;
};

/**
 * Deterministically pick one admin profile from possibly-duplicated rows.
 * Never throws on duplicates; reports how many were found so callers can log.
 * Priority: role=admin/super_admin → primary email match → mobile match.
 * Ties broken by lexicographic id so repeated calls always pick the same row.
 */
export function pickAdminProfile(
  rows: AdminProfileRow[],
  opts: { primaryEmail: string; localMobile?: string },
): { profile: AdminProfileRow | null; duplicates: number } {
  const primaryEmail = opts.primaryEmail.trim().toLowerCase();

  const deduped = Array.from(new Map(rows.map((row) => [row.id, row])).values()).sort((a, b) =>
    a.id.localeCompare(b.id),
  );

  const duplicates = Math.max(0, deduped.length - 1);

  const byRole = deduped.filter((row) => {
    const role = String(row.role ?? "").toLowerCase();
    return role === "admin" || role === "super_admin";
  });
  if (byRole.length > 0) return { profile: byRole[0], duplicates };

  const byEmail = deduped.filter((row) => String(row.email ?? "").toLowerCase() === primaryEmail);
  if (byEmail.length > 0) return { profile: byEmail[0], duplicates };

  if (opts.localMobile) {
    const byMobile = deduped.filter(
      (row) =>
        normalizeStoredMobile(row.mobile) === opts.localMobile ||
        normalizeStoredMobile(row.phone) === opts.localMobile,
    );
    if (byMobile.length > 0) return { profile: byMobile[0], duplicates };
  }

  return { profile: null, duplicates };
}

// ── Cookie conflict detection ─────────────────────────────────────────────

/** Supabase SSR auth cookies: sb-<ref>-auth-token, optionally chunked (.0, .1, …). */
export function isSupabaseAuthCookieName(name: string): boolean {
  return /^sb-.+-auth-token(\.\d+)?$/.test(name);
}

export const CUSTOMER_ACCESS_COOKIE = "v2_customer_access_token";
export const CUSTOMER_REFRESH_COOKIE = "v2_customer_refresh_token";

// ── UI error categorization ───────────────────────────────────────────────

export type AdminLoginFailureKind = "http" | "timeout" | "network";

export type AdminLoginFailure = {
  category:
    | "invalid_credentials"
    | "access_denied"
    | "account_inactive"
    | "timeout"
    | "network"
    | "server_config"
    | "server_error";
  message: string;
};

export function categorizeAdminLoginFailure(input: {
  kind: AdminLoginFailureKind;
  status?: number;
  message?: string | null;
}): AdminLoginFailure {
  if (input.kind === "timeout") {
    return { category: "timeout", message: "Login request timed out. Please try again." };
  }
  if (input.kind === "network") {
    return { category: "network", message: "Network error. Check your connection and try again." };
  }

  const status = input.status ?? 500;
  const serverMessage = String(input.message ?? "").trim();

  if (status === 401) {
    return { category: "invalid_credentials", message: serverMessage || "Invalid credentials." };
  }
  if (status === 403) {
    const inactive = /inactive|disabled/i.test(serverMessage);
    return {
      category: inactive ? "account_inactive" : "access_denied",
      message: serverMessage || "Admin access denied.",
    };
  }
  if (status === 504 || status === 408) {
    return { category: "timeout", message: "Login request timed out. Please try again." };
  }
  if (status === 503) {
    return {
      category: "server_config",
      message: serverMessage || "Server configuration error. Please contact support.",
    };
  }
  return { category: "server_error", message: serverMessage || "Login failed. Please try again." };
}
