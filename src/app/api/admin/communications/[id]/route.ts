import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { currentUserHasCapability } from "@/lib/crm/permissions";
import {
  cancelCommunicationOutbox,
  explicitResendCommunication,
  retryCommunicationOutbox,
} from "@/lib/communications/outbox-ops";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const rate = checkRateLimit(`admin-comms-action:${getClientIp(request)}`, 30, 60_000);
  if (!rate.ok) return rateLimitResponse(rate.retryAfter);

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

  let body: {
    action?: string;
    reason?: string;
    newEventId?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const action = String(body.action ?? "").toLowerCase();

  if (action === "retry") {
    const allowed = await currentUserHasCapability("messaging.resend");
    if (!allowed.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const result = await retryCommunicationOutbox({
      outboxId: id,
      actorId: user.id,
      reason: body.reason,
    });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({
      ok: true,
      id: result.id,
      summary: {
        claimed: result.summary.claimed,
        sent: result.summary.sent,
        retryable: result.summary.retryable,
        failed: result.summary.failed,
        configurationRequired: result.summary.configurationRequired,
      },
    });
  }

  if (action === "cancel") {
    const allowed = await currentUserHasCapability("messaging.cancel");
    if (!allowed.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const result = await cancelCommunicationOutbox({
      outboxId: id,
      actorId: user.id,
      reason: String(body.reason ?? ""),
    });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ ok: true });
  }

  if (action === "explicit_resend") {
    const allowed = await currentUserHasCapability("messaging.resend");
    if (!allowed.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const result = await explicitResendCommunication({
      sourceOutboxId: id,
      actorId: user.id,
      reason: String(body.reason ?? ""),
      newEventId: String(body.newEventId ?? ""),
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error, code: result.code }, { status: result.status });
    }
    return NextResponse.json({ ok: true, id: result.id, deduped: result.deduped });
  }

  return NextResponse.json(
    { error: "Unsupported action. Use retry, cancel, or explicit_resend." },
    { status: 400 },
  );
}
