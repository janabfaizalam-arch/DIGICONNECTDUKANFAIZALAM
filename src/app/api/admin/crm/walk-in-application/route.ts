import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser, getCurrentUserRole } from "@/lib/auth";
import { resolveCrmNotificationDeliveryModeDetailed } from "@/lib/automation/delivery-mode";
import { currentUserHasCapability } from "@/lib/crm/permissions";
import {
  createWalkInApplication,
  lookupWalkInApplicationByIdempotency,
} from "@/lib/crm/walk-in-application";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

function jsonError(
  status: number,
  code: string,
  message: string,
  correlationId: string,
  extra?: Record<string, unknown>,
) {
  return NextResponse.json(
    {
      ok: false,
      error: { code, message, correlationId },
      // Legacy field kept for older clients.
      message,
      correlationId,
      ...extra,
    },
    { status },
  );
}

function notificationStatusFromWhatsApp(whatsapp: string): string {
  const mode = resolveCrmNotificationDeliveryModeDetailed().mode;
  if (mode === "disabled") return "disabled";
  if (whatsapp === "configuration_required") return "disabled";
  if (whatsapp === "queued" || whatsapp === "skipped") return whatsapp;
  if (whatsapp === "sent" || whatsapp === "delivered") return "sent";
  if (whatsapp === "failed") return "failed";
  return mode;
}

/**
 * Atomic-ish walk-in application create:
 * existing customerId OR newCustomer → service → assignment history → WhatsApp outbox (outside DB tx).
 * Temporary PIN returned only when a new customer was created in this request.
 */
export async function POST(request: Request) {
  const correlationId = randomUUID();

  try {
    const rate = checkRateLimit(`admin-walk-in-app:${getClientIp(request)}`, 20, 60_000);
    if (!rate.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "RATE_LIMITED",
            message: "Too many requests. Please try again shortly.",
            correlationId,
          },
          message: "Too many requests. Please try again shortly.",
          correlationId,
        },
        { status: 429, headers: { "Retry-After": String(rate.retryAfter) } },
      );
    }

    const user = await getCurrentUser();
    if (!user) return jsonError(401, "UNAUTHORIZED", "Unauthorized", correlationId);

    const allowed = await currentUserHasCapability("applications.create");
    if (!allowed.ok) return jsonError(403, "FORBIDDEN", "Forbidden", correlationId);

    const walkInAllowed = await currentUserHasCapability("walk_in.create");
    if (!walkInAllowed.ok) return jsonError(403, "FORBIDDEN", "Forbidden", correlationId);

    let body: z.infer<typeof schema>;
    try {
      body = schema.parse(await request.json());
    } catch {
      return jsonError(400, "VALIDATION_ERROR", "Invalid application payload.", correlationId);
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
      const status = result.status || 500;
      const code =
        status === 400 || status === 422
          ? "VALIDATION_ERROR"
          : status === 401
            ? "UNAUTHORIZED"
            : status === 403
              ? "FORBIDDEN"
              : status === 404
                ? "NOT_FOUND"
                : status === 409
                  ? "CONFLICT"
                  : status === 503
                    ? "SERVICE_UNAVAILABLE"
                    : "CREATE_FAILED";
      // Log the precise rejection reason against the correlation id the
      // operator sees, so a reported failure can be traced to one log line.
      console.warn("[walk-in-app] create_rejected", {
        correlationId,
        status,
        reason: "code" in result ? result.code ?? null : null,
      });
      return jsonError(status, code, result.error, correlationId, {
        customerId: result.customerId,
        reason: "code" in result ? result.code : undefined,
      });
    }

    // Never log temporaryPin or customer PII.
    console.info("[walk-in-app] application_created", {
      correlationId,
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

    const referenceNumber = result.workId || result.applicationId.slice(0, 8);
    const notificationStatus = notificationStatusFromWhatsApp(result.whatsapp);

    return NextResponse.json({
      ok: true,
      applicationId: result.applicationId,
      referenceNumber,
      idempotentReplay: Boolean(result.deduped),
      notificationStatus,
      // Legacy / UI fields
      deduped: result.deduped,
      customerId: result.customerId,
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
      correlationId,
      next: {
        applicationHref: `/admin/applications/${encodeURIComponent(result.applicationId)}`,
        customerHref: `/admin/customers/${encodeURIComponent(result.customerId)}`,
        unassignedHref: "/admin/applications?agent=unassigned",
        anotherHref: "/admin/customers/walk-in",
      },
    });
  } catch (error) {
    console.error("[walk-in-app] unhandled_error", {
      correlationId,
      error: error instanceof Error ? error.message.slice(0, 120) : "unknown",
    });
    return jsonError(
      500,
      "INTERNAL_ERROR",
      "Application could not be created. Please check status before retrying.",
      correlationId,
    );
  }
}

