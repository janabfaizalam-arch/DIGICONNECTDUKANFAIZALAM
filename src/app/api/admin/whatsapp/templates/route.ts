import { NextResponse } from "next/server";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { loadTemplateStatusReport } from "@/lib/whatsapp/template-status";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Admin: which registry templates Meta has actually approved (read live from the WABA). */
export async function GET() {
  const user = await getCurrentUser();
  if (!user || !isAdminRole(await getCurrentUserRole(user))) {
    return NextResponse.json({ ok: false, error: "Admin access required." }, { status: 403 });
  }
  const report = await loadTemplateStatusReport();
  return NextResponse.json(report, { status: report.ok ? 200 : 503 });
}
