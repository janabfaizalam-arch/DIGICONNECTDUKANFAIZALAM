import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/balance-sheets/admin-api";
import { renderProjectReportPdf } from "@/lib/project-reports/pdf";
import { getProjectReport } from "@/lib/project-reports/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  const report = await getProjectReport((await params).id);
  if (!report) return NextResponse.json({ message: "DPR nahi mili." }, { status: 404 });
  const pdf = await renderProjectReportPdf(report);
  const safeName = report.input.businessName.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(0, 60) || "project-report";
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="DPR-${safeName}-${report.reference}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
