import { NextResponse } from "next/server";

import { logActivity } from "@/lib/content-engine/activity";
import { failureResponse, badRequest, readJson, requireAdmin } from "@/lib/content-engine/api";
import { isCanvaConfigured } from "@/lib/content-engine/engines/design";
import { isAiConfigured } from "@/lib/content-engine/ai/generate";
import { platformStatuses } from "@/lib/content-engine/publishers/adapters";
import { normalizePlan } from "@/lib/content-engine/scheduler";
import * as repo from "@/lib/content-engine/repository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * The switches, and what is actually connected.
 *
 * The connection list is computed from which environment variables are set,
 * never from a stored flag somebody once ticked. A settings screen that says
 * "Instagram: connected" because a checkbox is on, while the credential is
 * missing, is how a scheduled post fails silently at ten in the morning.
 */
export async function GET(request: Request) {
  const guard = await requireAdmin(request, "read");
  if (!guard.ok) return guard.response;

  try {
    return NextResponse.json({
      settings: await repo.getSettings(),
      installed: await repo.isInstalled(),
      integrations: {
        ai: isAiConfigured(),
        canva: isCanvaConfigured(),
        platforms: await platformStatuses(),
      },
    });
  } catch (caught) {
    return failureResponse(caught);
  }
}

export async function PATCH(request: Request) {
  const guard = await requireAdmin(request, "write");
  if (!guard.ok) return guard.response;

  const body = await readJson<Record<string, unknown>>(request);
  if (!body) return badRequest("That request could not be read.");

  const flag = (key: string) => (typeof body[key] === "boolean" ? (body[key] as boolean) : undefined);

  try {
    const before = await repo.getSettings();

    const settings = await repo.saveSettings({
      autoResearch: flag("autoResearch"),
      autoIdeaGeneration: flag("autoIdeaGeneration"),
      autoWriting: flag("autoWriting"),
      autoDesign: flag("autoDesign"),
      autoRepurpose: flag("autoRepurpose"),
      autoPublish: flag("autoPublish"),
      autoPublishGovernment: flag("autoPublishGovernment"),
      humanApprovalRequired: flag("humanApprovalRequired"),
      weeklyPlan: body.weeklyPlan ? normalizePlan(body.weeklyPlan) : undefined,
    });

    /*
      The two switches that let content reach the public without a person are
      logged with the name of whoever moved them. Turning on automatic
      publishing for government content is the single most consequential
      setting in this system.
    */
    const changed: string[] = [];
    if (before.autoPublish !== settings.autoPublish) {
      changed.push(`AUTO_PUBLISH ${settings.autoPublish ? "ON" : "OFF"}`);
    }
    if (before.autoPublishGovernment !== settings.autoPublishGovernment) {
      changed.push(`AUTO_PUBLISH_GOVERNMENT ${settings.autoPublishGovernment ? "ON" : "OFF"}`);
    }

    await logActivity({
      entity: "settings",
      entityId: null,
      action: "settings:saved",
      actor: guard.actor,
      detail: changed.length ? changed.join("; ") : Object.keys(body).join(", "),
    });

    return NextResponse.json({ settings });
  } catch (caught) {
    return failureResponse(caught);
  }
}
