import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { getSupabaseUrl } from "@/lib/supabase/config";

const protectedRoutes = ["/dashboard", "/customer", "/admin", "/agent", "/ap", "/apply"];
const authRoutes = ["/login", "/login/agent", "/login/customer", "/admin-login", "/agent-login", "/customer-login", "/ap/login", "/ap/forgot-password", "/ap/reset-password"];
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

  if (matchesRoute(pathname, "/customer") || matchesRoute(pathname, "/apply")) {
    return "/login/customer";
  }

  return "/login";
}

function applyCustomerRedirect(url: URL, pathname: string) {
  if (!matchesRoute(pathname, "/apply")) {
    return;
  }

  url.searchParams.set("redirect", `${pathname}${url.search}`);
}

function getLegacyAgentRedirect(pathname: string): string | null {
  // Exclude new AP routes from legacy redirect logic
  if (pathname.startsWith("/ap")) {
    return null;
  }

  // Exact match
  if (legacyAgentRedirects[pathname]) {
    return legacyAgentRedirects[pathname];
  }

  // Dynamic routes like /agent/applications/[id]
  if (pathname.startsWith("/agent/applications/") && pathname !== "/agent/applications/new") {
    const id = pathname.replace("/agent/applications/", "");
    return `/ap/applications/${id}`;
  }

  // Catch-all for /agent/*
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

  // Legacy agent UI → Agency Partner (canonical). Keeps bookmarks working.
  const legacyRedirect = getLegacyAgentRedirect(pathname);
  if (legacyRedirect && !matchesRoute(pathname, "/agent-login")) {
    const url = request.nextUrl.clone();
    url.pathname = legacyRedirect;
    return NextResponse.redirect(url);
  }

  if (pathname === "/agent-login" || matchesRoute(pathname, "/agent-login") || matchesRoute(pathname, "/login/agent")) {
    const url = request.nextUrl.clone();
    url.pathname = "/ap/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Legacy admin "agents" CRM → Agency Partners admin (single partner model).
  if (matchesRoute(pathname, "/admin/agents")) {
    const url = request.nextUrl.clone();
    if (pathname === "/admin/agents" || pathname === "/admin/agents/") {
      url.pathname = "/admin/agency-partners";
    } else if (pathname === "/admin/agents/new") {
      url.pathname = "/admin/agency-partners/new";
    } else {
      const id = pathname.replace(/^\/admin\/agents\//, "").split("/")[0];
      url.pathname = id ? `/admin/agency-partners/${id}` : "/admin/agency-partners";
    }
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Retired Leads / CRM Pipeline UI — permanent redirects away from the module.
  // Public enquiry ingestion lives at /api/enquiry (not a dashboard).
  if (
    matchesRoute(pathname, "/admin/leads") ||
    matchesRoute(pathname, "/ap/leads")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = matchesRoute(pathname, "/ap/leads") ? "/ap/dashboard" : "/admin";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Customer JWT v2 UI is retired. Canonical auth is Supabase Auth at
  // /login/customer + /customer/*. No jose / JWT verification runs on Edge.
  if (matchesRoute(pathname, "/customer-v2") || matchesRoute(pathname, "/customer-auth-v2")) {
    const url = request.nextUrl.clone();
    if (matchesRoute(pathname, "/customer-auth-v2")) {
      url.pathname = "/login/customer";
      url.search = "";
    } else {
      url.pathname = "/customer/dashboard";
      url.search = "";
    }
    return NextResponse.redirect(url);
  }

  if (removedRoleRoutes.some((route) => matchesRoute(pathname, route))) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin-login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  const isProtectedRoute = protectedRoutes.some((route) => matchesRoute(pathname, route)) &&
                           !authRoutes.some((route) => matchesRoute(pathname, route));
  const isAuthRoute = authRoutes.some((route) => matchesRoute(pathname, route));

  // Bypass session lookup and DB queries for public pages to optimize page load speeds.
  // Edge middleware must not import jose, argon2, Node crypto, or session stores.
  if (!isProtectedRoute && !isAuthRoute) {
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

  // Only app_metadata is trusted for the fast-path role claim: user_metadata
  // can be rewritten by the logged-in user via supabase.auth.updateUser and
  // must never influence authorization. A self-claim of "customer" (the
  // lowest privilege) is also accepted to spare DB lookups; anything higher
  // must be proven by app_metadata or database rows below.
  const trustedMetadataRole =
    normalizeAppRole((user?.app_metadata as Record<string, unknown> | undefined)?.role) ??
    (normalizeAppRole(user?.user_metadata.role) === "customer" ? ("customer" as AppRole) : null);
  let role = trustedMetadataRole ?? "customer";
  let profile: ProfileAuthShape | null = null;

  if (user && !trustedMetadataRole) {
    // Server-only allowlist. NEXT_PUBLIC_ADMIN_EMAILS is intentionally not
    // consulted: public env vars must never influence authorization.
    const adminEmails = (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);
    const email = (user.email ?? "").toLowerCase();

    if (adminEmails.includes(email)) {
      role = "admin";
    } else {
      // Check agency_partners table first
      const apResult = await supabase.from("agency_partners").select("id, status").eq("user_id", user.id).maybeSingle();
      if (apResult.data) {
        role = "agency_partner";
      } else {
        const profileResult = await supabase.from("profiles").select("role, kyc_status, active, is_active, mobile, pincode").eq("id", user.id).maybeSingle();
        if (profileResult.error) {
          const fallbackProfileResult = await supabase.from("profiles").select("role, kyc_status, mobile, pincode").eq("id", user.id).maybeSingle();
          profile = (fallbackProfileResult.data as ProfileAuthShape | null) ?? null;
        } else {
          profile = (profileResult.data as ProfileAuthShape | null) ?? null;
        }
        const profileRole = normalizeAppRole(profile?.role);

        if (profileRole) {
          role = profileRole;
        } else {
          const { data: portalUser } = await supabase.from("users").select("role").eq("id", user.id).maybeSingle();
          role = normalizeAppRole(portalUser?.role) ?? "customer";
        }
      }
    }
  }

  // AP active check
  let isAPActive = true;

  if (user && role === "agency_partner") {
    // Check new agency_partners table
    const { data: apRecord } = await supabase
      .from("agency_partners")
      .select("id, status, kyc_status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (apRecord) {
      const ap = apRecord as { id: string; status: string; kyc_status: string };
      isAPActive = ap.status === "active" && ap.kyc_status === "approved";
    } else {
      // Fallback: check legacy profiles
      if (!profile) {
        const profileResult = await supabase.from("profiles").select("role, kyc_status, active, is_active").eq("id", user.id).maybeSingle();
        if (profileResult.error) {
          const fallbackProfileResult = await supabase.from("profiles").select("role, kyc_status").eq("id", user.id).maybeSingle();
          profile = (fallbackProfileResult.data as ProfileAuthShape | null) ?? null;
        } else {
          profile = (profileResult.data as ProfileAuthShape | null) ?? null;
        }
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

  // AP login route
  if (user && matchesRoute(pathname, "/ap/login")) {
    const url = request.nextUrl.clone();
    url.pathname = role === "agency_partner" && isAPActive ? "/ap/dashboard" : "/unauthorized";
    return NextResponse.redirect(url);
  }

  if (user && matchesRoute(pathname, "/login/customer")) {
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

    // Secure smart redirect for agency partners attempting to access customer apply workflow
    if (role === "agency_partner" && matchesRoute(pathname, "/apply")) {
      const slug = pathname.replace("/apply/", "").replace("/apply", "");
      url.pathname = "/ap/applications/new";
      url.search = "";
      if (slug) {
        url.searchParams.set("serviceId", slug);
      }
      return NextResponse.redirect(url);
    }

    url.pathname = (matchesRoute(pathname, "/ap") || matchesRoute(pathname, "/agent")) ? "/unauthorized" : getRoleHome(role);
    return NextResponse.redirect(url);
  }

  if (user && matchesRoute(pathname, "/ap") && !isAPActive) {
    const url = request.nextUrl.clone();
    url.pathname = "/unauthorized";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
