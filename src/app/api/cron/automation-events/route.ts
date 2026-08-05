import { NextResponse } from "next/server";

import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { processAutomationEvents } from "@/lib/automation/processor";
import { resolveCommsCronSecret, secretsEqual } from "@/lib/communications/secrets";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Protected automation event processor. NOT in vercel.json. Header auth only. */
export async function POST(request: Request) {
  const rate = checkRateLimit(`automation-cron:${getClientIp(request)}`, 30, 60_000);
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

  const summary = await processAutomationEvents({ batchSize: 15, timeBudgetMs: 18_000 });
  console.info("[automation-cron] processed", {
    claimed: summary.claimed,
    completed: summary.completed,
    failed: summary.failed,
  });

  return NextResponse.json({
    ok: true,
    summary: {
      claimed: summary.claimed,
      completed: summary.completed,
      retryable: summary.retryable,
      failed: summary.failed,
      actionsCompleted: summary.actionsCompleted,
      actionsSkipped: summary.actionsSkipped,
      errors: summary.errors,
    },
  });
}
