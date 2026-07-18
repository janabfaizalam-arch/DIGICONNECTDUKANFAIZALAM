import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { getSupabaseUrl } from "@/lib/supabase/config";

type AppRole = "admin" | "agency_partner" | "customer";

const protectedPrefixes = ["/customer", "/admin", "/ap", "/dashboard", "/apply"];
const publicAuthRoutes = [
  "/customer/login",
  "/customer/signup",
  "/customer/forgot-pin",
  "/ap/login",
  "/ap/forgot-password",
  "/ap/reset-password",
  "/admin/login",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/admin-login",
  "/customer-login",
];

function matchesRoute(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(`${route}/`);
}

function normalizeAppRole(role: unknown): AppRole | null {
  const value = String(role ?? "").toLowerCase();
  if (value === "admin" || value === "super_admin") return "admin";
  if (value === "agency_partner" || value === "agent") return "agency_partner";
  if (value === "customer") return "customer";
  return null;
}

function getRoleHome(role: AppRole) {
  if (role === "admin") return "/admin";
  if (role === "agency_partner") return "/ap/dashboard";
  return "/customer/dashboard";
}

function isPublicAuthRoute(pathname: string) {
  return publicAuthRoutes.some((route) => matchesRoute(pathname, route));
}

function isProtected(pathname: string) {
  if (isPublicAuthRoute(pathname)) return false;
  return protectedPrefixes.some((route) => matchesRoute(pathname, route));
}

function getLoginPath(pathname: string) {
  if (matchesRoute(pathname, "/ap")) return "/ap/login";
  if (matchesRoute(pathname, "/admin")) return "/admin/login";
  return "/customer/login";
}

function isAllowedForPath(pathname: string, role: AppRole) {
  if (matchesRoute(pathname, "/admin")) return role === "admin";
  if (matchesRoute(pathname, "/ap")) return role === "agency_partner";
  if (matchesRoute(pathname, "/customer") || matchesRoute(pathname, "/dashboard") || matchesRoute(pathname, "/apply")) {
    return role === "customer";
  }
  return true;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Legacy redirects
  if (pathname === "/login" || pathname === "/login/customer" || pathname === "/customer-login") {
    return NextResponse.redirect(new URL("/customer/login", request.url));
  }
  if (pathname === "/signup") {
    return NextResponse.redirect(new URL("/customer/signup", request.url));
  }
  if (pathname === "/admin-login") {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    return NextResponse.redirect(new URL("/customer/dashboard", request.url));
  }
  if (pathname.startsWith("/agent")) {
    const target = pathname.replace(/^\/agent/, "/ap") || "/ap/dashboard";
    return NextResponse.redirect(new URL(target, request.url));
  }

  const needsAuth = isProtected(pathname);
  const isAuthPage = isPublicAuthRoute(pathname);

  if (!needsAuth && !isAuthPage) {
    return NextResponse.next();
  }

  const supabaseUrl = getSupabaseUrl();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    if (needsAuth) {
      return NextResponse.redirect(new URL(getLoginPath(pathname), request.url));
    }
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && needsAuth) {
    return NextResponse.redirect(new URL(getLoginPath(pathname), request.url));
  }

  if (!user) {
    return response;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, account_status, active")
    .eq("id", user.id)
    .maybeSingle();

  const role =
    normalizeAppRole(profile?.role) ??
    normalizeAppRole((user.app_metadata as Record<string, unknown> | undefined)?.role) ??
    "customer";

  const status = String(profile?.account_status ?? "active");
  if ((status === "blocked" || status === "suspended" || profile?.active === false) && needsAuth) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL(getLoginPath(pathname), request.url));
  }

  if (isAuthPage) {
    return NextResponse.redirect(new URL(getRoleHome(role), request.url));
  }

  if (!isAllowedForPath(pathname, role)) {
    return NextResponse.redirect(new URL(getRoleHome(role), request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
