import { NextRequest, NextResponse } from "next/server";

import { clearAllAuthCookiesOnResponse, performServerLogout, type LogoutPortal } from "@/lib/auth/logout";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parsePortal(value: unknown): LogoutPortal {
  const raw = String(value ?? "").trim().toLowerCase();
  if (raw === "admin" || raw === "ap" || raw === "customer" || raw === "auto") {
    return raw;
  }
  return "auto";
}

/**
 * Canonical DigiConnect logout.
 * Clears Supabase SSR cookies + admin/customer JWT cookies, then returns a role-aware login URL.
 */
export async function POST(request: NextRequest) {
  let portal: LogoutPortal = "auto";
  try {
    const body = (await request.json().catch(() => ({}))) as { portal?: string };
    portal = parsePortal(body.portal);
  } catch {
    portal = "auto";
  }

  const { response } = await performServerLogout({ request, portal });
  return response;
}

/** Navigational logout (rare) — same hard clear, then 303 to role login. */
export async function GET(request: NextRequest) {
  const portal = parsePortal(request.nextUrl.searchParams.get("portal"));
  const { response: logoutJson, redirectTo } = await performServerLogout({ request, portal });

  const target = new URL(redirectTo, request.url);
  const redirect = NextResponse.redirect(target, 303);
  redirect.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, private");

  // Copy Set-Cookie mutations from the logout response onto the redirect.
  for (const cookie of logoutJson.cookies.getAll()) {
    redirect.cookies.set(cookie.name, cookie.value);
  }

  // Belt-and-suspenders: expire known auth cookies on the redirect response too.
  clearAllAuthCookiesOnResponse(
    redirect,
    request.cookies.getAll().map((c) => c.name),
  );

  return redirect;
}
