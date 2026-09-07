import "server-only";

import { NextResponse } from "next/server";

import { actorFrom } from "@/lib/content-engine/activity";
import { describeAiFailure } from "@/lib/content-engine/ai/generate";
import { ExternalError } from "@/lib/content-engine/errors";
import {
  ContentEngineNotInstalledError,
  ContentEngineUnavailableError,
} from "@/lib/content-engine/repository";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

/**
 * The three lines every content engine route starts with.
 *
 * Admin session, rate limit, and a single place that turns a thrown error
 * into a response. Repeating those in fourteen route files is how one of them
 * ends up missing the admin check — and the routes here can spend money and
 * write to a public account, so that is not a check to leave to discipline.
 */

export type Actor = { actor: string; email: string | null };

export type GuardFailure = { ok: false; response: NextResponse };
export type GuardSuccess = { ok: true; actor: string };

/**
 * Rate limits, per action, per IP.
 *
 * Generation costs money per call, so it is limited far harder than reading a
 * list. The numbers are per minute and are set where an administrator working
 * quickly never meets them and a loop does within seconds.
 */
export const RATE_LIMITS = {
  read: { limit: 120, windowMs: 60_000 },
  write: { limit: 60, windowMs: 60_000 },
  generate: { limit: 12, windowMs: 60_000 },
  publish: { limit: 20, windowMs: 60_000 },
} as const;

export type RateKind = keyof typeof RATE_LIMITS;

export async function requireAdmin(request: Request, kind: RateKind): Promise<GuardSuccess | GuardFailure> {
  const { limit, windowMs } = RATE_LIMITS[kind];
  const rate = checkRateLimit(`content-engine:${kind}:${getClientIp(request)}`, limit, windowMs);
  if (!rate.ok) return { ok: false, response: rateLimitResponse(rate.retryAfter) };

  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  if (!user || !isAdminRole(role)) {
    return { ok: false, response: NextResponse.json({ error: "Not allowed." }, { status: 403 }) };
  }

  return { ok: true, actor: actorFrom(user) };
}

/**
 * Whatever went wrong, as something a screen can render.
 *
 * The four cases are told apart because the admin's next action differs:
 * run the migration, set an environment variable, wait, or report a bug.
 * Nothing here ever puts a raw upstream message in the body — those can carry
 * a URL with a token in it.
 */
export function failureResponse(caught: unknown): NextResponse {
  if (caught instanceof ContentEngineNotInstalledError) {
    return NextResponse.json({ error: caught.message, code: "not_installed" }, { status: 409 });
  }
  if (caught instanceof ContentEngineUnavailableError) {
    return NextResponse.json({ error: caught.message, code: "unavailable" }, { status: 503 });
  }
  if (caught instanceof ExternalError) {
    const detail = caught.toPublic();
    const status = detail.failure === "not_configured" ? 503 : detail.failure === "rate_limited" ? 429 : 502;
    return NextResponse.json({ error: detail.message, code: detail.failure }, { status });
  }

  const described = describeAiFailure(caught);
  if (described.failure === "invalid_content") {
    return NextResponse.json({ error: described.message, code: described.failure }, { status: 422 });
  }

  console.error("[content-engine] route failed", {
    detail: caught instanceof Error ? caught.message : String(caught),
  });
  return NextResponse.json(
    { error: caught instanceof Error ? caught.message : "Something went wrong.", code: "error" },
    { status: 500 },
  );
}

/** Read a JSON body, or say plainly that it could not be read. */
export async function readJson<T = Record<string, unknown>>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

export function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 });
}
