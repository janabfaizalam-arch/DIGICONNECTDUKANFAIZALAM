import { NextResponse } from "next/server";

import { CRON_ACTOR, authorizeCron } from "@/lib/content-engine/cron";
import { failureResponse } from "@/lib/content-engine/api";
import { publishDue } from "@/lib/content-engine/publish-runner";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Publish what is due, and refuse everything else.
 *
 * This is the only scheduled job in the system that can reach the public, and
 * it is the shortest one on purpose: find the due rows, hand each to the
 * publish runner, report what happened. Every decision about whether a
 * particular post may go out is made in `publishing-guard.ts`, which this job
 * cannot bypass and does not try to.
 *
 * Nothing unapproved publishes here. Nothing sarkari publishes here without a
 * named human having approved it and every critical claim having a source.
 * Those refusals come back as SKIPPED with a reason, which is a normal
 * outcome for this job rather than an error.
 */
export async function POST(request: Request) {
  const denied = await authorizeCron(request, "publish");
  if (denied) return denied;

  try {
    const attempts = await publishDue({ actor: CRON_ACTOR, now: new Date(), limit: 20 });

    const summary = {
      published: attempts.filter((attempt) => attempt.status === "PUBLISHED").length,
      skipped: attempts.filter((attempt) => attempt.status === "SKIPPED").length,
      failed: attempts.filter((attempt) => attempt.status === "FAILED").length,
      configurationRequired: attempts.filter((attempt) => attempt.status === "CONFIGURATION_REQUIRED").length,
    };

    console.info("[content-publish-cron] finished", summary);

    return NextResponse.json({ ok: true, summary, attempts });
  } catch (caught) {
    return failureResponse(caught);
  }
}

/**
 * Vercel's scheduler issues a GET.
 *
 * This one is deliberately absent from `vercel.json`, unlike the engine's
 * four other jobs. Those only create ideas and read numbers; this is the one
 * that can reach a public account, and scheduling it is a decision the shop's
 * owner makes rather than one that arrives with a deployment. Add
 * `{"path": "/api/cron/content-publish", "schedule": "0,30 * * * *"}` to
 * `vercel.json` when automatic publishing is actually wanted.
 *
 * Nothing is lost in the meantime: the Calendar screen's "Abhi publish"
 * button runs exactly this code path, through the same gate.
 */
export async function GET(request: Request) {
  return POST(request);
}
