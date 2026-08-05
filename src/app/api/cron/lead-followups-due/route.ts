import { NextResponse } from "next/server";

import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { scanLeadFollowupsDue } from "@/lib/automation/producers/followup-due";
import { resolveCommsCronSecret, secretsEqual } from "@/lib/communications/secrets";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Lead follow-up due scanner.
 * Auth: Authorization: Bearer <COMMS_CRON_SECRET|CRON_SECRET> only.
 * Rejects query/body/cookie secrets. NOT registered in vercel.json.
 */
export async function POST(request: Request) {
  const rate = checkRateLimit(`followup-due-cron:${getClientIp(request)}`, 30, 60_000);
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
  if (!match?.[1] || !secretsEqual(match[1], resolved.secret)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const summary = await scanLeadFollowupsDue({
    batchSize: 50,
    lookbackHours: 72,
    processInline: true,
  });

  console.info("[followup-due-cron] scanned", {
    scanned: summary.scanned,
    due: summary.due,
    emitted: summary.emitted,
    skipped: summary.skipped,
  });

  return NextResponse.json({
    ok: true,
    summary: {
      scanned: summary.scanned,
      due: summary.due,
      emitted: summary.emitted,
      skipped: summary.skipped,
      errorCount: summary.errors.length,
    },
  });
}
