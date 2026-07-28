/**
 * Legacy `/dashboard/*` → canonical customer portal path mapping.
 * Used by middleware and unit tests.
 */
export function resolveLegacyCustomerDashboardPath(pathname: string): string | null {
  if (pathname === "/dashboard") {
    return "/customer/dashboard";
  }

  if (pathname === "/dashboard/applications") {
    return "/customer/dashboard?tab=applications";
  }

  const detailMatch = pathname.match(/^\/dashboard\/applications\/([^/]+)\/?$/);
  if (detailMatch?.[1]) {
    return `/customer/applications/${detailMatch[1]}`;
  }

  if (pathname.startsWith("/dashboard/")) {
    return "/customer/dashboard";
  }

  return null;
}
