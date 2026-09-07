import { NextResponse } from "next/server";

import { logActivity } from "@/lib/content-engine/activity";
import { badRequest, failureResponse, readJson, requireAdmin } from "@/lib/content-engine/api";
import { buildHistory, metricsFromRow, performanceScore, EMPTY_METRICS, addMetrics } from "@/lib/content-engine/analytics";
import { mineIdeas } from "@/lib/content-engine/engines/mine";
import { performanceNote } from "@/lib/content-engine/engines/learn";
import { looksGovernmental } from "@/lib/content-engine/publishing-guard";
import { normalizeScores, rankIdeas, suggestFormat, totalScore } from "@/lib/content-engine/scoring";
import * as repo from "@/lib/content-engine/repository";
import { istHourOf } from "@/lib/content-engine/scheduler";
import type { IdeaStatus } from "@/lib/content-engine/types";
import type { PostPerformance } from "@/lib/content-engine/analytics";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * The idea bank: read it, add to it, mine more of it.
 *
 * The ranking returned is not the stored `total_score`. It is that score
 * re-weighted by what this shop's own posts actually did, which is the point
 * of the whole loop — a generic model always ranks "5 tips for GST" highly,
 * and the enquiry log disagrees.
 */

async function history() {
  const [posts, analytics] = await Promise.all([
    repo.listPosts({ status: ["PUBLISHED", "ANALYZED"], limit: 200 }),
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

  return buildHistory(performances);
}

export async function GET(request: Request) {
  const guard = await requireAdmin(request, "read");
  if (!guard.ok) return guard.response;

  try {
    const url = new URL(request.url);
    const statuses = url.searchParams.getAll("status") as IdeaStatus[];
    const [ideas, performance] = await Promise.all([
      repo.listIdeas({ status: statuses.length ? statuses : undefined, limit: 200 }),
      history(),
    ]);

    return NextResponse.json({ ideas: rankIdeas(ideas, performance) });
  } catch (caught) {
    return failureResponse(caught);
  }
}

/**
 * Mine new ideas, or add one typed by hand.
 *
 * Both land in the same table with the same shape. A manually entered idea is
 * scored by the person entering it rather than by a model, because paying for
 * a scoring call on a topic somebody already decided to write about is
 * exactly the spending the cost rules forbid.
 */
export async function POST(request: Request) {
  const guard = await requireAdmin(request, "generate");
  if (!guard.ok) return guard.response;

  const body = await readJson<{
    mode?: string;
    count?: number;
    topic?: string;
    customerQuestions?: string[];
    services?: string[];
    governmentTopics?: { title: string; note: string }[];
    idea?: {
      title?: string;
      description?: string;
      category?: string;
      targetAudience?: string;
      scores?: Record<string, number>;
    };
  }>(request);
  if (!body) return badRequest("That request could not be read.");

  try {
    if (body.mode === "manual") {
      const title = String(body.idea?.title ?? "").trim();
      if (!title) return badRequest("An idea needs a title.");

      const scores = normalizeScores(body.idea?.scores ?? {});
      const description = String(body.idea?.description ?? "").trim();
      const government = looksGovernmental(title, description);

      const [created] = await repo.insertIdeas([
        {
          title: title.slice(0, 200),
          description: description.slice(0, 1500),
          source: "manual",
          sourceUrl: null,
          category: String(body.idea?.category ?? "General").slice(0, 80),
          targetAudience: String(body.idea?.targetAudience ?? "").slice(0, 300),
          scores,
          totalScore: totalScore(scores),
          scoreReason: "Entered by hand.",
          suggestedFormat: suggestFormat(scores, government),
          status: "NEW",
          government,
        },
      ]);

      await logActivity({
        entity: "idea",
        entityId: created?.id ?? null,
        action: "idea:created",
        actor: guard.actor,
        detail: title,
      });
      return NextResponse.json({ ideas: created ? [created] : [] });
    }

    const [brand, existing, learning] = await Promise.all([
      repo.getBrand(),
      repo.listIdeas({ limit: 200 }),
      repo.latestLearning(),
    ]);

    const published = await repo.listPosts({ status: ["PUBLISHED", "ANALYZED"], limit: 100 });

    const { ideas, dropped } = await mineIdeas({
      brand,
      customerQuestions: (body.customerQuestions ?? []).map((question) => String(question)).slice(0, 60),
      services: (body.services ?? brand.businessCategories).map((service) => String(service)).slice(0, 40),
      governmentTopics: (body.governmentTopics ?? []).slice(0, 25),
      performanceNote: learning?.summary ?? performanceNote(null),
      existingTitles: [...existing.map((idea) => idea.title), ...published.map((post) => post.masterTopic)],
      topic: body.topic,
      count: Math.min(20, Math.max(1, Number(body.count) || 8)),
    });

    const saved = await repo.insertIdeas(ideas);

    await logActivity({
      entity: "idea",
      entityId: null,
      action: "mine:completed",
      actor: guard.actor,
      detail: `${saved.length} ideas saved, ${dropped} dropped as repeats.`,
    });

    return NextResponse.json({ ideas: saved, dropped });
  } catch (caught) {
    return failureResponse(caught);
  }
}

export async function PATCH(request: Request) {
  const guard = await requireAdmin(request, "write");
  if (!guard.ok) return guard.response;

  const body = await readJson<{ id?: string; patch?: Record<string, unknown> }>(request);
  if (!body?.id) return badRequest("Which idea?");

  try {
    const before = await repo.getIdea(body.id);
    if (!before) return NextResponse.json({ error: "That idea does not exist." }, { status: 404 });

    const patch = body.patch ?? {};
    const updated = await repo.updateIdea(body.id, {
      title: typeof patch.title === "string" ? patch.title.slice(0, 200) : undefined,
      description: typeof patch.description === "string" ? patch.description.slice(0, 1500) : undefined,
      category: typeof patch.category === "string" ? patch.category.slice(0, 80) : undefined,
      status: typeof patch.status === "string" ? (patch.status as IdeaStatus) : undefined,
      scores: patch.scores ? normalizeScores(patch.scores as Record<string, unknown>) : undefined,
    });

    if (!updated) return NextResponse.json({ error: "That idea could not be updated." }, { status: 404 });

    await logActivity({
      entity: "idea",
      entityId: body.id,
      action: "idea:updated",
      actor: guard.actor,
      fromStatus: before.status,
      toStatus: updated.status,
      detail: Object.keys(patch).join(", "),
    });

    return NextResponse.json({ idea: updated });
  } catch (caught) {
    return failureResponse(caught);
  }
}
