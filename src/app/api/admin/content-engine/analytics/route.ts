import { NextResponse } from "next/server";

import { logActivity } from "@/lib/content-engine/activity";
import { failureResponse, badRequest, readJson, requireAdmin } from "@/lib/content-engine/api";
import {
  EMPTY_METRICS,
  addMetrics,
  compare,
  metricsFromRow,
  performanceScore,
  type PostPerformance,
} from "@/lib/content-engine/analytics";
import { learn } from "@/lib/content-engine/engines/learn";
import { isPlatform } from "@/lib/content-engine/platforms";
import { istHourOf } from "@/lib/content-engine/scheduler";
import * as repo from "@/lib/content-engine/repository";
import type { ContentPlatform } from "@/lib/content-engine/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Performance, and what it means.
 *
 * Most of these platforms will not hand over per-post metrics until their
 * APIs are connected, and several never will for a small account. So the
 * numbers can be typed in, and typed-in numbers are treated as first-class:
 * a shop that reads its own Instagram insights and enters four figures gets
 * the same Learn analysis as one with a full API integration.
 */
async function performances(): Promise<PostPerformance[]> {
  const [posts, analytics] = await Promise.all([
    repo.listPosts({ status: ["PUBLISHED", "ANALYZED"], limit: 300 }),
    repo.listAnalytics(),
  ]);

  const byPost = new Map<string, ReturnType<typeof metricsFromRow>>();
  const platforms = new Map<string, ContentPlatform[]>();
  for (const row of analytics) {
    byPost.set(row.contentPostId, addMetrics(byPost.get(row.contentPostId) ?? EMPTY_METRICS, metricsFromRow(row)));
    platforms.set(row.contentPostId, [...(platforms.get(row.contentPostId) ?? []), row.platform]);
  }

  return posts.map((post) => {
    const metrics = byPost.get(post.id) ?? EMPTY_METRICS;
    return {
      postId: post.id,
      topic: post.masterTopic,
      category: post.masterTopic,
      hook: post.hook,
      format: post.contentType,
      platforms: platforms.get(post.id) ?? [],
      publishedAt: post.publishedAt,
      publishedHour: post.publishedAt ? istHourOf(post.publishedAt) : null,
      metrics,
      score: performanceScore(metrics),
    };
  });
}

export async function GET(request: Request) {
  const guard = await requireAdmin(request, "read");
  if (!guard.ok) return guard.response;

  try {
    const posts = await performances();
    return NextResponse.json({
      posts,
      comparison: compare(posts),
      latestLearning: await repo.latestLearning(),
    });
  } catch (caught) {
    return failureResponse(caught);
  }
}

/** Record figures for a post, whether fetched from a platform or typed in. */
export async function POST(request: Request) {
  const guard = await requireAdmin(request, "write");
  if (!guard.ok) return guard.response;

  const body = await readJson<{
    rows?: {
      postId?: string;
      platform?: string;
      impressions?: number;
      reach?: number;
      views?: number;
      likes?: number;
      comments?: number;
      shares?: number;
      saves?: number;
      clicks?: number;
      watchTimeSeconds?: number;
      enquiries?: number;
      leads?: number;
      customers?: number;
      revenue?: number | null;
    }[];
  }>(request);

  const rows = (body?.rows ?? []).filter((row) => row.postId && isPlatform(row.platform));
  if (!rows.length) return badRequest("No usable analytics rows were sent.");

  const number = (value: unknown) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : 0;
  };

  try {
    const saved = await repo.upsertAnalytics(
      rows.map((row) => ({
        contentPostId: String(row.postId),
        platform: row.platform as ContentPlatform,
        impressions: number(row.impressions),
        reach: number(row.reach),
        views: number(row.views),
        likes: number(row.likes),
        comments: number(row.comments),
        shares: number(row.shares),
        saves: number(row.saves),
        clicks: number(row.clicks),
        watchTimeSeconds: number(row.watchTimeSeconds),
        enquiries: number(row.enquiries),
        leads: number(row.leads),
        customers: number(row.customers),
        revenue: row.revenue === null || row.revenue === undefined ? null : Number(row.revenue),
      })),
    );

    // A post with figures against it has been analysed, which is the last
    // stage of the pipeline and what the dashboard counts.
    for (const row of rows) {
      const post = await repo.getPost(String(row.postId));
      if (post?.status === "PUBLISHED") await repo.updatePost(post.id, { status: "ANALYZED" });
    }

    await logActivity({
      entity: "analytics",
      entityId: null,
      action: "analytics:recorded",
      actor: guard.actor,
      detail: `${saved} rows.`,
    });

    return NextResponse.json({ saved });
  } catch (caught) {
    return failureResponse(caught);
  }
}

/** Run the Learn engine over what has been published. */
export async function PUT(request: Request) {
  const guard = await requireAdmin(request, "generate");
  if (!guard.ok) return guard.response;

  try {
    const posts = await performances();
    const result = await learn(posts);

    const dates = posts.map((post) => (post.publishedAt ? Date.parse(post.publishedAt) : Date.now()));
    await repo.saveLearning({
      periodStart: new Date(dates.length ? Math.min(...dates) : Date.now()).toISOString(),
      periodEnd: new Date().toISOString(),
      postsAnalyzed: posts.length,
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
      action: "learn:completed",
      actor: guard.actor,
      detail: `${posts.length} posts analysed.`,
    });

    return NextResponse.json({ result });
  } catch (caught) {
    return failureResponse(caught);
  }
}
