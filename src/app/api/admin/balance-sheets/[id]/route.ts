import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/balance-sheets/admin-api";
import { balanceSheetSchema, firstIssue } from "@/lib/balance-sheets/schema";
import { deleteBalanceSheet, finalBlocker, getBalanceSheet, updateBalanceSheet } from "@/lib/balance-sheets/store";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  const sheet = await getBalanceSheet((await params).id);
  if (!sheet) return NextResponse.json({ message: "Balance sheet not found." }, { status: 404 });
  return NextResponse.json({ sheet });
}

export async function PUT(request: Request, { params }: Context) {
  const { user, denied } = await requireAdmin();
  if (denied) return denied;
  const { id } = await params;

  const parsed = balanceSheetSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: firstIssue(parsed.error) }, { status: 400 });
  const blocker = finalBlocker(parsed.data);
  if (blocker) return NextResponse.json({ message: blocker }, { status: 400 });

  const result = await updateBalanceSheet(id, parsed.data, user.id);
  if (!result.ok) return NextResponse.json({ message: result.message }, { status: result.message === "Balance sheet not found." ? 404 : 500 });

  revalidatePath("/admin/balance-sheets");
  revalidatePath(`/admin/balance-sheets/${id}`);
  return NextResponse.json({ message: "Balance sheet saved.", id });
}

export async function DELETE(_request: Request, { params }: Context) {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  const { id } = await params;
  const ok = await deleteBalanceSheet(id);
  if (!ok) return NextResponse.json({ message: "The balance sheet could not be deleted." }, { status: 500 });
  revalidatePath("/admin/balance-sheets");
  return NextResponse.json({ message: "Balance sheet deleted." });
}
