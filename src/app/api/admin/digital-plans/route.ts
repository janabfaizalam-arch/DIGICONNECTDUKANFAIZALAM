import { NextResponse } from "next/server";

import { readJson, requireAdmin } from "@/lib/digital-plans/admin-auth";
import { revalidateDigitalCatalogue } from "@/lib/digital-plans/revalidate";
import { firstIssue, planInputSchema } from "@/lib/digital-plans/schema";
import { listAddonsForAdmin, listPlansForAdmin, savePlan } from "@/lib/digital-plans/store";

export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  try {
    const [plans, addons] = await Promise.all([listPlansForAdmin(), listAddonsForAdmin()]);
    return NextResponse.json({ plans, addons });
  } catch {
    return NextResponse.json({ error: "Packages could not be loaded." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const parsed = planInputSchema.safeParse(await readJson(request));
  if (!parsed.success) return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
  const result = await savePlan(null, parsed.data, gate.userId);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  revalidateDigitalCatalogue([parsed.data.slug]);
  return NextResponse.json({ ok: true, id: result.value.id });
}
