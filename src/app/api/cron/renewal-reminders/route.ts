import { NextResponse } from "next/server";

import { secretsEqual } from "@/lib/communications/secrets";
import { runRenewalReminders } from "@/lib/renewals/renewals";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Daily renewal reminders (insurance, licences …). Scheduled in vercel.json.
 * Auth: `Authorization: Bearer <CRON_SECRET>` only — what Vercel Cron sends.
 * Sending still obeys CRM_NOTIFICATION_DELIVERY_MODE: unset/disabled sends nothing.
 */
export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET?.trim();
  if (!expected) {
    return NextResponse.json({ message: "CRON_SECRET is not configured." }, { status: 503 });
  }
  const match = /^Bearer\s+(\S+)$/i.exec(request.headers.get("authorization") || "");
  if (!match || !secretsEqual(match[1], expected)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const summary = await runRenewalReminders();
  console.info("[renewals-cron] processed", summary);
  return NextResponse.json({ ok: true, ...summary });
}
