import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { getSupabaseUrl } from "@/lib/supabase/config";

type AppRole = "admin" | "agency_partner" | "customer";

const protectedPrefixes = ["/customer", "/admin", "/ap"];
const authRoutes = ["/login", "/signup", "/ap/login", "/forgot-password", "/reset-password", "/ap/forgot-password", "/ap/reset-password"];

function matchesRoute(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(`${route}/`);
}

function normalizeAppRole(role: unknown): AppRole | null {
  const value = String(role ?? "").toLowerCase();
  if (value === "admin") return "admin";
  if (value === "agency_partner" || value === "agent") return "agency_partner";
  if (value === "customer") return "customer";
  return null;
}

function getRoleHome(role: AppRole) {
  if (role === "admin") return "/admin";
  if (role === "agency_partner") return "/ap/dashboard";
  return "/customer/dashboard";
}

function isAllowedForPath(pathname: string, role: AppRole) {
  if (matchesRoute(pathname, "/admin")) return role === "admin";
  if (matchesRoute(pathname, "/ap")) {
    if (matchesRoute(pathname, "/ap/login") || matchesRoute(pathname, "/ap/forgot-password") || matchesRoute(pathname, "/ap/reset-password")) {
      return true;
    }
    return role === "agency_partner";
  }
  if (matchesRoute(pathname, "/customer")) return role === "customer";
  return true;
}

function getLoginPath(pathname: string) {
  if (matchesRoute(pathname, "/ap")) return "/ap/login";
  return "/login";
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Legacy redirects
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    return NextResponse.redirect(new URL("/customer/dashboard", request.url));
  }
  if (pathname.startsWith("/agent")) {
    return NextResponse.redirect(new URL(pathname.replace(/^\/agent/, "/ap") || "/ap/dashboard", request.url));
  }
  if (pathname === "/login/customer" || pathname === "/customer-login" || pathname === "/admin-login") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const isProtected = protectedPrefixes.some((route) => matchesRoute(pathname, route))
    && !matchesRoute(pathname, "/ap/login")
    && !matchesRoute(pathname, "/ap/forgot-password")
    && !matchesRoute(pathname, "/ap/reset-password");
  const isAuthRoute = authRoutes.some((route) => matchesRoute(pathname, route));

  if (!isProtected && !isAuthRoute) {
    return NextResponse.next();
  }

  const supabaseUrl = getSupabaseUrl();
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    if (isProtected) {
      return NextResponse.redirect(new URL(getLoginPath(pathname), request.url));
    }
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
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

  if (!user && isProtected) {
    return NextResponse.redirect(new URL(getLoginPath(pathname), request.url));
  }

  if (!user) {
    return response;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, active")
    .eq("id", user.id)
    .maybeSingle();

  const role =
    normalizeAppRole(profile?.role) ??
    normalizeAppRole((user.app_metadata as Record<string, unknown> | undefined)?.role) ??
    "customer";

  if (profile && profile.active === false && isProtected) {
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  if (isAuthRoute) {
    return NextResponse.redirect(new URL(getRoleHome(role), request.url));
  }

  if (!isAllowedForPath(pathname, role)) {
    return NextResponse.redirect(new URL(getRoleHome(role), request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