/**
 * Actor-scoped idempotency recovery — never creates an application.
 */
export async function GET(request: Request) {
  const correlationId = randomUUID();

  try {
    const rate = checkRateLimit(`admin-walk-in-app-status:${getClientIp(request)}`, 40, 60_000);
    if (!rate.ok) return rateLimitResponse(rate.retryAfter);

    const user = await getCurrentUser();
    if (!user) return jsonError(401, "UNAUTHORIZED", "Unauthorized", correlationId);

    const allowed = await currentUserHasCapability("applications.create");
    if (!allowed.ok) return jsonError(403, "FORBIDDEN", "Forbidden", correlationId);

    const walkInAllowed = await currentUserHasCapability("walk_in.create");
    if (!walkInAllowed.ok) return jsonError(403, "FORBIDDEN", "Forbidden", correlationId);

    const url = new URL(request.url);
    const idempotencyKey = String(url.searchParams.get("idempotencyKey") || "").trim();
    if (idempotencyKey.length < 8) {
      return jsonError(400, "VALIDATION_ERROR", "Idempotency key is required.", correlationId);
    }

    const result = await lookupWalkInApplicationByIdempotency({
      actorId: user.id,
      idempotencyKey,
    });

    if (!result.ok) {
      return jsonError(result.httpStatus, "LOOKUP_FAILED", result.error, correlationId);
    }

    if (result.status === "not_found" || result.status === "pending") {
      return NextResponse.json({
        ok: true,
        recoveryStatus: result.status,
        correlationId,
      });
    }

    if (result.status !== "succeeded") {
      return jsonError(500, "LOOKUP_FAILED", "Could not check application status.", correlationId);
    }

    return NextResponse.json({
      ok: true,
      recoveryStatus: "succeeded",
      applicationId: result.applicationId,
      referenceNumber: result.workId || result.applicationId.slice(0, 8),
      idempotentReplay: true,
      notificationStatus: "disabled",
      deduped: true,
      customerId: result.customerId,
      workId: result.workId,
      customerName: result.customerName,
      mobileMasked: result.mobileMasked,
      serviceName: result.serviceName,
      amount: result.amount,
      paymentStatus: result.paymentStatus,
      status: result.applicationStatus,
      estimatedCompletion: result.estimatedCompletion,
      assignmentLabel: result.assignmentLabel,
      whatsapp: result.whatsapp,
      correlationId,
      next: {
        applicationHref: `/admin/applications/${encodeURIComponent(result.applicationId)}`,
        customerHref: result.customerId
          ? `/admin/customers/${encodeURIComponent(result.customerId)}`
          : "/admin/customers",
        unassignedHref: "/admin/applications?agent=unassigned",
        anotherHref: "/admin/customers/walk-in",
      },
    });
  } catch (error) {
    console.error("[walk-in-app] status_unhandled_error", {
      correlationId,
      error: error instanceof Error ? error.message.slice(0, 120) : "unknown",
    });
    return jsonError(500, "INTERNAL_ERROR", "Could not check application status.", correlationId);
  }
}
