import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser, getCurrentUserRole } from "@/lib/auth";
import { currentUserHasCapability } from "@/lib/crm/permissions";
import { reassignLead, transitionLeadStage } from "@/lib/crm/leads";
import { isLeadPipelineStage } from "@/lib/crm/leads-core";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const schema = z.object({
  action: z.enum(["transition", "reassign"]),
  toStage: z.string().optional(),
  note: z.string().max(1000).optional().nullable(),
  lostReason: z.string().max(240).optional().nullable(),
  nextFollowUpAt: z.string().datetime().optional().nullable(),
  assigneeUserId: z.string().uuid().optional().nullable(),
  reason: z.string().max(240).optional().nullable(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const rate = checkRateLimit(`admin-crm-lead-mutate:${getClientIp(request)}`, 40, 60_000);
  if (!rate.ok) return rateLimitResponse(rate.retryAfter);

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = await currentUserHasCapability("leads.view");
  if (!allowed.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const role = await getCurrentUserRole(user);

  if (body.action === "transition") {
    if (!isLeadPipelineStage(body.toStage)) {
      return NextResponse.json({ error: "Invalid pipeline stage." }, { status: 400 });
    }
    const result = await transitionLeadStage({
      actorId: user.id,
      actorRole: role,
      leadId: id,
      toStage: body.toStage,
      note: body.note,
      lostReason: body.lostReason,
      nextFollowUpAt: body.nextFollowUpAt,
    });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ ok: true, lead: result.lead });
  }

  const result = await reassignLead({
    actorId: user.id,
    actorRole: role,
    leadId: id,
    assigneeUserId: body.assigneeUserId ?? null,
    reason: body.reason,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, lead: result.lead });
}
