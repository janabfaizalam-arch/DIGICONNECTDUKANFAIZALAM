import "server-only";

import { NextResponse } from "next/server";

import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { resolveCommsCronSecret, secretsEqual } from "@/lib/communications/secrets";

/**
 * How the content engine's scheduled jobs prove who they are.
 *
 * The same shared-secret arrangement the rest of this codebase uses for cron:
 * an Authorization header, never a query string. A secret in a URL ends up in
 * access logs, in browser history and in referrer headers, and one of these
 * endpoints publishes to a public account.
 */
export async function authorizeCron(request: Request, name: string): Promise<NextResponse | null> {
  const rate = checkRateLimit(`content-cron:${name}:${getClientIp(request)}`, 30, 60_000);
  if (!rate.ok) return rateLimitResponse(rate.retryAfter);

  const url = new URL(request.url);
  if (url.searchParams.has("secret") || url.searchParams.has("token")) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const resolved = resolveCommsCronSecret();
  if (!resolved.ok) {
    return NextResponse.json({ ok: false, error: "Scheduler not configured." }, { status: 503 });
  }

  const auth = request.headers.get("authorization") || "";
  const match = /^Bearer\s+(\S+)$/i.exec(auth);
  if (!match?.[1] || !secretsEqual(match[1], resolved.secret)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  return null;
}

/** The actor name recorded in the activity log for work nobody asked for. */
export const CRON_ACTOR = "system:cron";
