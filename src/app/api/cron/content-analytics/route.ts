import { NextResponse } from "next/server";

import { logActivity } from "@/lib/content-engine/activity";
import { CRON_ACTOR, authorizeCron } from "@/lib/content-engine/cron";
import { failureResponse } from "@/lib/content-engine/api";
import { publisherFor } from "@/lib/content-engine/publishers/adapters";
import * as repo from "@/lib/content-engine/repository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Collect what each platform will tell us about a published post.
 *
 * Most will tell us nothing until their APIs are connected, and that is
 * reported as `unsupported` rather than written into the database as zeros. A
 * row of zeros is indistinguishable from "nobody saw it", and a Learn engine
 * fed zeros will confidently conclude that everything failed.
 *
 * Posts published in the last thirty days only. A post's numbers keep moving
 * for about a fortnight and stop mattering after a month.
 */
export async function POST(request: Request) {
  const denied = await authorizeCron(request, "analytics");
  if (denied) return denied;

  try {
    const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const rows = (await repo.listSchedule({ status: ["PUBLISHED"] })).filter(
      (row) => row.externalPostId && row.scheduledAt >= since,
    );

    let collected = 0;
    let unsupported = 0;

    for (const row of rows) {
      const result = await publisherFor(row.platform).getAnalytics(row.externalPostId ?? "");
      if (!result.supported) {
        unsupported += 1;
        continue;
      }

      await repo.upsertAnalytics([
        {
          contentPostId: row.contentPostId,
          platform: row.platform,
          impressions: result.metrics.impressions ?? 0,
          reach: result.metrics.reach ?? 0,
          views: result.metrics.views ?? 0,
          likes: result.metrics.likes ?? 0,
          comments: result.metrics.comments ?? 0,
          shares: result.metrics.shares ?? 0,
          saves: result.metrics.saves ?? 0,
          clicks: result.metrics.clicks ?? 0,
          watchTimeSeconds: result.metrics.watchTimeSeconds ?? 0,
          // These four are the shop's, not the platform's. Never overwritten
          // by a collection run, because a platform does not know somebody
          // walked in — the existing values stay whatever the CRM recorded.
          enquiries: 0,
          leads: 0,
          customers: 0,
          revenue: null,
        },
      ]);
      collected += 1;
    }

    await logActivity({
      entity: "analytics",
      entityId: null,
      action: "cron:analytics",
      actor: CRON_ACTOR,
      detail: `${collected} collected, ${unsupported} platforms cannot report per-post metrics yet.`,
    });

    return NextResponse.json({ ok: true, collected, unsupported, checked: rows.length });
  } catch (caught) {
    return failureResponse(caught);
  }
}

/**
 * Vercel's scheduler issues a GET.
 *
 * The work is identical; the two verbs exist because the platform's cron
 * sends GET while a manual run or another scheduler sends POST. Both go
 * through the same shared-secret check.
 */
export async function GET(request: Request) {
  return POST(request);
}
