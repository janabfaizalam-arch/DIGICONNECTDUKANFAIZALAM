import { NextResponse } from "next/server";

import { logActivity } from "@/lib/content-engine/activity";
import { failureResponse, badRequest, readJson, requireAdmin } from "@/lib/content-engine/api";
import { transition } from "@/lib/content-engine/pipeline";
import { publishScheduledRow } from "@/lib/content-engine/publish-runner";
import { isPlatform } from "@/lib/content-engine/platforms";
import { planAhead } from "@/lib/content-engine/scheduler";
import * as repo from "@/lib/content-engine/repository";
import type { ContentPlatform } from "@/lib/content-engine/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** The calendar: what is scheduled, and the empty slots the weekly plan suggests. */
export async function GET(request: Request) {
  const guard = await requireAdmin(request, "read");
  if (!guard.ok) return guard.response;

  try {
    const url = new URL(request.url);
    const days = Math.min(60, Math.max(1, Number(url.searchParams.get("days")) || 14));
    const now = new Date();

    const [rows, settings, posts] = await Promise.all([
      repo.listSchedule({ from: new Date(now.getTime() - 7 * 86_400_000).toISOString() }),
      repo.getSettings(),
      repo.listPosts({ limit: 300 }),
    ]);

    const topics = new Map(posts.map((post) => [post.id, post.masterTopic]));
    const occupied = rows.map((row) => row.scheduledAt.slice(0, 10));

    return NextResponse.json({
      scheduled: rows.map((row) => ({ ...row, topic: topics.get(row.contentPostId) ?? "(post removed)" })),
      suggestions: planAhead({ from: now, days, plan: settings.weeklyPlan, occupiedDates: occupied }),
      approved: posts.filter((post) => post.status === "APPROVED"),
      weeklyPlan: settings.weeklyPlan,
    });
  } catch (caught) {
    return failureResponse(caught);
  }
}

/**
 * Put an approved post on the calendar.
 *
 * Only an approved one. Scheduling is not a way around the approval gate, and
 * the transition check below is what says so rather than a comment.
 */
export async function POST(request: Request) {
  const guard = await requireAdmin(request, "write");
  if (!guard.ok) return guard.response;

  const body = await readJson<{
    postId?: string;
    platforms?: string[];
    scheduledAt?: string;
    bulk?: { postId: string; platforms: string[]; scheduledAt: string }[];
  }>(request);
  if (!body) return badRequest("That request could not be read.");

  const items = body.bulk?.length
    ? body.bulk
    : body.postId
      ? [{ postId: body.postId, platforms: body.platforms ?? [], scheduledAt: body.scheduledAt ?? "" }]
      : [];

  if (!items.length) return badRequest("Which post, and when?");

  try {
    const results: { postId: string; ok: boolean; message: string }[] = [];

    for (const item of items) {
      const post = await repo.getPost(item.postId);
      if (!post) {
        results.push({ postId: item.postId, ok: false, message: "That post does not exist." });
        continue;
      }

      if (post.approvalStatus !== "APPROVED") {
        results.push({
          postId: item.postId,
          ok: false,
          message: "Not approved yet. A post has to be approved before it can be scheduled.",
        });
        continue;
      }

      const at = Date.parse(item.scheduledAt);
      if (!Number.isFinite(at)) {
        results.push({ postId: item.postId, ok: false, message: "That is not a valid date and time." });
        continue;
      }

      const platforms = item.platforms.filter(isPlatform) as ContentPlatform[];
      if (!platforms.length) {
        results.push({ postId: item.postId, ok: false, message: "No platforms chosen." });
        continue;
      }

      const scheduledAt = new Date(at).toISOString();
      await repo.upsertScheduleRows(platforms.map((platform) => ({ contentPostId: post.id, platform, scheduledAt })));

      const moved = transition(post.status, "SCHEDULED");
      if (moved.ok) await repo.updatePost(post.id, { status: "SCHEDULED", scheduledAt });
      else await repo.updatePost(post.id, { scheduledAt });

      await logActivity({
        entity: "schedule",
        entityId: post.id,
        action: "schedule:set",
        actor: guard.actor,
        fromStatus: post.status,
        toStatus: moved.ok ? "SCHEDULED" : post.status,
        detail: `${platforms.join(", ")} at ${scheduledAt}`,
      });

      results.push({ postId: item.postId, ok: true, message: `Scheduled on ${platforms.length} platforms.` });
    }

    return NextResponse.json({ results });
  } catch (caught) {
    return failureResponse(caught);
  }
}

/**
 * Publish one row now, by hand.
 *
 * `manual` relaxes the schedule check and the automatic-publishing switch and
 * nothing else. Approval and the government fact-check rule hold whoever is
 * asking and whichever button they pressed.
 */
export async function PUT(request: Request) {
  const guard = await requireAdmin(request, "publish");
  if (!guard.ok) return guard.response;

  const body = await readJson<{ scheduleId?: string }>(request);
  if (!body?.scheduleId) return badRequest("Which scheduled row?");

  try {
    const rows = await repo.listSchedule({});
    const row = rows.find((candidate) => candidate.id === body.scheduleId);
    if (!row) return NextResponse.json({ error: "That scheduled row does not exist." }, { status: 404 });

    const attempt = await publishScheduledRow({ row, actor: guard.actor, now: new Date(), manual: true });
    return NextResponse.json({ attempt });
  } catch (caught) {
    return failureResponse(caught);
  }
}
