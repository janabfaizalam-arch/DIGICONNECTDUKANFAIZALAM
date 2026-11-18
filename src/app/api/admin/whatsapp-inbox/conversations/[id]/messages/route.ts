import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { getInboxMessages } from "@/lib/whatsapp/inbox-ops";
import { sendInboxReply } from "@/lib/whatsapp/inbox-send";
import type { WhatsAppTemplateKey } from "@/lib/whatsapp/template-registry";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const sendReplySchema = z.object({
  type: z.enum(["text", "template"]).default("text"),
  textBody: z.string().max(4096).optional(),
  templateKey: z.string().optional(),
  templateName: z.string().optional(),
  templateParams: z.array(z.string()).optional(),
  requestId: z.string().optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const rate = checkRateLimit(`admin-inbox-msgs:${getClientIp(request)}`, 120, 60_000);
  if (!rate.ok) return rateLimitResponse(rate.retryAfter);

  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  if (!user || !isAdminRole(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing conversation ID" }, { status: 400 });

  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? 50);
  const markRead = url.searchParams.get("markRead") !== "false";

  const result = await getInboxMessages(id, { limit, markRead });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const rate = checkRateLimit(`admin-inbox-send:${getClientIp(request)}`, 60, 60_000);
  if (!rate.ok) return rateLimitResponse(rate.retryAfter);

  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  if (!user || !isAdminRole(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing conversation ID" }, { status: 400 });

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = sendReplySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid send payload" }, { status: 400 });
  }

  const result = await sendInboxReply({
    conversationId: id,
    type: parsed.data.type,
    textBody: parsed.data.textBody,
    templateKey: parsed.data.templateKey as WhatsAppTemplateKey | undefined,
    templateName: parsed.data.templateName,
    templateParams: parsed.data.templateParams,
    actorId: user.id,
    requestId: parsed.data.requestId,
  });

  if (!result.ok) {
    const isConflict =
      result.code === "outside_service_window" ||
      result.code === "duplicate_send_in_progress" ||
      result.code === "previous_attempt_unknown" ||
      result.code === "meta_api_ambiguous_timeout";
    const status = isConflict ? 409 : 400;
    return NextResponse.json({ error: result.error, code: result.code, messageId: result.messageId }, { status });
  }

  return NextResponse.json(result);
}
