import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser, getCurrentUserRole } from "@/lib/auth";
import { currentUserHasCapability } from "@/lib/crm/permissions";
import { convertLeadToApplication } from "@/lib/crm/lead-convert";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const schema = z.object({
  idempotencyKey: z.string().trim().min(8).max(120),
  serviceSlug: z.string().trim().max(120).optional().nullable(),
  existingCustomerId: z.string().uuid().optional().nullable(),
  createCustomerIfMissing: z.boolean().optional(),
  assigneeUserId: z.string().uuid().optional().nullable(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const rate = checkRateLimit(`admin-lead-convert:${getClientIp(request)}`, 20, 60_000);
  if (!rate.ok) return rateLimitResponse(rate.retryAfter);

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = await currentUserHasCapability("leads.convert");
  if (!allowed.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid conversion payload." }, { status: 400 });
  }

  const role = await getCurrentUserRole(user);
  const result = await convertLeadToApplication({
    actorId: user.id,
    actorRole: role,
    leadId: id,
    idempotencyKey: body.idempotencyKey,
    serviceSlug: body.serviceSlug,
    existingCustomerId: body.existingCustomerId,
    createCustomerIfMissing: body.createCustomerIfMissing,
    assigneeUserId: body.assigneeUserId,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, matchedCustomerId: result.matchedCustomerId },
      { status: result.status },
    );
  }

  console.info("[lead-convert] ok", {
    leadId: result.leadId,
    applicationId: result.applicationId,
    customerId: result.customerId,
    deduped: result.deduped,
    actorId: user.id,
  });

  return NextResponse.json({
    ...result,
    next: {
      applicationHref: `/admin/applications/${encodeURIComponent(result.applicationId)}`,
      customerHref: result.customerId
        ? `/admin/customers/${encodeURIComponent(result.customerId)}`
        : null,
    },
  });
}
