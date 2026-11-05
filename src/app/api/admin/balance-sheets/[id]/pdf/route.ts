import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/balance-sheets/admin-api";
import { renderBalanceSheetPdf } from "@/lib/balance-sheets/pdf";
import { getBalanceSheet } from "@/lib/balance-sheets/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { denied } = await requireAdmin();
  if (denied) return denied;

  const sheet = await getBalanceSheet((await params).id);
  if (!sheet) return NextResponse.json({ message: "Balance sheet not found." }, { status: 404 });

  const pdf = await renderBalanceSheetPdf(sheet);
  const safeName = sheet.businessName.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(0, 60) || "balance-sheet";
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${safeName}-${sheet.reference}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
