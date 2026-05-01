import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { getSupabaseUrl } from "@/lib/supabase/config";

const protectedRoutes = ["/dashboard", "/customer", "/admin", "/agent", "/staff", "/apply"];
const authRoutes = ["/login", "/login/customer", "/login/staff", "/admin-login", "/agent-login", "/customer-login", "/super-admin-login"];

type AppRole = "super_admin" | "admin" | "agent" | "staff" | "customer";

const appRoles = ["super_admin", "admin", "agent", "staff", "customer"];

function matchesRoute(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(`${route}/`);
}

function getRoleHome(role: AppRole) {
  if (role === "super_admin" || role === "admin") {
    return "/admin";
  }

  if (role === "agent") {
    return "/agent";
  }

  if (role === "staff") {
    return "/staff/dashboard";
  }

  return "/customer/dashboard";
}

function isAllowedForPath(pathname: string, role: AppRole) {
  if (matchesRoute(pathname, "/admin")) {
    return role === "super_admin" || role === "admin";
  }

  if (matchesRoute(pathname, "/agent")) {
    return role === "agent";
  }

  if (matchesRoute(pathname, "/staff")) {
    return role === "staff";
  }

  if (matchesRoute(pathname, "/dashboard") || matchesRoute(pathname, "/customer")) {
    return role === "customer";
  }

  return true;
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const { pathname } = request.nextUrl;
  const isProtectedRoute = protectedRoutes.some((route) => matchesRoute(pathname, route));
  const isAuthRoute = authRoutes.some((route) => matchesRoute(pathname, route));
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const supabaseUrl = getSupabaseUrl();

  if (!supabaseUrl || !supabaseAnonKey) {
    if (isProtectedRoute) {
      const url = request.nextUrl.clone();
      url.pathname = matchesRoute(pathname, "/staff") ? "/login/staff" : matchesRoute(pathname, "/customer") ? "/login/customer" : "/login";
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
    url.pathname = matchesRoute(pathname, "/staff") ? "/login/staff" : matchesRoute(pathname, "/customer") ? "/login/customer" : "/login";
    return NextResponse.redirect(url);
  }

  let role = String(user?.user_metadata.role ?? "").toLowerCase() as AppRole;

  if (user && !appRoles.includes(role)) {
    const adminEmails = (process.env.ADMIN_EMAILS ?? process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);
    const email = (user.email ?? "").toLowerCase();

    if (email === "janabfaizalam@gmail.com") {
      role = "super_admin";
    } else if (adminEmails.includes(email)) {
      role = "admin";
    } else {
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      const profileRole = String(profile?.role ?? "").toLowerCase();

      if (appRoles.includes(profileRole)) {
        role = profileRole as AppRole;
      } else {
        const { data: portalUser } = await supabase.from("users").select("role").eq("id", user.id).maybeSingle();
        const portalRole = String(portalUser?.role ?? "").toLowerCase();
        role = appRoles.includes(portalRole) ? (portalRole as AppRole) : "customer";
      }
    }
  }

  if (user && matchesRoute(pathname, "/login/staff")) {
    const url = request.nextUrl.clone();
    url.pathname = role === "staff" ? "/staff/dashboard" : "/unauthorized";
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = getRoleHome(role);
    return NextResponse.redirect(url);
  }

  if (user && isProtectedRoute && !isAllowedForPath(pathname, role)) {
    const url = request.nextUrl.clone();
    url.pathname = matchesRoute(pathname, "/staff") ? "/unauthorized" : getRoleHome(role);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
