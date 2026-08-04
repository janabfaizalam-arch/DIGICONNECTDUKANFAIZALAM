import { NextResponse } from "next/server";

import { processCrmSyncQueue } from "@/lib/crmSync";
import { isGoogleSheetsConfigured } from "@/lib/google";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET;

  if (!expected) {
    return NextResponse.json({ message: "CRON_SECRET is not configured." }, { status: 500 });
  }

  if (authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!isGoogleSheetsConfigured()) {
    return NextResponse.json({ ok: true, skipped: "not_configured", processed: 0 });
  }

  const result = await processCrmSyncQueue({ limit: 25 });
  return NextResponse.json({ ok: true, ...result });
}
