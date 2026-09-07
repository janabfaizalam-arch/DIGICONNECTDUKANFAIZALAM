import { NextResponse } from "next/server";

import { logActivity } from "@/lib/content-engine/activity";
import { badRequest, failureResponse, readJson, requireAdmin } from "@/lib/content-engine/api";
import { verdict } from "@/lib/content-engine/engines/fact-check";
import { runFactCheck } from "@/lib/content-engine/orchestrator";
import * as repo from "@/lib/content-engine/repository";
import type { VerificationStatus } from "@/lib/content-engine/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Stage 04 — claims, sources, and the human who signs off on them. */
export async function GET(request: Request) {
  const guard = await requireAdmin(request, "read");
  if (!guard.ok) return guard.response;

  try {
    const id = new URL(request.url).searchParams.get("postId");
    if (id) {
      const [post, checks] = await Promise.all([repo.getPost(id), repo.listFactChecks(id)]);
      if (!post) return NextResponse.json({ error: "That post does not exist." }, { status: 404 });
      return NextResponse.json({ post, checks });
    }

    const posts = await repo.listPosts({ status: ["FACT_CHECK_PENDING"] });
    return NextResponse.json({ posts });
  } catch (caught) {
    return failureResponse(caught);
  }
}

/** Run the check. Sources are supplied by the admin; nothing is fetched blindly. */
export async function POST(request: Request) {
  const guard = await requireAdmin(request, "generate");
  if (!guard.ok) return guard.response;

  const body = await readJson<{
    postId?: string;
    sources?: { title?: string; url?: string; publisher?: string; excerpt?: string }[];
  }>(request);
  if (!body?.postId) return badRequest("Which post?");

  try {
    const sources = (body.sources ?? [])
      .map((source) => ({
        title: String(source.title ?? "").slice(0, 200),
        url: String(source.url ?? "").slice(0, 500),
        publisher: String(source.publisher ?? "").slice(0, 200),
        excerpt: String(source.excerpt ?? "").slice(0, 2000),
      }))
      .filter((source) => source.title && source.url);

    const result = await runFactCheck({ postId: body.postId, actor: guard.actor, sources });
    const checks = await repo.listFactChecks(body.postId);

    return NextResponse.json({ post: result.post, checks, blocking: result.blocking });
  } catch (caught) {
    return failureResponse(caught);
  }
}

/**
 * A person's verdict on one claim.
 *
 * This is the manual approval the brief requires when a critical claim cannot
 * be verified automatically. It records who decided, because "an AI said it
 * was fine" must never be the answer to how a scheme amount reached a public
 * page.
 */
export async function PATCH(request: Request) {
  const guard = await requireAdmin(request, "write");
  if (!guard.ok) return guard.response;

  const body = await readJson<{
    id?: string;
    postId?: string;
    verificationStatus?: string;
    notes?: string;
  }>(request);
  if (!body?.id || !body.postId) return badRequest("Which claim?");

  const status = String(body.verificationStatus ?? "").toUpperCase() as VerificationStatus;
  if (!(["VERIFIED", "NEEDS_REVIEW", "UNVERIFIED", "REJECTED"] as string[]).includes(status)) {
    return badRequest("That is not a verification status.");
  }

  try {
    const updated = await repo.reviewFactCheck(body.id, {
      verificationStatus: status,
      notes: String(body.notes ?? "").slice(0, 600),
      reviewedBy: guard.actor,
    });
    if (!updated) return NextResponse.json({ error: "That claim does not exist." }, { status: 404 });

    // The post's verdict follows its claims, recomputed from all of them.
    const checks = await repo.listFactChecks(body.postId);
    const overall = verdict(checks);
    const post = await repo.updatePost(body.postId, { factCheckStatus: overall.status });

    await logActivity({
      entity: "post",
      entityId: body.postId,
      action: "fact-check:reviewed",
      actor: guard.actor,
      detail: `Claim marked ${status} by hand. Post verdict is now ${overall.status}.`,
    });

    return NextResponse.json({ check: updated, post, blocking: overall.blocking });
  } catch (caught) {
    return failureResponse(caught);
  }
}
