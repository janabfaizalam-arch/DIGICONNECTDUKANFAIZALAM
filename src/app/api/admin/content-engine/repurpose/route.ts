import { NextResponse } from "next/server";

import { failureResponse, badRequest, readJson, requireAdmin } from "@/lib/content-engine/api";
import { runRepurpose } from "@/lib/content-engine/orchestrator";
import { isPlatform } from "@/lib/content-engine/platforms";
import * as repo from "@/lib/content-engine/repository";
import type { ContentPlatform } from "@/lib/content-engine/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Stage 06 — one master piece, seven native versions.
 *
 * The platform list is taken from the request rather than always doing all
 * seven, which is what lets the screen offer "redo just Instagram" without
 * spending six more model calls on versions the admin was happy with.
 */
export async function GET(request: Request) {
  const guard = await requireAdmin(request, "read");
  if (!guard.ok) return guard.response;

  try {
    const postId = new URL(request.url).searchParams.get("postId");
    if (!postId) return badRequest("Which post?");

    const [post, versions] = await Promise.all([repo.getPost(postId), repo.listVersions(postId)]);
    if (!post) return NextResponse.json({ error: "That post does not exist." }, { status: 404 });
    return NextResponse.json({ post, versions });
  } catch (caught) {
    return failureResponse(caught);
  }
}

export async function POST(request: Request) {
  const guard = await requireAdmin(request, "generate");
  if (!guard.ok) return guard.response;

  const body = await readJson<{ postId?: string; platforms?: string[] }>(request);
  if (!body?.postId) return badRequest("Which post?");

  const platforms = (body.platforms ?? []).filter(isPlatform) as ContentPlatform[];
  if (!platforms.length) return badRequest("Which platforms?");

  try {
    const result = await runRepurpose({ postId: body.postId, actor: guard.actor, platforms });
    const versions = await repo.listVersions(body.postId);
    return NextResponse.json({ versions, failures: result.failures });
  } catch (caught) {
    return failureResponse(caught);
  }
}

/** An admin editing one platform's version by hand. */
export async function PATCH(request: Request) {
  const guard = await requireAdmin(request, "write");
  if (!guard.ok) return guard.response;

  const body = await readJson<{
    postId?: string;
    platform?: string;
    patch?: { title?: string; hook?: string; body?: string; caption?: string; cta?: string; hashtags?: string[] };
  }>(request);
  if (!body?.postId || !isPlatform(body.platform)) return badRequest("Which post and platform?");

  try {
    const versions = await repo.listVersions(body.postId);
    const current = versions.find((version) => version.platform === body.platform);
    if (!current) return NextResponse.json({ error: "That version does not exist yet." }, { status: 404 });

    const patch = body.patch ?? {};
    const saved = await repo.upsertVersion({
      ...current,
      title: patch.title ?? current.title,
      hook: patch.hook ?? current.hook,
      body: patch.body ?? current.body,
      caption: patch.caption ?? current.caption,
      cta: patch.cta ?? current.cta,
      hashtags: Array.isArray(patch.hashtags) ? patch.hashtags.map(String) : current.hashtags,
    });

    return NextResponse.json({ version: saved });
  } catch (caught) {
    return failureResponse(caught);
  }
}
