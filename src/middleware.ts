import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { getSupabaseUrl } from "@/lib/supabase/config";

const protectedRoutes = ["/dashboard", "/customer", "/admin", "/agent", "/staff", "/apply"];
const authRoutes = ["/login", "/login/agent", "/login/customer", "/login/staff", "/admin-login", "/agent-login", "/customer-login", "/super-admin-login"];

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
    return "/agent/dashboard";
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

function isMissingActiveColumn(errorMessage: string) {
  const normalized = errorMessage.toLowerCase();

  return normalized.includes("active") && (normalized.includes("does not exist") || normalized.includes("could not find"));
}

function getLoginPathForProtectedRoute(pathname: string) {
  if (matchesRoute(pathname, "/agent")) {
    return "/login/agent";
  }

  if (matchesRoute(pathname, "/staff")) {
    return "/login/staff";
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

  let isAgentActive = true;

  if (user && role === "agent") {
    const { data: profile, error: profileError } = await supabase.from("profiles").select("role, active").eq("id", user.id).maybeSingle();
    let activeColumnMissing = false;
    let resolvedProfile = profile as { role?: string | null; active?: boolean | null } | null;

    if (profileError) {
      console.error("[middleware:agent-auth] Profile lookup failed.", { userId: user.id, error: profileError.message });

      if (isMissingActiveColumn(profileError.message)) {
        activeColumnMissing = true;
        const { data: roleOnlyProfile, error: roleOnlyError } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();

        if (roleOnlyError) {
          console.error("[middleware:agent-auth] Role-only profile lookup failed.", { userId: user.id, error: roleOnlyError.message });
        }

        resolvedProfile = roleOnlyProfile;
      }
    }

    if (!resolvedProfile) {
      console.error("[middleware:agent-auth] Agent profile missing.", { userId: user.id });
      isAgentActive = false;
    } else if (String(resolvedProfile.role ?? "").toLowerCase() !== "agent") {
      console.error("[middleware:agent-auth] Profile role is not agent.", { userId: user.id, role: resolvedProfile.role });
      isAgentActive = false;
    } else if (activeColumnMissing) {
      console.error("[middleware:agent-auth] profiles.active column is missing; allowing active agent by role.", { userId: user.id });
      isAgentActive = true;
    } else {
      isAgentActive = resolvedProfile.active === true;

      if (!isAgentActive) {
        console.error("[middleware:agent-auth] Agent profile inactive.", {
          userId: user.id,
          active: resolvedProfile.active,
        });
      }
    }
  }

  if (user && matchesRoute(pathname, "/login/agent")) {
    const url = request.nextUrl.clone();
    url.pathname = role === "agent" && isAgentActive ? "/agent/dashboard" : "/unauthorized";
    return NextResponse.redirect(url);
  }

  if (user && matchesRoute(pathname, "/login/staff")) {
    const url = request.nextUrl.clone();
    url.pathname = role === "staff" ? "/staff/dashboard" : "/unauthorized";
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
    url.pathname = matchesRoute(pathname, "/agent") || matchesRoute(pathname, "/staff") ? "/unauthorized" : getRoleHome(role);
    return NextResponse.redirect(url);
  }

  if (user && matchesRoute(pathname, "/agent") && !isAgentActive) {
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
