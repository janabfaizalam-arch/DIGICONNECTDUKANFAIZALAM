import { NextResponse } from "next/server";

import { syncUserProfile } from "@/lib/auth";
import { getSupabaseRouteHandlerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");

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

  return NextResponse.redirect(new URL("/dashboard", requestUrl.origin));
}
