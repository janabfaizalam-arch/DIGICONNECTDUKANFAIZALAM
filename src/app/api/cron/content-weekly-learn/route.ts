import { NextResponse } from "next/server";

import { logActivity } from "@/lib/content-engine/activity";
import { CRON_ACTOR, authorizeCron } from "@/lib/content-engine/cron";
import { failureResponse } from "@/lib/content-engine/api";
import {
  EMPTY_METRICS,
  addMetrics,
  metricsFromRow,
  performanceScore,
  type PostPerformance,
} from "@/lib/content-engine/analytics";
import { learn } from "@/lib/content-engine/engines/learn";
import { istHourOf } from "@/lib/content-engine/scheduler";
import * as repo from "@/lib/content-engine/repository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Sunday night: read the week, and leave a note for Monday's mine.
 *
 * This is where the loop closes. The saved summary is what the Monday mine
 * reads as its performance note, so what actually brought people to the
 * counter this week decides what gets written next week. Without this job the
 * engine is a content generator; with it, it learns from this shop rather
 * than from what a model assumes about shops.
 */
export async function POST(request: Request) {
  const denied = await authorizeCron(request, "weekly-learn");
  if (denied) return denied;

  try {
    const [posts, analytics] = await Promise.all([
      repo.listPosts({ status: ["PUBLISHED", "ANALYZED"], limit: 300 }),
      repo.listAnalytics(),
    ]);

    const byPost = new Map<string, ReturnType<typeof metricsFromRow>>();
    for (const row of analytics) {
      byPost.set(row.contentPostId, addMetrics(byPost.get(row.contentPostId) ?? EMPTY_METRICS, metricsFromRow(row)));
    }

    const performances: PostPerformance[] = posts.map((post) => {
      const metrics = byPost.get(post.id) ?? EMPTY_METRICS;
      return {
        postId: post.id,
        topic: post.masterTopic,
        category: post.masterTopic,
        hook: post.hook,
        format: post.contentType,
        platforms: [],
        publishedAt: post.publishedAt,
        publishedHour: post.publishedAt ? istHourOf(post.publishedAt) : null,
        metrics,
        score: performanceScore(metrics),
      };
    });

    if (!performances.length) {
      return NextResponse.json({ ok: true, skipped: "Nothing has been published yet." });
    }

    const result = await learn(performances);
    const dates = performances.map((post) => (post.publishedAt ? Date.parse(post.publishedAt) : Date.now()));

    await repo.saveLearning({
      periodStart: new Date(Math.min(...dates)).toISOString(),
      periodEnd: new Date().toISOString(),
      postsAnalyzed: performances.length,
      comparison: result.comparison,
      summary: result.summary,
      winningTopics: result.winningTopics,
      winningHooks: result.winningHooks,
      winningFormats: result.winningFormats,
      winningCtas: result.winningCtas,
      winningTimes: result.winningTimes,
      weakTopics: result.weakTopics,
      weakHooks: result.weakHooks,
      weakFormats: result.weakFormats,
    });

    await logActivity({
      entity: "analytics",
      entityId: null,
      action: "cron:weekly-learn",
      actor: CRON_ACTOR,
      detail: `${performances.length} posts analysed.`,
    });

    return NextResponse.json({ ok: true, postsAnalyzed: performances.length, summary: result.summary });
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
