import { NextResponse } from "next/server";
import { z } from "zod";

import { readJson, requireAdmin } from "@/lib/digital-plans/admin-auth";
import { revalidateDigitalCatalogue } from "@/lib/digital-plans/revalidate";
import { firstIssue, planInputSchema } from "@/lib/digital-plans/schema";
import { deletePlan, getPlanForAdmin, getPriceHistory, savePlan, setPlanFlags } from "@/lib/digital-plans/store";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const { id } = await context.params;
  const plan = await getPlanForAdmin(id).catch(() => null);
  if (!plan) return NextResponse.json({ error: "Plan not found." }, { status: 404 });
  return NextResponse.json({ plan, priceHistory: await getPriceHistory(id) });
}

export async function PUT(request: Request, context: Context) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const { id } = await context.params;
  const before = await getPlanForAdmin(id).catch(() => null);
  if (!before) return NextResponse.json({ error: "Plan not found." }, { status: 404 });
  const parsed = planInputSchema.safeParse(await readJson(request));
  if (!parsed.success) return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
  const result = await savePlan(id, parsed.data, gate.userId);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  revalidateDigitalCatalogue([before.slug, parsed.data.slug]);
  return NextResponse.json({ ok: true, id });
}

const flagsSchema = z.object({ isActive: z.boolean().optional(), isRecommended: z.boolean().optional() });

/** Quick switches from the plans list: enable/disable, recommended. */
export async function PATCH(request: Request, context: Context) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const { id } = await context.params;
  const parsed = flagsSchema.safeParse(await readJson(request));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const result = await setPlanFlags(id, parsed.data, gate.userId);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  const plan = await getPlanForAdmin(id).catch(() => null);
  revalidateDigitalCatalogue(plan ? [plan.slug] : []);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, context: Context) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const { id } = await context.params;
  const plan = await getPlanForAdmin(id).catch(() => null);
  if (!plan) return NextResponse.json({ error: "Plan not found." }, { status: 404 });
  const result = await deletePlan(id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  revalidateDigitalCatalogue([plan.slug]);
  return NextResponse.json({ ok: true });
}
