import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser, getCurrentUserRole } from "@/lib/auth";
import { currentUserHasCapability } from "@/lib/crm/permissions";
import { createWalkInApplication } from "@/lib/crm/walk-in-application";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const newCustomerSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  mobile: z.string().trim().min(10).max(20),
  alternateMobile: z.string().trim().max(20).optional().nullable(),
  address: z.string().trim().min(3).max(400),
  pincode: z.string().trim().regex(/^\d{6}$/),
  city: z.string().trim().min(2).max(120),
  district: z.string().trim().min(2).max(120),
  state: z.string().trim().min(2).max(120),
  referralSource: z.string().trim().max(120).optional().nullable(),
});

const schema = z
  .object({
    idempotencyKey: z.string().trim().min(8).max(120),
    customerId: z.string().uuid().optional().nullable(),
    newCustomer: newCustomerSchema.optional().nullable(),
    serviceSlug: z.string().trim().min(2).max(120),
    notes: z.string().trim().max(1000).optional().nullable(),
    assigneeUserId: z.string().uuid().optional().nullable(),
    priceOverride: z.number().finite().nonnegative().optional().nullable(),
    overrideReason: z.string().trim().max(240).optional().nullable(),
  })
  .refine((value) => Boolean(value.customerId || value.newCustomer), {
    message: "customerId or newCustomer is required",
  });

/**
 * Atomic-ish walk-in application create:
 * existing customerId OR newCustomer → service → assignment history → WhatsApp outbox (outside DB tx).
 * Temporary PIN returned only when a new customer was created in this request.
 */
export async function POST(request: Request) {
  const rate = checkRateLimit(`admin-walk-in-app:${getClientIp(request)}`, 20, 60_000);
  if (!rate.ok) return rateLimitResponse(rate.retryAfter);

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = await currentUserHasCapability("applications.create");
  if (!allowed.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const walkInAllowed = await currentUserHasCapability("walk_in.create");
  if (!walkInAllowed.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid application payload." }, { status: 400 });
  }

  const role = await getCurrentUserRole(user);
  const result = await createWalkInApplication({
    actorId: user.id,
    actorRole: role,
    idempotencyKey: body.idempotencyKey,
    customerId: body.customerId,
    newCustomer: body.newCustomer,
    serviceSlug: body.serviceSlug,
    notes: body.notes,
    assigneeUserId: body.assigneeUserId,
    priceOverride: body.priceOverride,
    overrideReason: body.overrideReason,
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.error,
        customerId: result.customerId,
      },
      { status: result.status },
    );
  }

  // Never log temporaryPin.
  console.info("[walk-in-app] application_created", {
    applicationId: result.applicationId,
    customerId: result.customerId,
    mobileMasked: result.mobileMasked,
    serviceSlug: result.serviceSlug,
    amount: result.amount,
    assignmentReason: result.assignmentReason,
    whatsapp: result.whatsapp,
    deduped: result.deduped,
    customerCreatedInRequest: result.customerCreatedInRequest,
    actorId: user.id,
  });

  return NextResponse.json({
    ok: true,
    deduped: result.deduped,
    customerId: result.customerId,
    applicationId: result.applicationId,
    workId: result.workId,
    customerName: result.customerName,
    mobileMasked: result.mobileMasked,
    serviceSlug: result.serviceSlug,
    serviceName: result.serviceName,
    amount: result.amount,
    paymentStatus: result.paymentStatus,
    status: result.status,
    estimatedCompletion: result.estimatedCompletion,
    assignmentLabel: result.assignmentLabel,
    assignmentReason: result.assignmentReason,
    assigneeId: result.assigneeId,
    whatsapp: result.whatsapp,
    temporaryPin: result.temporaryPin,
    temporaryPinShownOnce: result.temporaryPinShownOnce,
    next: {
      applicationHref: `/admin/applications/${encodeURIComponent(result.applicationId)}`,
      customerHref: `/admin/customers/${encodeURIComponent(result.customerId)}`,
      unassignedHref: "/admin/applications?agent=unassigned",
      anotherHref: "/admin/customers/walk-in",
    },
  });
}
