import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { findLeadDuplicates, ingestLead } from "@/lib/crm/leads";
import { isLeadSource, isValidLeadMobile, normalizeLeadMobile } from "@/lib/crm/leads-core";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  mobile: z.string().trim().min(10).max(20),
  service: z.string().trim().max(120).optional().nullable(),
  source: z.string().trim().optional(),
  address: z.string().trim().max(500).optional().nullable(),
  city: z.string().trim().max(120).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  campaignAttribution: z.string().trim().max(240).optional().nullable(),
  referralCode: z.string().trim().max(120).optional().nullable(),
  email: z.string().trim().email().optional().nullable().or(z.literal("")),
  nextFollowUpAt: z.string().optional().nullable(),
  assigneeUserId: z.string().uuid().optional().nullable(),
  idempotencyKey: z.string().trim().min(8).max(120).optional(),
});

export async function POST(request: Request) {
  const rate = checkRateLimit(`admin-lead-create:${getClientIp(request)}`, 30, 60_000);
  if (!rate.ok) return rateLimitResponse(rate.retryAfter);

  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminRole(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid lead payload." }, { status: 400 });
  }

  const mobile = normalizeLeadMobile(body.mobile);
  if (!isValidLeadMobile(mobile)) {
    return NextResponse.json({ error: "Enter a valid 10-digit Indian mobile number." }, { status: 400 });
  }

  const source = isLeadSource(body.source) ? body.source : "manual";

  const assigneeUserId = body.assigneeUserId ?? null;
  if (assigneeUserId) {
    const { listEligibleLeadAssignees } = await import("@/lib/crm/lead-convert");
    const eligible = await listEligibleLeadAssignees();
    if (!eligible.some((row) => row.id === assigneeUserId)) {
      return NextResponse.json({ error: "Assignee is not an eligible CRM operational user." }, { status: 400 });
    }
  }

  const result = await ingestLead({
    source,
    name: body.name,
    mobile,
    service: body.service,
    address: body.address,
    city: body.city,
    notes: body.notes,
    campaignAttribution: body.campaignAttribution,
    referralCode: body.referralCode,
    email: body.email || null,
    externalId: body.idempotencyKey ? `manual:${body.idempotencyKey}` : undefined,
    actorId: user.id,
    actorIsAdmin: true,
    agentId: assigneeUserId,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  if (body.nextFollowUpAt && !Number.isNaN(Date.parse(body.nextFollowUpAt))) {
    const { scheduleLeadFollowUp } = await import("@/lib/crm/lead-followups");
    await scheduleLeadFollowUp({
      actorId: user.id,
      actorRole: role,
      leadId: result.leadId,
      scheduledAt: body.nextFollowUpAt,
      note: "Initial follow-up",
      idempotencyKey: body.idempotencyKey ? `fu:${body.idempotencyKey}` : undefined,
    });
  }

  const duplicates = await findLeadDuplicates({
    mobileInput: mobile,
    service: body.service,
    allowGlobal: true,
  });

  return NextResponse.json({
    ok: true,
    leadId: result.leadId,
    deduped: result.deduped,
    duplicates: duplicates
      .filter((row) => row.leadId !== result.leadId)
      .slice(0, 5)
      .map((row) => ({ id: row.leadId, name: row.name, mobile: row.mobile, matchType: row.kind })),
  });
}
