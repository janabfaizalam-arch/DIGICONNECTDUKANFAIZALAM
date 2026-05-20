import { NextResponse } from "next/server";

import { getCurrentUserRole, getRoleHome, isCustomerRole, syncUserProfile } from "@/lib/auth";
import { attachReferralOnSignup, validateReferralCode } from "@/lib/referrals";
import { getSupabaseRouteHandlerClient } from "@/lib/supabase/server";

function getSafeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  return value;
}

function redirectHashTokensToNext(next: string | null) {
  const destination = getSafeNext(next);

  return new NextResponse(
    `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Redirecting...</title>
  </head>
  <body>
    <p>Redirecting...</p>
    <script>
      const nextPath = ${JSON.stringify(destination)};
      const hash = window.location.hash || "";
      window.location.replace(nextPath + hash);
    </script>
  </body>
</html>`,
    {
      headers: {
        "content-type": "text/html; charset=utf-8",
      },
    },
  );
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");
  const next = requestUrl.searchParams.get("next");
  const referralCode = String(requestUrl.searchParams.get("ref") ?? "").trim().toUpperCase();

  if (error) {
    return NextResponse.redirect(new URL("/login?error=oauth", requestUrl.origin));
  }

  if (!code) {
    return redirectHashTokensToNext(next);
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

  if (referralCode) {
    const validation = await validateReferralCode(referralCode, data.user.id).catch(() => ({ ok: false }));

    if (validation.ok) {
      await attachReferralOnSignup(
        data.user.id,
        referralCode,
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip"),
        request.headers.get("user-agent"),
      ).catch((referralError) => {
        console.error("[auth/callback] Referral attachment failed", referralError);
      });
    }
  }

  const role = await getCurrentUserRole(data.user);
  const destination = next ? getSafeNext(next) : isCustomerRole(role) ? "/customer/dashboard" : getRoleHome(role);

  return NextResponse.redirect(new URL(destination, requestUrl.origin));
}
