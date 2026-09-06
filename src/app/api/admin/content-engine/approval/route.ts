import { NextResponse } from "next/server";

import { logActivity } from "@/lib/content-engine/activity";
import { failureResponse, badRequest, readJson, requireAdmin } from "@/lib/content-engine/api";
import { evaluatePublish } from "@/lib/content-engine/publishing-guard";
import { transition } from "@/lib/content-engine/pipeline";
import * as repo from "@/lib/content-engine/repository";
import type { ContentStatus } from "@/lib/content-engine/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * The approval centre: the gate everything passes through.
 *
 * The screen shows the content, the claims with their sources, the design and
 * every platform version together, because approving a post means approving
 * all of it — and a reviewer who has to open four screens to see what they
 * are signing off will stop opening four screens.
 */
export async function GET(request: Request) {
  const guard = await requireAdmin(request, "read");
  if (!guard.ok) return guard.response;

  try {
    const url = new URL(request.url);
    const postId = url.searchParams.get("postId");

    if (!postId) {
      return NextResponse.json({ posts: await repo.listPosts({ status: ["APPROVAL_PENDING"] }) });
    }

    const [post, versions, checks, designs, schedule, activity, settings] = await Promise.all([
      repo.getPost(postId),
      repo.listVersions(postId),
      repo.listFactChecks(postId),
      repo.listDesigns(postId),
      repo.listSchedule({}),
      repo.listActivity({ entityId: postId, limit: 50 }),
      repo.getSettings(),
    ]);
    if (!post) return NextResponse.json({ error: "That post does not exist." }, { status: 404 });

    return NextResponse.json({
      post,
      versions,
      checks,
      designs,
      schedule: schedule.filter((row) => row.contentPostId === postId),
      activity,
      // What is still standing between this and going out, so the reviewer is
      // not left guessing why the publish button will refuse.
      blockers: evaluatePublish(
        {
          id: post.id,
          status: post.status,
          approvalStatus: post.approvalStatus,
          factCheckStatus: post.factCheckStatus,
          government: post.government,
          platform: versions[0]?.platform ?? "INSTAGRAM",
          scheduledAt: post.scheduledAt,
        },
        { settings, now: new Date(), manual: true },
      ),
    });
  } catch (caught) {
    return failureResponse(caught);
  }
}

/**
 * Approve, reject, or send it back to the AI.
 *
 * Approval names the person. `approved_by` is the answer to "who said this
 * amount was right", and it is written in the same statement that moves the
 * status, so a post cannot be APPROVED with nobody's name on it.
 */
export async function POST(request: Request) {
  const guard = await requireAdmin(request, "write");
  if (!guard.ok) return guard.response;

  const body = await readJson<{ postId?: string; action?: string; reason?: string; sendBackTo?: string }>(request);
  if (!body?.postId) return badRequest("Which post?");

  try {
    const post = await repo.getPost(body.postId);
    if (!post) return NextResponse.json({ error: "That post does not exist." }, { status: 404 });

    if (body.action === "approve") {
      /*
        A government post cannot be approved while a critical claim is
        unverified. The approval screen shows the claims, so this is not a
        surprise — it is the refusal that makes the screen worth reading.
      */
      if (post.government && post.factCheckStatus !== "VERIFIED") {
        return NextResponse.json(
          {
            error:
              `Sarkari post hai aur fact check abhi ${post.factCheckStatus} hai. ` +
              "Pehle har claim ko official source ke saath verify kijiye, tab approve kijiye.",
          },
          { status: 409 },
        );
      }

      const moved = transition(post.status, "APPROVED");
      if (!moved.ok) return NextResponse.json({ error: moved.reason }, { status: 409 });

      const updated = await repo.updatePost(post.id, {
        status: "APPROVED",
        approvalStatus: "APPROVED",
        approvedBy: guard.actor,
        approvedAt: new Date().toISOString(),
        rejectionReason: null,
      });
      if (!updated) return NextResponse.json({ error: "That post could not be approved." }, { status: 404 });

      await logActivity({
        entity: "post",
        entityId: post.id,
        action: "approval:approved",
        actor: guard.actor,
        fromStatus: post.status,
        toStatus: "APPROVED",
        detail: post.government ? "Government content, approved by a named person." : "",
      });

      return NextResponse.json({ post: updated });
    }

    if (body.action === "reject") {
      const updated = await repo.updatePost(post.id, {
        approvalStatus: "REJECTED",
        rejectionReason: String(body.reason ?? "").slice(0, 500),
      });
      await logActivity({
        entity: "post",
        entityId: post.id,
        action: "approval:rejected",
        actor: guard.actor,
        detail: String(body.reason ?? ""),
      });
      return NextResponse.json({ post: updated });
    }

    if (body.action === "send_back") {
      const target = (body.sendBackTo ?? "DRAFT_READY") as ContentStatus;
      const moved = transition(post.status, target);
      if (!moved.ok) return NextResponse.json({ error: moved.reason }, { status: 409 });

      const updated = await repo.updatePost(post.id, {
        status: target,
        approvalStatus: "CHANGES_REQUESTED",
        rejectionReason: String(body.reason ?? "").slice(0, 500),
      });
      await logActivity({
        entity: "post",
        entityId: post.id,
        action: "approval:sent-back",
        actor: guard.actor,
        fromStatus: post.status,
        toStatus: target,
        detail: String(body.reason ?? ""),
      });
      return NextResponse.json({ post: updated });
    }

    return badRequest("That is not an approval action.");
  } catch (caught) {
    return failureResponse(caught);
  }
}
