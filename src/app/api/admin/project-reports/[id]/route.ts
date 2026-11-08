import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/balance-sheets/admin-api";
import { firstIssue, projectReportSchema, type ProjectReportPayload } from "@/lib/project-reports/schema";
import { deleteProjectReport, finalBlocker, getProjectReport, updateProjectReport } from "@/lib/project-reports/store";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  const report = await getProjectReport((await params).id);
  if (!report) return NextResponse.json({ message: "DPR nahi mili." }, { status: 404 });
  return NextResponse.json(report);
}

export async function PUT(request: Request, { params }: Context) {
  const { user, denied } = await requireAdmin();
  if (denied) return denied;
  const parsed = projectReportSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: firstIssue(parsed.error) }, { status: 400 });
  const payload = parsed.data as ProjectReportPayload;
  const blocker = finalBlocker(payload);
  if (blocker) return NextResponse.json({ message: blocker }, { status: 400 });
  const result = await updateProjectReport((await params).id, payload, user.id);
  if (!result.ok) return NextResponse.json({ message: result.message }, { status: result.message === "DPR nahi mili." ? 404 : 500 });
  return NextResponse.json({ id: result.id });
}

export async function DELETE(_request: Request, { params }: Context) {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  const ok = await deleteProjectReport((await params).id);
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ message: "Delete nahi ho payi." }, { status: 500 });
}
