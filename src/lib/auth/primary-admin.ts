/** Canonical primary admin identity for DigiConnect Dukan. */

export const PRIMARY_ADMIN = {
  fullName: "Faiz Alam",
  email: "janabfaizalam@gmail.com",
  mobile: "7007595931",
  role: "admin" as const,
} as const;

/** Former admin — keep as customer; never grant admin via allowlist. */
export const DEMOTED_ADMIN_EMAILS = ["dgcntdkn@gmail.com"] as const;

export function normalizeAdminEmail(email: string | null | undefined): string {
  return String(email ?? "")
    .trim()
    .toLowerCase();
}

export function isPrimaryAdminEmail(email: string | null | undefined): boolean {
  return normalizeAdminEmail(email) === PRIMARY_ADMIN.email;
}

export function isDemotedAdminEmail(email: string | null | undefined): boolean {
  const normalized = normalizeAdminEmail(email);
  return DEMOTED_ADMIN_EMAILS.some((item) => item === normalized);
}

/** Server allowlist: env ADMIN_EMAILS plus the locked primary admin. */
export function getAdminEmailAllowlist(): string[] {
  const fromEnv = (process.env.ADMIN_EMAILS ?? process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => normalizeAdminEmail(email))
    .filter(Boolean)
    .filter((email) => !isDemotedAdminEmail(email));

  return Array.from(new Set([PRIMARY_ADMIN.email, ...fromEnv]));
}

export function isAllowlistedAdminEmail(email: string | null | undefined): boolean {
  const normalized = normalizeAdminEmail(email);
  if (!normalized || isDemotedAdminEmail(normalized)) return false;
  return getAdminEmailAllowlist().includes(normalized);
}
