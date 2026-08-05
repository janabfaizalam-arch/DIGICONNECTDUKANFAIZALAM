import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser, getCurrentUserRole } from "@/lib/auth";
import { currentUserHasCapability } from "@/lib/crm/permissions";
import {
  cancelLeadFollowUp,
  completeLeadFollowUp,
  scheduleLeadFollowUp,
} from "@/lib/crm/lead-followups";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const schema = z.object({
  action: z.enum(["schedule", "complete", "cancel"]),
  leadId: z.string().uuid().optional(),
  followUpId: z.string().uuid().optional(),
  scheduledAt: z.string().optional(),
  note: z.string().max(1000).optional().nullable(),
  reason: z.string().max(240).optional().nullable(),
  idempotencyKey: z.string().min(8).max(120).optional().nullable(),
  replaceFollowUpId: z.string().uuid().optional().nullable(),
});

export async function POST(request: Request) {
  const rate = checkRateLimit(`crm-lead-followup:${getClientIp(request)}`, 40, 60_000);
  if (!rate.ok) return rateLimitResponse(rate.retryAfter);

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const allowed = await currentUserHasCapability("leads.view");
  if (!allowed.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid follow-up payload." }, { status: 400 });
  }

  const role = await getCurrentUserRole(user);

  if (body.action === "schedule") {
    if (!body.leadId || !body.scheduledAt) {
      return NextResponse.json({ error: "leadId and scheduledAt are required." }, { status: 400 });
    }
    const result = await scheduleLeadFollowUp({
      actorId: user.id,
      actorRole: role,
      leadId: body.leadId,
      scheduledAt: body.scheduledAt,
      note: body.note,
      idempotencyKey: body.idempotencyKey,
      replaceFollowUpId: body.replaceFollowUpId,
    });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result);
  }

  if (!body.followUpId) {
    return NextResponse.json({ error: "followUpId is required." }, { status: 400 });
  }

  if (body.action === "complete") {
    const result = await completeLeadFollowUp({
      actorId: user.id,
      actorRole: role,
      followUpId: body.followUpId,
      note: body.note,
    });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result);
  }

  const result = await cancelLeadFollowUp({
    actorId: user.id,
    actorRole: role,
    followUpId: body.followUpId,
    reason: body.reason,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result);
}
