import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { getSupabaseUrl } from "@/lib/supabase/config";
import { DIGI_PARTNER_LOGIN_ROUTE, resolvePartnerLoginAlias } from "@/lib/auth/partner-access";

const protectedRoutes = ["/dashboard", "/customer", "/admin", "/agent", "/ap", "/apply"];
const authRoutes = [
  "/login",
  "/login/agent",
  "/login/customer",
  "/admin-login",
  "/admin/login",
  "/agent-login",
  "/customer-login",
  "/customer/login",
  "/customer/signup",
  "/customer/forgot-pin",
  "/ap/login",
  "/ap/forgot-password",
  "/ap/reset-password",
  "/signup",
  "/forgot-password",
  "/reset-password",
];
const removedRoleRoutes = ["/staff", "/team", "/employee", "/super-admin", "/super-admin-login", "/login/staff"];

// Legacy agent routes that redirect to /ap/*
const legacyAgentRedirects: Record<string, string> = {
  "/agent/dashboard": "/ap/dashboard",
  "/agent/applications/new": "/ap/applications/new",
  "/agent/applications": "/ap/applications",
  "/agent/assigned-work": "/ap/assigned-work",
  "/agent/commissions": "/ap/commissions",
  "/agent/payout-history": "/ap/wallet",
  "/agent/profile": "/ap/profile",
  "/agent/support": "/ap/support",
  "/agent": "/ap/dashboard",
  "/agent-login": "/ap/login",
  "/login/agent": "/ap/login",
};

type AppRole = "admin" | "agency_partner" | "customer";

const appRoles: AppRole[] = ["admin", "agency_partner", "customer"];
const adminRoleAliases = new Set(["super_admin", "staff", "team", "employee", "processor"]);
const apRoleAliases = new Set(["agent", "agency_partner", "ap"]);

type ProfileAuthShape = {
  role?: string | null;
  kyc_status?: string | null;
  active?: boolean | null;
  is_active?: boolean | null;
  mobile?: string | null;
  pincode?: string | null;
};

function matchesRoute(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(`${route}/`);
}

function normalizeAppRole(role: unknown): AppRole | null {
  const value = String(role ?? "").toLowerCase();

  if (adminRoleAliases.has(value)) {
    return "admin";
  }

  if (apRoleAliases.has(value)) {
    return "agency_partner";
  }

  return appRoles.includes(value as AppRole) ? (value as AppRole) : null;
}

function getRoleHome(role: AppRole) {
  if (role === "admin") {
    return "/admin";
  }

  if (role === "agency_partner") {
    return "/ap/dashboard";
  }

  return "/customer/dashboard";
}

function isAllowedForPath(
  pathname: string,
  role: AppRole,
  options?: { partnerActive?: boolean; adminMembership?: boolean },
) {
  if (matchesRoute(pathname, "/admin")) {
    return options?.adminMembership === true || role === "admin";
  }

  if (matchesRoute(pathname, "/ap") || matchesRoute(pathname, "/agent")) {
    // Digi Partner access is membership-based, not profiles.role alone.
    if (options?.partnerActive) return true;
    return role === "agency_partner";
  }

  if (
    matchesRoute(pathname, "/dashboard") ||
    matchesRoute(pathname, "/customer") ||
    matchesRoute(pathname, "/apply")
  ) {
    return role === "customer";
  }

  return true;
}

function getLoginPathForProtectedRoute(pathname: string) {
  if (matchesRoute(pathname, "/ap") || matchesRoute(pathname, "/agent")) {
    return "/ap/login";
  }

  if (matchesRoute(pathname, "/admin")) {
    return "/admin/login";
  }

  if (matchesRoute(pathname, "/customer") || matchesRoute(pathname, "/apply")) {
    return "/customer/login";
  }

  return "/login";
}

function isUnauthorizedPath(pathname: string) {
  return matchesRoute(pathname, "/unauthorized");
}

function applyCustomerRedirect(url: URL, pathname: string) {
  if (!matchesRoute(pathname, "/apply")) {
    return;
  }

  url.searchParams.set("redirect", `${pathname}${url.search}`);
}

function getLegacyAgentRedirect(pathname: string): string | null {
  if (pathname.startsWith("/ap")) {
    return null;
  }

  if (legacyAgentRedirects[pathname]) {
    return legacyAgentRedirects[pathname];
  }

  if (pathname.startsWith("/agent/applications/") && pathname !== "/agent/applications/new") {
    const id = pathname.replace("/agent/applications/", "");
    return `/ap/applications/${id}`;
  }

  if (matchesRoute(pathname, "/agent")) {
    return "/ap/dashboard";
  }

  return null;
}

