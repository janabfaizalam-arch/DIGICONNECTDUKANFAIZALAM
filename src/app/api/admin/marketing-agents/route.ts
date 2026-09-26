import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { platformConfigStatus, resolveMarketingAgentsMode } from "@/lib/marketing-agents/config";
import { listMarketingRuns, runMarketingAgents } from "@/lib/marketing-agents/orchestrator";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const role = await getCurrentUserRole(user);
  if (!isAdminRole(role)) return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { user };
}

export async function GET(request: Request) {
  const rate = checkRateLimit(`admin-marketing-agents:${getClientIp(request)}`, 60, 60_000);
  if (!rate.ok) return rateLimitResponse(rate.retryAfter);
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { rows, tableMissing } = await listMarketingRuns(20);
  return NextResponse.json({
    mode: resolveMarketingAgentsMode(),
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    platforms: platformConfigStatus(),
    runs: rows,
    tableMissing,
  });
}

const runSchema = z.object({
  mode: z.enum(["draft", "live"]).default("draft"),
  serviceSlug: z.string().trim().min(1).max(120).optional(),
});

export async function POST(request: Request) {
  // Each run costs several Gemini calls and may post publicly; keep it slow.
  const rate = checkRateLimit(`admin-marketing-agents-run:${getClientIp(request)}`, 5, 10 * 60_000);
  if (!rate.ok) return rateLimitResponse(rate.retryAfter);
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const parsed = runSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const outcome = await runMarketingAgents({
    trigger: "manual",
    requestedMode: parsed.data.mode,
    serviceSlug: parsed.data.serviceSlug,
    userId: auth.user.id,
  });
  return NextResponse.json(outcome, { status: outcome.ok ? 200 : 409 });
}
