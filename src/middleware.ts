import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { getSupabaseUrl } from "@/lib/supabase/config";

const protectedRoutes = ["/dashboard", "/customer", "/admin", "/agent", "/apply"];
const authRoutes = ["/login", "/login/agent", "/login/customer", "/admin-login", "/agent-login", "/customer-login"];
const removedRoleRoutes = ["/staff", "/team", "/employee", "/super-admin", "/super-admin-login", "/login/staff"];

type AppRole = "admin" | "agent" | "customer";

const appRoles: AppRole[] = ["admin", "agent", "customer"];
const adminRoleAliases = new Set(["super_admin", "staff", "team", "employee", "processor"]);

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

  return appRoles.includes(value as AppRole) ? (value as AppRole) : null;
}

function getRoleHome(role: AppRole) {
  if (role === "admin") {
    return "/admin";
  }

  if (role === "agent") {
    return "/agent/dashboard";
  }

  return "/customer/dashboard";
}

function isAllowedForPath(pathname: string, role: AppRole) {
  if (matchesRoute(pathname, "/admin")) {
    return role === "admin";
  }

  if (matchesRoute(pathname, "/agent")) {
    return role === "agent";
  }

  if (matchesRoute(pathname, "/dashboard") || matchesRoute(pathname, "/customer")) {
    return role === "customer";
  }

  return true;
}

function getLoginPathForProtectedRoute(pathname: string) {
  if (matchesRoute(pathname, "/agent")) {
    return "/login/agent";
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
  if (removedRoleRoutes.some((route) => matchesRoute(pathname, route))) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin-login";
    url.search = "";
    return NextResponse.redirect(url);
  }

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

  let role = normalizeAppRole(user?.user_metadata.role) ?? "customer";
  let profile: ProfileAuthShape | null = null;

  if (user && !normalizeAppRole(user.user_metadata.role)) {
    const adminEmails = (process.env.ADMIN_EMAILS ?? process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);
    const email = (user.email ?? "").toLowerCase();

    if (adminEmails.includes(email)) {
      role = "admin";
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

  if (user && role === "customer") {
    if (!profile) {
      const profileResult = await supabase
        .from("profiles")
        .select("role, kyc_status, active, is_active, mobile, pincode")
        .eq("id", user.id)
        .maybeSingle();
      if (!profileResult.error) {
        profile = (profileResult.data as ProfileAuthShape | null) ?? null;
      }
    }

    const isOnboardingPath = pathname === "/customer/onboarding";
    const isIncomplete = !profile?.mobile || !profile?.pincode;

    if (isIncomplete && !isOnboardingPath && isProtectedRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/customer/onboarding";
      return NextResponse.redirect(url);
    }

    if (!isIncomplete && isOnboardingPath) {
      const url = request.nextUrl.clone();
      url.pathname = "/customer/dashboard";
      return NextResponse.redirect(url);
    }
  }

  let isAgentActive = true;

  if (user && role === "agent") {
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
      console.error("[middleware:agent-auth] Agent profile missing.", { userId: user.id });
      isAgentActive = false;
    } else if (normalizeAppRole(profile.role) !== "agent") {
      console.error("[middleware:agent-auth] Profile role is not agent.", { userId: user.id, role: profile.role });
      isAgentActive = false;
    } else if (String(profile.kyc_status ?? "").toLowerCase() !== "approved") {
      console.error("[middleware:agent-auth] Agent KYC is not approved.", { userId: user.id, kycStatus: profile.kyc_status });
      isAgentActive = false;
    } else {
      const activeChecks = [profile.active, profile.is_active].filter((value) => typeof value === "boolean");
      isAgentActive = activeChecks.every((value) => value === true);

      if (!isAgentActive) {
        console.error("[middleware:agent-auth] Agent profile inactive.", {
          userId: user.id,
          active: typeof profile.active === "boolean" ? profile.active : "missing",
          is_active: typeof profile.is_active === "boolean" ? profile.is_active : "missing",
        });
      }
    }
  }

  if (user && matchesRoute(pathname, "/login/agent")) {
    const url = request.nextUrl.clone();
    url.pathname = role === "agent" && isAgentActive ? "/agent/dashboard" : "/unauthorized";
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
    url.pathname = matchesRoute(pathname, "/agent") ? "/unauthorized" : getRoleHome(role);
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
