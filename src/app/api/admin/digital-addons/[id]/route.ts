import { NextResponse } from "next/server";

import { readJson, requireAdmin } from "@/lib/digital-plans/admin-auth";
import { revalidateDigitalCatalogue } from "@/lib/digital-plans/revalidate";
import { addonInputSchema, firstIssue } from "@/lib/digital-plans/schema";
import { deleteAddon, saveAddon } from "@/lib/digital-plans/store";

type Context = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: Context) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const { id } = await context.params;
  const parsed = addonInputSchema.safeParse(await readJson(request));
  if (!parsed.success) return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
  const result = await saveAddon(id, parsed.data);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  revalidateDigitalCatalogue();
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, context: Context) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const { id } = await context.params;
  const result = await deleteAddon(id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  revalidateDigitalCatalogue();
  return NextResponse.json({ ok: true });
}
