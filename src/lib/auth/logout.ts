import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { isSupabaseAuthCookieName } from "@/lib/auth/admin-login-core";
import { ADMIN_ACCESS_TOKEN_COOKIE } from "@/lib/auth/admin-session";
import { PORTAL_CONTEXT_COOKIE } from "@/lib/auth/memberships";
import {
  inferLogoutPortal,
  resolveLogoutRedirect,
  type LogoutPortal,
} from "@/lib/auth/logout-destinations";
import {
  ACCESS_TOKEN_COOKIE as V2_CUSTOMER_ACCESS,
  REFRESH_TOKEN_COOKIE as V2_CUSTOMER_REFRESH,
} from "@/lib/auth-v2/session";
import { getSupabaseUrl } from "@/lib/supabase/config";

export type { LogoutPortal };
export { inferLogoutPortal, resolveLogoutRedirect };

export const LEGACY_CUSTOMER_ACCESS_COOKIE = "customer_access_token";
export const LEGACY_CUSTOMER_REFRESH_COOKIE = "customer_refresh_token";
export const PENDING_CUSTOMER_OAUTH_COOKIE = "digiconnect_pending_customer_oauth";

/** Exact cookie names DigiConnect auth uses (device IDs intentionally excluded). */
export const AUTH_COOKIE_CLEAR_SPECS: ReadonlyArray<{
  name: string;
  path: string;
  sameSite: "lax" | "strict";
}> = [
  { name: ADMIN_ACCESS_TOKEN_COOKIE, path: "/", sameSite: "lax" },
  { name: PORTAL_CONTEXT_COOKIE, path: "/", sameSite: "lax" },
  { name: V2_CUSTOMER_ACCESS, path: "/", sameSite: "strict" },
  { name: V2_CUSTOMER_REFRESH, path: "/api/customer-auth/refresh", sameSite: "strict" },
  { name: LEGACY_CUSTOMER_ACCESS_COOKIE, path: "/", sameSite: "lax" },
  { name: LEGACY_CUSTOMER_REFRESH_COOKIE, path: "/", sameSite: "lax" },
  { name: PENDING_CUSTOMER_OAUTH_COOKIE, path: "/auth", sameSite: "lax" },
  { name: PENDING_CUSTOMER_OAUTH_COOKIE, path: "/", sameSite: "lax" },
];

export function detectPortalFromRequestCookies(cookieNames: string[]): LogoutPortal {
  if (cookieNames.includes(ADMIN_ACCESS_TOKEN_COOKIE)) return "admin";
  if (cookieNames.includes(V2_CUSTOMER_ACCESS) || cookieNames.includes(LEGACY_CUSTOMER_ACCESS_COOKIE)) {
    return "customer";
  }
  if (cookieNames.some((name) => isSupabaseAuthCookieName(name))) return "ap";
  return "auto";
}

/** Expire a cookie with attributes that match how DigiConnect sets auth cookies. */
export function expireAuthCookie(
  response: NextResponse,
  name: string,
  options: { path?: string; sameSite?: "lax" | "strict" | "none"; secure?: boolean } = {},
) {
  const secure = options.secure ?? process.env.NODE_ENV === "production";
  response.cookies.set(name, "", {
    httpOnly: true,
    secure,
    sameSite: options.sameSite ?? "lax",
    path: options.path ?? "/",
    maxAge: 0,
    expires: new Date(0),
  });
}

export function listSupabaseAuthCookieNames(allNames: string[]): string[] {
  return allNames.filter(
    (name) => isSupabaseAuthCookieName(name) || /^sb-.+-auth-token-code-verifier$/i.test(name),
  );
}

/**
 * Clears every DigiConnect auth cookie + Supabase SSR session cookies on the response.
 * Does not log token values.
 */
export function clearAllAuthCookiesOnResponse(response: NextResponse, requestCookieNames: string[]) {
  const cleared = new Set<string>();

  for (const spec of AUTH_COOKIE_CLEAR_SPECS) {
    expireAuthCookie(response, spec.name, { path: spec.path, sameSite: spec.sameSite });
    cleared.add(`${spec.name}@${spec.path}`);
  }

  for (const name of listSupabaseAuthCookieNames(requestCookieNames)) {
    expireAuthCookie(response, name, { path: "/", sameSite: "lax" });
    cleared.add(`${name}@/`);
  }

  return Array.from(cleared);
}

export type PerformLogoutResult = {
  response: NextResponse;
  redirectTo: string;
  cleared: string[];
  portal: LogoutPortal;
  supabaseSignedOut: boolean;
};

/**
 * Canonical server logout used by POST /api/auth/logout (and thin wrappers).
 */
export async function performServerLogout(input: {
  request: NextRequest | Request;
  portal?: LogoutPortal | null;
}): Promise<PerformLogoutResult> {
  const requestCookies =
    "cookies" in input.request && typeof input.request.cookies?.getAll === "function"
      ? input.request.cookies.getAll()
      : [];
  const cookieNames = requestCookies.map((c) => c.name);

  let portal: LogoutPortal = input.portal && input.portal !== "auto" ? input.portal : "auto";
  if (portal === "auto") {
    portal = detectPortalFromRequestCookies(cookieNames);
  }

  const redirectTo = resolveLogoutRedirect(portal);
  const response = NextResponse.json(
    {
      ok: true,
      message: "Signed out successfully.",
      redirectTo,
      portal,
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, private",
        Pragma: "no-cache",
      },
    },
  );

  let supabaseSignedOut = false;
  const supabaseUrl = getSupabaseUrl();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && anonKey) {
    try {
      const supabase = createServerClient(supabaseUrl, anonKey, {
        cookies: {
          getAll() {
            return requestCookies;
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      });
      const { error } = await supabase.auth.signOut({ scope: "global" });
      if (error) {
        console.error("[auth/logout] supabase.signOut failed", {
          code: error.code,
          message: error.message,
          status: error.status,
        });
      } else {
        supabaseSignedOut = true;
      }
    } catch (err) {
      console.error("[auth/logout] supabase.signOut threw", {
        message: err instanceof Error ? err.message : "unknown",
      });
    }
  } else {
    console.error("[auth/logout] Supabase env missing; clearing custom cookies only.");
  }

  const cleared = clearAllAuthCookiesOnResponse(response, cookieNames);

  console.info("[auth/logout] completed", {
    portal,
    redirectTo,
    supabaseSignedOut,
    clearedCount: cleared.length,
    cleared,
  });

  return { response, redirectTo, cleared, portal, supabaseSignedOut };
}
