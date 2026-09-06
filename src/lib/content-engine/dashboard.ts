import "server-only";

import {
  EMPTY_METRICS,
  addMetrics,
  metricsFromRow,
  performanceScore,
  type Metrics,
  type PostPerformance,
} from "@/lib/content-engine/analytics";
import { DASHBOARD_BUCKETS } from "@/lib/content-engine/pipeline";
import * as repo from "@/lib/content-engine/repository";
import { istHourOf } from "@/lib/content-engine/scheduler";
import type { ContentPost, ContentStatus } from "@/lib/content-engine/types";

/**
 * Everything the Content Engine home screen shows, in one read.
 *
 * The counts are computed from the same `DASHBOARD_BUCKETS` the pipeline
 * defines, so a stage added to the pipeline appears here without anybody
 * editing a component — which is the failure this project has already had
 * once, with twenty-five admin screens that existed and were unreachable.
 */

export type DashboardData = {
  installed: boolean;
  counts: Record<string, number>;
  week: Metrics;
  allTime: Metrics;
  postsThisWeek: number;
  top: PostPerformance[];
  worst: PostPerformance[];
  awaitingApproval: ContentPost[];
  nextScheduled: { postId: string; topic: string; platform: string; scheduledAt: string }[];
  failed: ContentPost[];
  latestLearning: { summary: string; createdAt: string } | null;
};

const WEEK_MS = 7 * 86_400_000;

export async function loadDashboard(now = new Date()): Promise<DashboardData> {
  if (!(await repo.isInstalled())) {
    return {
      installed: false,
      counts: {},
      week: EMPTY_METRICS,
      allTime: EMPTY_METRICS,
      postsThisWeek: 0,
      top: [],
      worst: [],
      awaitingApproval: [],
      nextScheduled: [],
      failed: [],
      latestLearning: null,
    };
  }

  const [ideas, posts, analytics, schedule, learning] = await Promise.all([
    repo.listIdeas({ limit: 500 }),
    repo.listPosts({ limit: 500 }),
    repo.listAnalytics(),
    repo.listSchedule({ from: now.toISOString(), status: ["PENDING", "QUEUED"] }),
    repo.latestLearning(),
  ]);

  const counts: Record<string, number> = {};
  for (const bucket of DASHBOARD_BUCKETS) {
    counts[bucket.id] = posts.filter((post) => bucket.statuses.includes(post.status)).length;
  }
  // Ideas live in their own table, so the first bucket counts them rather than
  // posts: an idea that has not become a post yet is exactly what "new" means.
  counts["new-ideas"] = ideas.filter((idea) => idea.status === "NEW").length;
  counts["ranked"] = ideas.filter((idea) => idea.status === "RANKED" || idea.status === "IN_PROGRESS").length;

  const byPost = new Map<string, Metrics>();
  for (const row of analytics) {
    byPost.set(row.contentPostId, addMetrics(byPost.get(row.contentPostId) ?? EMPTY_METRICS, metricsFromRow(row)));
  }

  const performances: PostPerformance[] = posts
    .filter((post) => post.status === "PUBLISHED" || post.status === "ANALYZED")
    .map((post) => {
      const metrics = byPost.get(post.id) ?? EMPTY_METRICS;
      return {
        postId: post.id,
        topic: post.masterTopic,
        category: post.masterTopic,
        hook: post.hook,
        format: post.contentType,
        platforms: analytics.filter((row) => row.contentPostId === post.id).map((row) => row.platform),
        publishedAt: post.publishedAt,
        publishedHour: post.publishedAt ? istHourOf(post.publishedAt) : null,
        metrics,
        score: performanceScore(metrics),
      };
    });

  const ranked = [...performances].sort((a, b) => b.score - a.score);
  const since = new Date(now.getTime() - WEEK_MS);

  const week = performances
    .filter((post) => post.publishedAt && Date.parse(post.publishedAt) >= since.getTime())
    .reduce<Metrics>((sum, post) => addMetrics(sum, post.metrics), EMPTY_METRICS);

  const scheduleTopics = new Map(posts.map((post) => [post.id, post.masterTopic]));

  return {
    installed: true,
    counts,
    week,
    allTime: performances.reduce<Metrics>((sum, post) => addMetrics(sum, post.metrics), EMPTY_METRICS),
    postsThisWeek: performances.filter(
      (post) => post.publishedAt && Date.parse(post.publishedAt) >= since.getTime(),
    ).length,
    top: ranked.slice(0, 5),
    // Only posts with figures. A post published yesterday with no analytics
    // yet is not the worst performer; it is an unmeasured one.
    worst: ranked.filter((post) => post.score > 0).slice(-5).reverse(),
    awaitingApproval: posts.filter((post) => post.status === "APPROVAL_PENDING"),
    nextScheduled: schedule.slice(0, 8).map((row) => ({
      postId: row.contentPostId,
      topic: scheduleTopics.get(row.contentPostId) ?? "(post removed)",
      platform: row.platform,
      scheduledAt: row.scheduledAt,
    })),
    failed: posts.filter((post) => post.status === ("FAILED" as ContentStatus)),
    latestLearning: learning,
  };
}
