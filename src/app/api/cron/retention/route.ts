import { NextResponse } from "next/server";

import { secretsEqual } from "@/lib/communications/secrets";
import { runRetention } from "@/lib/privacy/retention";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Daily retention clean-up (Vercel cron).
 *
 * Deletes only categories whose RETENTION_*_DAYS variable is set — see
 * src/lib/privacy/retention.ts. With none set it reports what it skipped and
 * deletes nothing.
 */
export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET?.trim();
  if (!expected || expected.length < 16) {
    return NextResponse.json({ message: "CRON_SECRET is not configured." }, { status: 503 });
  }
  const header = request.headers.get("authorization") ?? "";
  if (!secretsEqual(header, `Bearer ${expected}`)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ message: "Service unavailable." }, { status: 503 });

  const results = await runRetention(supabase);
  return NextResponse.json({ ok: true, results });
}
