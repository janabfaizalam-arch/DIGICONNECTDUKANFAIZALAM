import { NextResponse } from "next/server";

import { getCurrentUserRole, getRoleHome, isCustomerRole, syncUserProfile } from "@/lib/auth";
import { getSupabaseRouteHandlerClient } from "@/lib/supabase/server";

function getSafeCustomerRedirect(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  if (
    value.startsWith("/admin") ||
    value.startsWith("/agent") ||
    value.startsWith("/staff") ||
    value.startsWith("/login") ||
    value.startsWith("/admin-login") ||
    value.startsWith("/super-admin-login")
  ) {
    return "/";
  }

  return value;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");
  const next = requestUrl.searchParams.get("next");

  if (error) {
    return NextResponse.redirect(new URL("/login?error=oauth", requestUrl.origin));
  }

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", requestUrl.origin));
  }

  const supabase = await getSupabaseRouteHandlerClient();

  if (!supabase) {
    return NextResponse.redirect(new URL("/login?error=oauth", requestUrl.origin));
  }

  const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError || !data.user) {
    return NextResponse.redirect(new URL("/login?error=oauth", requestUrl.origin));
  }

  await syncUserProfile(data.user);
  const role = await getCurrentUserRole(data.user);
  const destination = isCustomerRole(role) ? getSafeCustomerRedirect(next) : getRoleHome(role);

  return NextResponse.redirect(new URL(destination, requestUrl.origin));
}
