/** Client-safe auth destination helpers (no Next/server imports). */

export type LogoutPortal = "admin" | "ap" | "customer" | "auto";

export function resolveLogoutRedirect(portal: LogoutPortal): string {
  switch (portal) {
    case "admin":
      return "/admin/login?loggedOut=1";
    case "ap":
      return "/ap/login?loggedOut=1";
    case "customer":
      return "/customer/login?loggedOut=1";
    default:
      return "/login?loggedOut=1";
  }
}

export function inferLogoutPortal(pathname: string | null | undefined): LogoutPortal {
  const path = String(pathname ?? "");
  if (path.startsWith("/admin")) return "admin";
  if (path.startsWith("/ap") || path.startsWith("/agent")) return "ap";
  if (
    path.startsWith("/customer") ||
    path.startsWith("/customer-v2") ||
    path.startsWith("/customer-auth-v2")
  ) {
    return "customer";
  }
  return "auto";
}

/**
 * Role-aware login destination for guests (missing/expired session).
 * Never returns /unauthorized — that is only for authenticated denials.
 */
export function getLoginDestinationForPortal(pathname: string | null | undefined): string {
  switch (inferLogoutPortal(pathname)) {
    case "admin":
      return "/admin/login";
    case "ap":
      return "/ap/login";
    case "customer":
      return "/customer/login";
    default:
      return "/login";
  }
}

/** Broadcast so client shells can drop stale auth UI in the same tab. */
export const AUTH_LOGOUT_EVENT = "digiconnect:auth-logout";
