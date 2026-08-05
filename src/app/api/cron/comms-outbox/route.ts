import { NextResponse } from "next/server";

import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { processCommunicationOutbox } from "@/lib/communications/processor";
import { resolveCommsCronSecret, secretsEqual } from "@/lib/communications/secrets";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Protected outbox processor.
 * Auth: Authorization: Bearer <COMMS_CRON_SECRET|CRON_SECRET> only.
 * Rejects query/body/cookie secrets. No default secret.
 * NOT registered in vercel.json — do not activate without approval.
 */
export async function POST(request: Request) {
  const rate = checkRateLimit(`comms-cron:${getClientIp(request)}`, 30, 60_000);
  if (!rate.ok) return rateLimitResponse(rate.retryAfter);

  const url = new URL(request.url);
  if (url.searchParams.has("secret") || url.searchParams.has("token") || url.searchParams.has("key")) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const resolved = resolveCommsCronSecret();
  if (!resolved.ok) {
    return NextResponse.json({ ok: false, error: "Scheduler not configured." }, { status: 503 });
  }

  const auth = request.headers.get("authorization") || "";
  const match = /^Bearer\s+(\S+)$/i.exec(auth);
  const provided = match?.[1] ?? "";
  if (!provided || !secretsEqual(provided, resolved.secret)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  // Do not read or log Authorization / body secrets.
  const summary = await processCommunicationOutbox({
    batchSize: 15,
    timeBudgetMs: 18_000,
  });

  console.info("[comms-cron] processed", {
    claimed: summary.claimed,
    sent: summary.sent,
    retryable: summary.retryable,
    failed: summary.failed,
    configurationRequired: summary.configurationRequired,
    cancelled: summary.cancelled,
  });

  return NextResponse.json({
    ok: true,
    summary: {
      claimed: summary.claimed,
      sent: summary.sent,
      retryable: summary.retryable,
      failed: summary.failed,
      configurationRequired: summary.configurationRequired,
      cancelled: summary.cancelled,
      errors: summary.errors,
    },
  });
}
