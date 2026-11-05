import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/balance-sheets/admin-api";
import { balanceSheetSchema, firstIssue } from "@/lib/balance-sheets/schema";
import { createBalanceSheet, finalBlocker, listBalanceSheets } from "@/lib/balance-sheets/store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  const url = new URL(request.url);
  const sheets = await listBalanceSheets({ query: url.searchParams.get("q") ?? "", status: url.searchParams.get("status") ?? "all" });
  return NextResponse.json({ sheets });
}

export async function POST(request: Request) {
  const { user, denied } = await requireAdmin();
  if (denied) return denied;

  const parsed = balanceSheetSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: firstIssue(parsed.error) }, { status: 400 });
  const blocker = finalBlocker(parsed.data);
  if (blocker) return NextResponse.json({ message: blocker }, { status: 400 });

  const result = await createBalanceSheet(parsed.data, user.id);
  if (!result.ok) return NextResponse.json({ message: result.message }, { status: 500 });

  revalidatePath("/admin/balance-sheets");
  return NextResponse.json({ message: "Balance sheet saved.", id: result.id });
}
