import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser, getCurrentUserRole } from "@/lib/auth";
import { currentUserHasCapability } from "@/lib/crm/permissions";
import { resendWalkInApplicationWhatsApp } from "@/lib/crm/walk-in-application";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const schema = z.object({
  applicationId: z.string().uuid(),
});

export async function POST(request: Request) {
  const rate = checkRateLimit(`admin-walk-in-wa-resend:${getClientIp(request)}`, 10, 60_000);
  if (!rate.ok) return rateLimitResponse(rate.retryAfter);

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = await currentUserHasCapability("messaging.resend");
  if (!allowed.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const role = await getCurrentUserRole(user);
  const result = await resendWalkInApplicationWhatsApp({
    actorId: user.id,
    actorRole: role,
    applicationId: body.applicationId,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true, whatsapp: result.whatsapp });
}
