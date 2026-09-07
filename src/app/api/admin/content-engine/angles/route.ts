import { NextResponse } from "next/server";

import { badRequest, failureResponse, readJson, requireAdmin } from "@/lib/content-engine/api";
import { repeatWarning } from "@/lib/content-engine/engines/angle";
import { runAngles } from "@/lib/content-engine/orchestrator";
import * as repo from "@/lib/content-engine/repository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Stage 02 — five hooks for one idea, with a recommendation and a repeat warning. */
export async function POST(request: Request) {
  const guard = await requireAdmin(request, "generate");
  if (!guard.ok) return guard.response;

  const body = await readJson<{ ideaId?: string; count?: number }>(request);
  if (!body?.ideaId) return badRequest("Which idea?");

  try {
    const angles = await runAngles(body.ideaId, guard.actor, Math.min(10, Math.max(5, Number(body.count) || 5)));
    const usedHooks = await repo.listUsedHooks();

    return NextResponse.json({
      angles: angles.map((angle) => ({ ...angle, repeatWarning: repeatWarning(angle.hook, usedHooks) })),
    });
  } catch (caught) {
    return failureResponse(caught);
  }
}
