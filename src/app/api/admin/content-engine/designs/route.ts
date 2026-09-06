import { NextResponse } from "next/server";

import { failureResponse, badRequest, readJson, requireAdmin } from "@/lib/content-engine/api";
import { isCanvaConfigured, renderWithCanva } from "@/lib/content-engine/engines/design";
import { specToBrief } from "@/lib/content-engine/design-spec";
import { runDesign } from "@/lib/content-engine/orchestrator";
import { isPlatform } from "@/lib/content-engine/platforms";
import * as repo from "@/lib/content-engine/repository";
import type { ContentPlatform } from "@/lib/content-engine/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Stage 05 — design specifications, and a Canva render when one is possible. */
export async function GET(request: Request) {
  const guard = await requireAdmin(request, "read");
  if (!guard.ok) return guard.response;

  try {
    const url = new URL(request.url);
    const postId = url.searchParams.get("postId");

    if (!postId) {
      const posts = await repo.listPosts({ status: ["DESIGN_READY", "FACT_CHECKED", "APPROVAL_PENDING"] });
      return NextResponse.json({ posts, canva: isCanvaConfigured() });
    }

    const [post, designs, brand] = await Promise.all([
      repo.getPost(postId),
      repo.listDesigns(postId),
      repo.getBrand(),
    ]);
    if (!post) return NextResponse.json({ error: "That post does not exist." }, { status: 404 });

    return NextResponse.json({
      post,
      canva: isCanvaConfigured(),
      designs: designs.map((design) => ({ ...design, brief: specToBrief(design.spec, brand) })),
    });
  } catch (caught) {
    return failureResponse(caught);
  }
}

export async function POST(request: Request) {
  const guard = await requireAdmin(request, "generate");
  if (!guard.ok) return guard.response;

  const body = await readJson<{ postId?: string; platforms?: string[]; render?: boolean; templateId?: string }>(request);
  if (!body?.postId) return badRequest("Which post?");

  const platforms = (body.platforms ?? ["INSTAGRAM"]).filter(isPlatform) as ContentPlatform[];
  if (!platforms.length) return badRequest("Which platforms?");

  try {
    const post = await runDesign({ postId: body.postId, actor: guard.actor, platforms });
    const brand = await repo.getBrand();
    const designs = await repo.listDesigns(body.postId);

    /*
      Rendering is a separate, optional step. A specification that exists is
      the deliverable; if Canva is not connected the design screen says so and
      offers the brief, rather than the whole stage reporting failure.
    */
    const renders = body.render
      ? await Promise.all(
          designs.map(async (design) => ({
            platform: design.platform,
            ...(await renderWithCanva(design.spec, body.templateId ?? design.templateId)),
          })),
        )
      : [];

    for (const render of renders) {
      const design = designs.find((candidate) => candidate.platform === render.platform);
      if (!design) continue;
      await repo.upsertDesign({
        ...design,
        status: render.status,
        designId: render.designId,
        previewUrl: render.previewUrl,
        exportUrl: render.exportUrl,
        errorMessage: render.status === "READY" ? null : render.message,
      });
    }

    return NextResponse.json({
      post,
      designs: (await repo.listDesigns(body.postId)).map((design) => ({
        ...design,
        brief: specToBrief(design.spec, brand),
      })),
      renders,
    });
  } catch (caught) {
    return failureResponse(caught);
  }
}
