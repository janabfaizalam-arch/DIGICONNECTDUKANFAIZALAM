import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/balance-sheets/admin-api";
import { firstIssue, projectReportSchema, type ProjectReportPayload } from "@/lib/project-reports/schema";
import { createProjectReport, finalBlocker, listProjectReports } from "@/lib/project-reports/store";

export async function GET(request: Request) {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  const url = new URL(request.url);
  return NextResponse.json({ reports: await listProjectReports({ query: url.searchParams.get("q") ?? "", status: url.searchParams.get("status") ?? "all" }) });
}

export async function POST(request: Request) {
  const { user, denied } = await requireAdmin();
  if (denied) return denied;
  const parsed = projectReportSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: firstIssue(parsed.error) }, { status: 400 });
  const payload = parsed.data as ProjectReportPayload;
  const blocker = finalBlocker(payload);
  if (blocker) return NextResponse.json({ message: blocker }, { status: 400 });
  const result = await createProjectReport(payload, user.id);
  if (!result.ok) return NextResponse.json({ message: result.message }, { status: 500 });
  return NextResponse.json({ id: result.id });
}
