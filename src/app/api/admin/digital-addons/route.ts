import { NextResponse } from "next/server";

import { readJson, requireAdmin } from "@/lib/digital-plans/admin-auth";
import { revalidateDigitalCatalogue } from "@/lib/digital-plans/revalidate";
import { addonInputSchema, firstIssue } from "@/lib/digital-plans/schema";
import { saveAddon } from "@/lib/digital-plans/store";

export async function POST(request: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const parsed = addonInputSchema.safeParse(await readJson(request));
  if (!parsed.success) return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
  const result = await saveAddon(null, parsed.data);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  revalidateDigitalCatalogue();
  return NextResponse.json({ ok: true, id: result.value.id });
}
