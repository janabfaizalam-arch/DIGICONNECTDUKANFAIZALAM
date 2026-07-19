import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { getSupabaseUrl } from "@/lib/supabase/config";

const protectedRoutes = ["/dashboard", "/customer", "/admin", "/agent", "/ap", "/apply"];
const authRoutes = [
  "/login",
  "/login/agent",
  "/login/customer",
  "/admin-login",
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
const apRoleAliases = new Set(["agent", "agency_partner"]);

type ProfileAuthShape = {
  role?: string | null;
  kyc_status?: string | null;
  active?: boolean | null;
  is_active?: boolean | null;
  account_status?: string | null;
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

function isAllowedForPath(pathname: string, role: AppRole) {
  if (matchesRoute(pathname, "/admin")) {
    return role === "admin";
  }

  if (matchesRoute(pathname, "/ap") || matchesRoute(pathname, "/agent")) {
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

  return "/customer/login";
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

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const { pathname } = request.nextUrl;

  // Preserve AiSensy customer auth entrypoints
  if (pathname === "/login" || pathname === "/login/customer" || pathname === "/customer-login") {
    return NextResponse.redirect(new URL("/customer/login", request.url));
  }
  if (pathname === "/signup") {
    return NextResponse.redirect(new URL("/customer/signup", request.url));
  }
  if (pathname === "/forgot-password" || pathname.startsWith("/forgot-password/")) {
    return NextResponse.redirect(new URL("/customer/forgot-pin", request.url));
  }
  if (pathname === "/admin-login") {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    return NextResponse.redirect(new URL("/customer/dashboard", request.url));
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
  if (!isProtectedRoute && !isAuthRoute) {
    return response;
  }

  // Optional legacy customer-v2 JWT stack (keep if routes still exist)
  const isCustomerV2Route = matchesRoute(pathname, "/customer-v2");
  const isCustomerV2AuthRoute =
    matchesRoute(pathname, "/customer-auth-v2/login") ||
    matchesRoute(pathname, "/customer-auth-v2/signup") ||
    matchesRoute(pathname, "/customer-auth-v2/forgot-pin") ||
    matchesRoute(pathname, "/customer-auth-v2/set-pin");

  if (isCustomerV2Route || isCustomerV2AuthRoute) {
    const { verifyAccessToken } = await import("@/lib/auth-v2/jwt");
    const accessToken = request.cookies.get("v2_customer_access_token")?.value;
    let customerPayload = null;

    if (accessToken) {
      customerPayload = await verifyAccessToken(accessToken);
    }

    if (!customerPayload && isCustomerV2Route) {
      const url = request.nextUrl.clone();
      url.pathname = "/customer-auth-v2/login";
      applyCustomerRedirect(url, pathname);
      return NextResponse.redirect(url);
    }

    if (customerPayload && isCustomerV2AuthRoute) {
      const url = request.nextUrl.clone();
      const redirectTo = request.nextUrl.searchParams.get("redirect");
      if (redirectTo?.startsWith("/") && !redirectTo.startsWith("//")) {
        const target = new URL(redirectTo, request.url);
        url.pathname = target.pathname;
        url.search = target.search;
      } else {
        url.pathname = "/customer-v2/dashboard";
        url.search = "";
      }
      return NextResponse.redirect(url);
    }

    return response;
  }

  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseUrl = getSupabaseUrl();

  if (!supabaseUrl || !supabaseAnonKey) {
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

  let role =
    normalizeAppRole((user?.app_metadata as Record<string, unknown> | undefined)?.role) ??
    normalizeAppRole(user?.user_metadata?.role) ??
    "customer";
  let profile: ProfileAuthShape | null = null;

  if (user) {
    const { data: profileRow } = await supabase
      .from("profiles")
      .select("role, kyc_status, active, is_active, account_status, mobile, pincode")
      .eq("id", user.id)
      .maybeSingle();

    profile = (profileRow as ProfileAuthShape | null) ?? null;
    const profileRole = normalizeAppRole(profile?.role);
    if (profileRole) {
      role = profileRole;
    } else if (!normalizeAppRole(user.user_metadata?.role) && !normalizeAppRole((user.app_metadata as Record<string, unknown> | undefined)?.role)) {
      const { data: apProbe } = await supabase.from("agency_partners").select("id").eq("user_id", user.id).maybeSingle();
      if (apProbe) {
        role = "agency_partner";
      }
    }
  }

  // Blocked / suspended customer or partner accounts
  if (user && isProtectedRoute) {
    const status = String(profile?.account_status ?? "active").toLowerCase();
    if (status === "blocked" || status === "suspended" || profile?.active === false) {
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = getLoginPathForProtectedRoute(pathname);
      return NextResponse.redirect(url);
    }
  }

  // AP active + KYC check
  let isAPActive = true;

  if (user && role === "agency_partner") {
    const { data: apRecord } = await supabase
      .from("agency_partners")
      .select("id, status, kyc_status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (apRecord) {
      const ap = apRecord as { id: string; status: string; kyc_status: string };
      isAPActive = ap.status === "active" && ap.kyc_status === "approved";
    } else {
      if (!profile) {
        const profileResult = await supabase
          .from("profiles")
          .select("role, kyc_status, active, is_active")
          .eq("id", user.id)
          .maybeSingle();
        profile = (profileResult.data as ProfileAuthShape | null) ?? null;
      }

      if (!profile) {
        isAPActive = false;
      } else if (String(profile.kyc_status ?? "").toLowerCase() !== "approved") {
        isAPActive = false;
      } else {
        const activeChecks = [profile.active, profile.is_active].filter((value) => typeof value === "boolean");
        isAPActive = activeChecks.length === 0 || activeChecks.every((value) => value === true);
      }
    }
  }

  // AP login route — signed-in partners go to dashboard when active
  if (user && matchesRoute(pathname, "/ap/login")) {
    const url = request.nextUrl.clone();
    url.pathname = role === "agency_partner" && isAPActive ? "/ap/dashboard" : role === "agency_partner" ? "/unauthorized" : getRoleHome(role);
    return NextResponse.redirect(url);
  }

  // Customer auth pages — keep signed-in users out of login/signup/forgot-pin
  if (
    user &&
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

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = getRoleHome(role);
    return NextResponse.redirect(url);
  }

  if (user && isProtectedRoute && !isAllowedForPath(pathname, role)) {
    const url = request.nextUrl.clone();

    // Partner-friendly redirect for customer apply workflow
    if (role === "agency_partner" && matchesRoute(pathname, "/apply")) {
      const slug = pathname.replace("/apply/", "").replace("/apply", "");
      url.pathname = "/ap/applications/new";
      url.search = "";
      if (slug) {
        url.searchParams.set("serviceId", slug);
      }
      return NextResponse.redirect(url);
    }

    url.pathname = matchesRoute(pathname, "/ap") || matchesRoute(pathname, "/agent") ? "/unauthorized" : getRoleHome(role);
    return NextResponse.redirect(url);
  }

  if (user && matchesRoute(pathname, "/ap") && !matchesRoute(pathname, "/ap/login") && !isAPActive) {
    const url = request.nextUrl.clone();
    url.pathname = "/unauthorized";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
