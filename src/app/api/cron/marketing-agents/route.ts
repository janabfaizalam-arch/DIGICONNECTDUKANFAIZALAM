import { NextResponse } from "next/server";

import { runMarketingAgents } from "@/lib/marketing-agents/orchestrator";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// Research, three writing calls, a poster and seven platforms.
export const maxDuration = 300;

/**
 * Daily: research → prompt → post → publish. Scheduled in vercel.json.
 * Does nothing unless MARKETING_AGENTS_MODE is `draft` or `live`, and never
 * runs twice on the same Indian date.
 */
export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ message: "CRON_SECRET is not configured." }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${expected}`) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const outcome = await runMarketingAgents({ trigger: "cron" });
  return NextResponse.json(outcome);
}
