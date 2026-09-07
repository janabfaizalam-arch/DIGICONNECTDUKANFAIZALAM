import { NextResponse } from "next/server";

import { logActivity } from "@/lib/content-engine/activity";
import { CRON_ACTOR, authorizeCron } from "@/lib/content-engine/cron";
import { mineIdeas } from "@/lib/content-engine/engines/mine";
import { failureResponse } from "@/lib/content-engine/api";
import * as repo from "@/lib/content-engine/repository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Monday morning: build the week's idea bank.
 *
 * Reads last week's analysis and last week's published titles, mines against
 * them, and saves what is not a repeat. It creates ideas and nothing else —
 * no drafts, no designs, and certainly nothing published. The shop opens on
 * Monday to a ranked list and decides what to run.
 *
 * Respects `autoIdeaGeneration`: a shop that has turned automatic mining off
 * gets a job that reports it did nothing, rather than one that quietly
 * ignores the switch.
 */
export async function POST(request: Request) {
  const denied = await authorizeCron(request, "weekly-mine");
  if (denied) return denied;

  try {
    const settings = await repo.getSettings();
    if (!settings.autoIdeaGeneration) {
      return NextResponse.json({ ok: true, skipped: "AUTO_IDEA_GENERATION is off." });
    }

    const [brand, existing, learning, published] = await Promise.all([
      repo.getBrand(),
      repo.listIdeas({ limit: 200 }),
      repo.latestLearning(),
      repo.listPosts({ status: ["PUBLISHED", "ANALYZED"], limit: 100 }),
    ]);

    const { ideas, dropped } = await mineIdeas({
      brand,
      customerQuestions: [],
      services: brand.businessCategories,
      governmentTopics: [],
      performanceNote: learning?.summary ?? "",
      existingTitles: [...existing.map((idea) => idea.title), ...published.map((post) => post.masterTopic)],
      count: 10,
    });

    const saved = await repo.insertIdeas(ideas);

    await logActivity({
      entity: "idea",
      entityId: null,
      action: "cron:weekly-mine",
      actor: CRON_ACTOR,
      detail: `${saved.length} ideas saved, ${dropped} dropped as repeats.`,
    });

    return NextResponse.json({ ok: true, created: saved.length, dropped });
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