/**
 * A ceiling on how long middleware will wait for a role lookup.
 *
 * Middleware sits in front of every protected route, and Vercel kills the
 * invocation if it overruns — which surfaces as a 504 on the page, not as a
 * degraded one. A lookup that has not answered in this long is not going to
 * save the request; giving up on it and falling back to the role in the token
 * lets the page render, and the page does its own authorisation anyway.
 */
const ROLE_LOOKUP_TIMEOUT_MS = 2_500;

function withLookupTimeout<T>(query: PromiseLike<{ data: T | null }>): Promise<{ data: T | null }> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<{ data: T | null }>((resolve) => {
    timer = setTimeout(() => {
      console.warn("MIDDLEWARE_ROLE_LOOKUP_TIMEOUT", { ms: ROLE_LOOKUP_TIMEOUT_MS });
      resolve({ data: null });
    }, ROLE_LOOKUP_TIMEOUT_MS);
  });

  return Promise.race([Promise.resolve(query).then((result) => result ?? { data: null }), timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const { pathname } = request.nextUrl;

  // API routes must never be rewritten/redirected to HTML auth pages.
  // Auth and rate limits are enforced inside each route handler.
  if (pathname.startsWith("/api/")) {
    return NextResponse.next({ request });
  }

  // Preserve AiSensy customer auth entrypoints
  if (pathname === "/login" || pathname === "/login/customer" || pathname === "/customer-login") {
    return NextResponse.redirect(new URL("/customer/login", request.url));
  }
  if (pathname === "/signup") {
    return NextResponse.redirect(new URL("/customer/signup", request.url));
  }
  if (pathname === "/customer-auth-v2/signup" || pathname.startsWith("/customer-auth-v2/signup/")) {
    return NextResponse.redirect(new URL("/customer/signup", request.url), 308);
  }
  if (pathname === "/forgot-password" || pathname.startsWith("/forgot-password/")) {
    return NextResponse.redirect(new URL("/customer/forgot-pin", request.url));
  }
  if (pathname === "/admin-login") {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }
  // Legacy /dashboard → customer portal (preserve application detail IDs)
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    const { resolveLegacyCustomerDashboardPath } = await import("@/lib/applications/customer-dashboard-paths");
    const target = resolveLegacyCustomerDashboardPath(pathname) || "/customer/dashboard";
    const url = request.nextUrl.clone();
    const [pathOnly, queryFromTarget] = target.split("?");
    url.pathname = pathOnly;
    if (queryFromTarget) {
      url.search = `?${queryFromTarget}`;
    }
    return NextResponse.redirect(url, 308);
  }

  // Canonical Digi Partner login — permanently redirect every legacy/alternate
  // partner login URL to /ap/login so no partner CTA can ever hit a 404.
  const partnerLoginAlias = resolvePartnerLoginAlias(pathname);
  if (partnerLoginAlias) {
    const url = request.nextUrl.clone();
    url.pathname = partnerLoginAlias;
    url.search = "";
    return NextResponse.redirect(url, 308);
  }

  // Legacy agent route redirects (before auth check)
  const legacyRedirect = getLegacyAgentRedirect(pathname);
  if (legacyRedirect && !matchesRoute(pathname, "/agent-login")) {
    const url = request.nextUrl.clone();
    url.pathname = legacyRedirect;
    return NextResponse.redirect(url);
  }

  // Agent-login redirect
  if (pathname === "/agent-login" || matchesRoute(pathname, "/agent-login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/ap/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (removedRoleRoutes.some((route) => matchesRoute(pathname, route))) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  const isProtectedRoute =
    protectedRoutes.some((route) => matchesRoute(pathname, route)) &&
    !authRoutes.some((route) => matchesRoute(pathname, route));
  const isAuthRoute = authRoutes.some((route) => matchesRoute(pathname, route));

  // Bypass session lookup and DB queries for public pages
  // /unauthorized is session-sensitive: guests must be sent to login, not this page.
  if (!isProtectedRoute && !isAuthRoute && !isUnauthorizedPath(pathname)) {
    return response;
  }

  // Admin PIN JWT sessions (mobile + PIN for primary admin)
  const isAdminPortalRoute =
    matchesRoute(pathname, "/admin") && !matchesRoute(pathname, "/admin/login");
  const isAdminLoginPage = matchesRoute(pathname, "/admin/login");
  const loggedOutIntent = request.nextUrl.searchParams.get("loggedOut") === "1";
  if (isAdminPortalRoute || isAdminLoginPage) {
    const { verifyAdminAccessToken } = await import("@/lib/auth/admin-session");
    const adminToken = request.cookies.get("v2_admin_access_token")?.value;
    let adminPayload = null;
    if (adminToken) {
      adminPayload = await verifyAdminAccessToken(adminToken);
    }

    // After logout, never bounce back to /admin solely because a stale cookie lingered one tick.
    if (adminPayload && isAdminLoginPage && !loggedOutIntent) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      url.search = "";
      return NextResponse.redirect(url);
    }

    if (adminPayload && isAdminPortalRoute) {
      return response;
    }
  }

  // Customer PIN JWT sessions (customers.hashed_pin) — /customer and legacy /customer-v2
  const isCustomerPortalRoute =
    matchesRoute(pathname, "/customer") &&
    !matchesRoute(pathname, "/customer/login") &&
    !matchesRoute(pathname, "/customer/signup") &&
    !matchesRoute(pathname, "/customer/forgot-pin");
  const isCustomerAuthPage =
    matchesRoute(pathname, "/customer/login") ||
    matchesRoute(pathname, "/customer/signup") ||
    matchesRoute(pathname, "/customer/forgot-pin");
  const isCustomerV2Route = matchesRoute(pathname, "/customer-v2");
  const isCustomerV2AuthRoute =
    matchesRoute(pathname, "/customer-auth-v2/login") ||
    matchesRoute(pathname, "/customer-auth-v2/signup") ||
    matchesRoute(pathname, "/customer-auth-v2/forgot-pin") ||
    matchesRoute(pathname, "/customer-auth-v2/set-pin");

  if (isCustomerPortalRoute || isCustomerAuthPage || isCustomerV2Route || isCustomerV2AuthRoute) {
    const { verifyAccessToken } = await import("@/lib/auth-v2/jwt");
    const accessToken = request.cookies.get("v2_customer_access_token")?.value;
    let customerPayload = null;

    if (accessToken) {
      customerPayload = await verifyAccessToken(accessToken);
    }

    if (customerPayload && (isCustomerAuthPage || isCustomerV2AuthRoute) && !loggedOutIntent) {
      const url = request.nextUrl.clone();
      const redirectTo = request.nextUrl.searchParams.get("redirect");
      if (redirectTo?.startsWith("/") && !redirectTo.startsWith("//")) {
        const target = new URL(redirectTo, request.url);
        url.pathname = target.pathname;
        url.search = target.search;
      } else {
        url.pathname = isCustomerV2AuthRoute ? "/customer-v2/dashboard" : "/customer/dashboard";
        url.search = "";
      }
      return NextResponse.redirect(url);
    }

    if (!customerPayload && isCustomerV2Route) {
      const url = request.nextUrl.clone();
      url.pathname = "/customer-auth-v2/login";
      applyCustomerRedirect(url, pathname);
      return NextResponse.redirect(url);
    }

    // PIN JWT is enough for /customer portal pages (no Supabase Auth user required)
    if (customerPayload && isCustomerPortalRoute) {
      return response;
    }

    if (isCustomerV2Route || isCustomerV2AuthRoute) {
      return response;
    }
    // Fall through to Supabase Auth for /customer when no PIN JWT (legacy sessions)
  }

  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseUrl = getSupabaseUrl();

  if (!supabaseUrl || !supabaseAnonKey) {
    // Without Supabase we can still keep guests off /unauthorized when no JWT cookies exist.
    if (isUnauthorizedPath(pathname)) {
      const hasAdminJwt = Boolean(request.cookies.get("v2_admin_access_token")?.value);
      const hasCustomerJwt = Boolean(request.cookies.get("v2_customer_access_token")?.value);
      if (!hasAdminJwt && !hasCustomerJwt) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        url.search = "loggedOut=1";
        return NextResponse.redirect(url);
      }
    }

    if (isProtectedRoute && process.env.NODE_ENV !== "development") {
      const url = request.nextUrl.clone();
      url.pathname = getLoginPathForProtectedRoute(pathname);
      applyCustomerRedirect(url, pathname);
      return NextResponse.redirect(url);
    }

    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = getLoginPathForProtectedRoute(pathname);
    applyCustomerRedirect(url, pathname);
    return NextResponse.redirect(url);
  }

  // Guests must never see /unauthorized — that page is for authenticated denials only.
  if (!user && isUnauthorizedPath(pathname)) {
    const url = request.nextUrl.clone();
    const referer = request.headers.get("referer");
    let hint = "/";
    try {
      if (referer) hint = new URL(referer).pathname;
    } catch {
      hint = "/";
    }
    url.pathname = getLoginPathForProtectedRoute(hint);
    url.search = "loggedOut=1";
    return NextResponse.redirect(url);
  }

  let role =
    normalizeAppRole((user?.app_metadata as Record<string, unknown> | undefined)?.role) ??
    normalizeAppRole(user?.user_metadata?.role) ??
    "customer";
  let profile: ProfileAuthShape | null = null;
  let partnerActive = false;
  let partnerLinked = false;
  let partnerInactiveOrUnapproved = false;
  let adminMembership = false;

  if (user) {
    /*
      Two reads, run together, and the partner one only where it can change
      the answer.

      This used to be up to three round trips to Supabase, one after another,
      inside middleware: `profiles`, then an `agency_partners` probe, then
      `agency_partners` again — for the same row the probe had just looked at.
      Added to `getUser()` above, that is four serial calls to another service
      before a single byte of the page is produced, on a matcher that covers
      every protected route. When the database was slow it spent the whole
      middleware budget and Vercel returned 504 MIDDLEWARE_INVOCATION_TIMEOUT
      for everything behind it, the customer dashboard included.

      The probe is gone — it selected `id` from exactly the row the second
      query already returns, so the second one answers both questions. What is
      left runs concurrently, which makes the cost one round trip rather than
      the sum of two, and it is skipped where nothing reads it.
    */
    const metadataRole =
      normalizeAppRole((user.app_metadata as Record<string, unknown> | undefined)?.role) ??
      normalizeAppRole(user.user_metadata?.role);

    // Membership matters on the partner-facing paths, for a user whose token
    // already says partner, and when the token records no role at all — that
    // last case is the one the removed probe existed to answer.
    const needsPartnerData =
      matchesRoute(pathname, "/ap") ||
      matchesRoute(pathname, "/agent") ||
      matchesRoute(pathname, "/apply") ||
      matchesRoute(pathname, DIGI_PARTNER_LOGIN_ROUTE) ||
      metadataRole === "agency_partner" ||
      !metadataRole;

    const [profileResult, partnerResult] = await Promise.all([
      withLookupTimeout(
        supabase
          .from("profiles")
          .select("role, kyc_status, active, is_active, mobile, pincode")
          .eq("id", user.id)
          .maybeSingle(),
      ),
      needsPartnerData
        ? withLookupTimeout(
            supabase.from("agency_partners").select("id, status, kyc_status").eq("user_id", user.id).maybeSingle(),
          )
        : Promise.resolve({ data: null }),
    ]);

    profile = (profileResult.data as ProfileAuthShape | null) ?? null;
    const apRecord = partnerResult.data as { id: string; status: string; kyc_status: string } | null;

    const profileRole = normalizeAppRole(profile?.role);
    if (profileRole) {
      role = profileRole;
    } else if (apRecord && !metadataRole) {
      role = "agency_partner";
    }

    const userEmail = String(user.email ?? "").toLowerCase();
    // Hard demotion: former admin emails never keep admin access
    if (userEmail === "dgcntdkn@gmail.com" && role === "admin") {
      role = "customer";
    }

    // Admin membership (email allowlist / profile) — does NOT alone grant /ap
    if (userEmail === "janabfaizalam@gmail.com" || role === "admin") {
      adminMembership = true;
      // Keep primary role as admin for non-AP redirects, but do not erase partner membership.
      if (userEmail === "janabfaizalam@gmail.com") {
        role = "admin";
      }
    }

    if (apRecord) {
      partnerLinked = true;
      const ap = apRecord as { id: string; status: string; kyc_status: string };
      partnerActive = ap.status === "active" && ap.kyc_status === "approved";
      partnerInactiveOrUnapproved = !partnerActive;
      // When visiting AP portal with valid membership, treat request context as agency_partner
      // even if profiles.role was incorrectly set to admin (e.g. shared-mobile admin promotion).
      if (partnerActive && (matchesRoute(pathname, "/ap") || matchesRoute(pathname, "/agent"))) {
        role = "agency_partner";
      }
    } else if (role === "agency_partner") {
      // Legacy profiles-only agents
      if (!profile) {
        partnerInactiveOrUnapproved = true;
      } else if (String(profile.kyc_status ?? "").toLowerCase() !== "approved") {
        partnerInactiveOrUnapproved = true;
      } else {
        const activeChecks = [profile.active, profile.is_active].filter((value) => typeof value === "boolean");
        partnerActive = activeChecks.length === 0 || activeChecks.every((value) => value === true);
        partnerInactiveOrUnapproved = !partnerActive;
      }
    }
  }

  // Inactive accounts (production profiles use active / is_active — not account_status)
  if (user && isProtectedRoute) {
    const inactive =
      profile?.active === false || profile?.is_active === false;
    // Do not sign out dual-role admins solely because a partner profile flag is odd;
    // partner inactivity is handled by partnerActive below.
    if (inactive && !adminMembership && !partnerActive) {
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = getLoginPathForProtectedRoute(pathname);
      return NextResponse.redirect(url);
    }
  }

  // Digi Partner login route — portal-aware (membership over single profiles.role):
  //   - active partner membership -> /ap/dashboard
  //   - linked but inactive/unapproved -> /unauthorized?reason=
  //   - admin-only (no partner membership) -> /admin
  //   - customer -> stay (switch notice)
  //   - loggedOut=1 -> stay on login
  if (user && matchesRoute(pathname, DIGI_PARTNER_LOGIN_ROUTE) && !loggedOutIntent) {
    if (partnerActive) {
      const url = request.nextUrl.clone();
      url.pathname = "/ap/dashboard";
      return NextResponse.redirect(url);
    }
    if (partnerLinked && partnerInactiveOrUnapproved) {
      const url = request.nextUrl.clone();
      url.pathname = "/unauthorized";
      url.search = "reason=ap_not_active";
      return NextResponse.redirect(url);
    }
    if (adminMembership && !partnerLinked) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      return NextResponse.redirect(url);
    }
    if (role === "agency_partner" && partnerInactiveOrUnapproved) {
      const url = request.nextUrl.clone();
      url.pathname = "/unauthorized";
      url.search = "reason=kyc_not_approved";
      return NextResponse.redirect(url);
    }
    // Customer / dual-role admin without active membership stays on /ap/login.
    return response;
  }

  // Customer auth pages — keep signed-in users out of login/signup/forgot-pin
  if (
    user &&
    !loggedOutIntent &&
    (matchesRoute(pathname, "/customer/login") ||
      matchesRoute(pathname, "/customer/signup") ||
      matchesRoute(pathname, "/customer/forgot-pin"))
  ) {
    const url = request.nextUrl.clone();
    const redirectTo = request.nextUrl.searchParams.get("redirect");
    if (role === "customer" && redirectTo?.startsWith("/") && !redirectTo.startsWith("//")) {
      const target = new URL(redirectTo, request.url);
      url.pathname = target.pathname;
      url.search = target.search;
    } else {
      url.pathname = getRoleHome(role);
      url.search = "";
    }
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute && !loggedOutIntent) {
    // /admin/login stays public for non-admin sessions so the primary admin
    // can always log in even with a stale customer session cookie present.
    if (matchesRoute(pathname, "/admin/login") && role !== "admin") {
      return response;
    }
    const url = request.nextUrl.clone();
    url.pathname = getRoleHome(role);
    return NextResponse.redirect(url);
  }

  if (user && isProtectedRoute && !isAllowedForPath(pathname, role, { partnerActive, adminMembership })) {
    const url = request.nextUrl.clone();

    // Partner-friendly redirect for customer apply workflow
    if ((role === "agency_partner" || partnerActive) && matchesRoute(pathname, "/apply")) {
      const slug = pathname.replace("/apply/", "").replace("/apply", "");
      url.pathname = "/ap/applications/new";
      url.search = "";
      if (slug) {
        url.searchParams.set("serviceId", slug);
      }
      return NextResponse.redirect(url);
    }

    if (matchesRoute(pathname, "/ap") || matchesRoute(pathname, "/agent")) {
      url.pathname = "/unauthorized";
      if (adminMembership && !partnerLinked) {
        url.search = "reason=admin_portal_only";
      } else if (partnerLinked && partnerInactiveOrUnapproved) {
        url.search = "reason=ap_not_active";
      } else if (!partnerLinked) {
        url.search = "reason=not_linked";
      } else {
        url.search = "reason=wrong_role";
      }
      return NextResponse.redirect(url);
    }

    url.pathname = getRoleHome(role);
    return NextResponse.redirect(url);
  }

  if (
    user &&
    matchesRoute(pathname, "/ap") &&
    !matchesRoute(pathname, "/ap/login") &&
    partnerInactiveOrUnapproved &&
    (partnerLinked || role === "agency_partner")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/unauthorized";
    url.search = "reason=ap_not_active";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
