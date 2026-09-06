import { NextResponse } from "next/server";

import { failureResponse, badRequest, readJson, requireAdmin } from "@/lib/content-engine/api";
import { runPipeline } from "@/lib/content-engine/orchestrator";
import { isPlatform } from "@/lib/content-engine/platforms";
import type { ContentPlatform } from "@/lib/content-engine/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * One idea, all the way to the approval queue.
 *
 * This is what "Number 2 chalao" runs. It stops at APPROVAL_PENDING and there
 * is no parameter that carries it further, because the only thing that
 * carries a post further is a person on the approval screen looking at the
 * claims and their sources.
 */
export async function POST(request: Request) {
  const guard = await requireAdmin(request, "generate");
  if (!guard.ok) return guard.response;

  const body = await readJson<{
    ideaId?: string;
    platforms?: string[];
    sources?: { title?: string; url?: string; publisher?: string; excerpt?: string }[];
  }>(request);
  if (!body?.ideaId) return badRequest("Which idea?");

  const platforms = (body.platforms ?? ["INSTAGRAM", "FACEBOOK", "WHATSAPP"]).filter(isPlatform) as ContentPlatform[];

  try {
    const run = await runPipeline({
      ideaId: body.ideaId,
      actor: guard.actor,
      platforms: platforms.length ? platforms : ["INSTAGRAM"],
      sources: (body.sources ?? [])
        .map((source) => ({
          title: String(source.title ?? "").slice(0, 200),
          url: String(source.url ?? "").slice(0, 500),
          publisher: String(source.publisher ?? "").slice(0, 200),
          excerpt: String(source.excerpt ?? "").slice(0, 2000),
        }))
        .filter((source) => source.title && source.url),
    });

    return NextResponse.json({ run });
  } catch (caught) {
    return failureResponse(caught);
  }
}
