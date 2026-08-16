/**
 * Routes that render a standalone auth screen. These own the full viewport, so
 * every shell (site header, bottom nav, admin sidebar, partner nav) hides here.
 * Single source of truth — add a new sign-in/recovery route once, in this list.
 */
export const AUTH_ROUTES = [
  "/admin/login",
  "/ap/login",
  "/ap/forgot-password",
  "/ap/reset-password",
  "/customer/login",
  "/customer/signup",
  "/customer/forgot-password",
  "/customer/reset-password",
  "/customer/forgot-pin",
  // Legacy aliases: they redirect to the routes above, but stay chrome-free
  // so the old URLs never flash a header on the way through.
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/admin-login",
  "/agent-login",
  "/customer-login",
] as const;

/** True when `pathname` is an auth screen (exact match or a nested step). */
export function isAuthRoutePath(pathname: string): boolean {
  return AUTH_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}
