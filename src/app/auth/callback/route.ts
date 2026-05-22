import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { getCurrentUserRole, getRoleHome, isCustomerRole, syncUserProfile } from "@/lib/auth";
import { parsePendingCustomerOAuthData, pendingCustomerOAuthCookie } from "@/lib/customer-oauth";
import { attachReferralOnSignup, validateReferralCode } from "@/lib/referrals";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
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

function isFirstSocialCustomerSignIn(user: {
  app_metadata?: { provider?: string };
  created_at?: string;
  last_sign_in_at?: string;
}) {
  const provider = String(user.app_metadata?.provider ?? "").toLowerCase();
  const createdAt = Date.parse(String(user.created_at ?? ""));
  const lastSignInAt = Date.parse(String(user.last_sign_in_at ?? ""));

  return (
    (provider === "google" || provider === "facebook") &&
    Number.isFinite(createdAt) &&
    Number.isFinite(lastSignInAt) &&
    Math.abs(lastSignInAt - createdAt) < 60_000
  );
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");
  const next = requestUrl.searchParams.get("next");
  const referralCode = String(requestUrl.searchParams.get("ref") ?? "").trim().toUpperCase();

  if (error) {
    return NextResponse.redirect(new URL("/login/customer?error=oauth", requestUrl.origin));
  }

  if (!code) {
    return redirectHashTokensToNext(next);
  }

  const supabase = await getSupabaseRouteHandlerClient();

  if (!supabase) {
    return NextResponse.redirect(new URL("/login/customer?error=oauth", requestUrl.origin));
  }

  const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError || !data.user) {
    return NextResponse.redirect(new URL("/login/customer?error=oauth", requestUrl.origin));
  }

  const cookieStore = await cookies();
  const pendingCustomerOAuth = parsePendingCustomerOAuthData(cookieStore.get(pendingCustomerOAuthCookie)?.value);

  if (!pendingCustomerOAuth && isFirstSocialCustomerSignIn(data.user)) {
    await supabase.auth.signOut();
    const supabaseAdmin = getSupabaseAdmin();
    if (supabaseAdmin) {
      await supabaseAdmin.auth.admin.deleteUser(data.user.id).catch((deleteError) => {
        console.warn("[auth/callback] New OAuth user cleanup failed after missing signup details.", {
          userId: data.user.id,
          error: deleteError,
        });
      });
    }

    const loginUrl = new URL("/login/customer", requestUrl.origin);
    loginUrl.searchParams.set("error", "oauth_signup_details");
    if (next) {
      loginUrl.searchParams.set("redirect", getSafeNext(next));
    }
    return NextResponse.redirect(loginUrl);
  }

  await syncUserProfile(data.user, pendingCustomerOAuth);

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
  const destination = next
    ? getSafeNext(next)
    : isCustomerRole(role)
      ? "/customer/dashboard"
      : getRoleHome(role);

  const response = NextResponse.redirect(new URL(destination, requestUrl.origin));
  response.cookies.delete({ name: pendingCustomerOAuthCookie, path: "/auth" });
  return response;
}
