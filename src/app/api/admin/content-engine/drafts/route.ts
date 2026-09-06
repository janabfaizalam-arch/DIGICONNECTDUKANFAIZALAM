import { NextResponse } from "next/server";

import { logActivity } from "@/lib/content-engine/activity";
import { badRequest, failureResponse, readJson, requireAdmin } from "@/lib/content-engine/api";
import { bannedPhrasesIn } from "@/lib/content-engine/brand-voice";
import { rewrite } from "@/lib/content-engine/engines/write";
import { runWrite } from "@/lib/content-engine/orchestrator";
import * as repo from "@/lib/content-engine/repository";
import type { ContentAngle, ContentStatus } from "@/lib/content-engine/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Stage 03 — the drafts queue, and the master post behind each one. */
export async function GET(request: Request) {
  const guard = await requireAdmin(request, "read");
  if (!guard.ok) return guard.response;

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (id) {
      const post = await repo.getPost(id);
      if (!post) return NextResponse.json({ error: "That post does not exist." }, { status: 404 });
      const [versions, checks, designs, activity] = await Promise.all([
        repo.listVersions(id),
        repo.listFactChecks(id),
        repo.listDesigns(id),
        repo.listActivity({ entityId: id, limit: 40 }),
      ]);
      return NextResponse.json({ post, versions, checks, designs, activity });
    }

    const statuses = url.searchParams.getAll("status") as ContentStatus[];
    return NextResponse.json({ posts: await repo.listPosts({ status: statuses.length ? statuses : undefined }) });
  } catch (caught) {
    return failureResponse(caught);
  }
}

/** Write the master content for a chosen angle. */
export async function POST(request: Request) {
  const guard = await requireAdmin(request, "generate");
  if (!guard.ok) return guard.response;

  const body = await readJson<{ ideaId?: string; angle?: Partial<ContentAngle> }>(request);
  if (!body?.ideaId) return badRequest("Which idea?");
  if (!body.angle?.hook) return badRequest("Which hook?");

  try {
    const post = await runWrite({
      ideaId: body.ideaId,
      angle: {
        hook: String(body.angle.hook).slice(0, 200),
        reason: String(body.angle.reason ?? "").slice(0, 300),
        format: (body.angle.format ?? "STATIC_POSTER") as ContentAngle["format"],
        freshness: Number(body.angle.freshness ?? 5),
        appeal: Number(body.angle.appeal ?? 5),
        recommended: Boolean(body.angle.recommended),
      },
      actor: guard.actor,
    });

    return NextResponse.json({ post });
  } catch (caught) {
    return failureResponse(caught);
  }
}

/**
 * Edit a draft by hand, or ask for one part of it to be rewritten.
 *
 * An edit that touches the body of a government post does not silently keep
 * its VERIFIED status: the claims were checked against the previous text, and
 * carrying the verdict across would let a figure be typed in after the check
 * and go out wearing its badge.
 */
export async function PATCH(request: Request) {
  const guard = await requireAdmin(request, "write");
  if (!guard.ok) return guard.response;

  const body = await readJson<{
    id?: string;
    patch?: { hook?: string; body?: string; cta?: string; masterTopic?: string };
    rewrite?: { field: "hook" | "body" | "cta"; instruction: string };
  }>(request);
  if (!body?.id) return badRequest("Which post?");

  try {
    const post = await repo.getPost(body.id);
    if (!post) return NextResponse.json({ error: "That post does not exist." }, { status: 404 });

    if (body.rewrite) {
      const brand = await repo.getBrand();
      const source = body.rewrite.field === "hook" ? post.hook : body.rewrite.field === "cta" ? post.cta : post.body;
      const text = await rewrite({ brand, text: source, instruction: String(body.rewrite.instruction).slice(0, 300) });
      return NextResponse.json({ field: body.rewrite.field, text, warnings: bannedPhrasesIn(text, brand) });
    }

    const patch = body.patch ?? {};
    const textChanged = patch.body !== undefined || patch.hook !== undefined || patch.cta !== undefined;

    const updated = await repo.updatePost(body.id, {
      hook: patch.hook?.slice(0, 500),
      body: patch.body?.slice(0, 20000),
      cta: patch.cta?.slice(0, 500),
      masterTopic: patch.masterTopic?.slice(0, 300),
      factCheckStatus:
        post.government && textChanged && post.factCheckStatus === "VERIFIED" ? "PENDING" : undefined,
      approvalStatus: textChanged && post.approvalStatus === "APPROVED" ? "PENDING" : undefined,
    });

    if (!updated) return NextResponse.json({ error: "That post could not be updated." }, { status: 404 });

    await logActivity({
      entity: "post",
      entityId: body.id,
      action: "draft:edited",
      actor: guard.actor,
      detail:
        post.government && textChanged && post.factCheckStatus === "VERIFIED"
          ? "Text changed after verification, so the fact check was reset to PENDING."
          : Object.keys(patch).join(", "),
    });

    return NextResponse.json({ post: updated });
  } catch (caught) {
    return failureResponse(caught);
  }
}
