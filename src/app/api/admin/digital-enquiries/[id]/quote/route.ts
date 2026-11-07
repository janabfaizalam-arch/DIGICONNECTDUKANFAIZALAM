import { NextResponse } from "next/server";

import { readJson, requireAdmin } from "@/lib/digital-plans/admin-auth";
import { getQuotePublicUrl } from "@/lib/digital-plans/links";
import { firstIssue, quoteInputSchema } from "@/lib/digital-plans/schema";
import { saveQuote } from "@/lib/digital-plans/store";

type Context = { params: Promise<{ id: string }> };

/** Save (or revise) the quotation and return the customer's private link. */
export async function PUT(request: Request, context: Context) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const { id } = await context.params;
  const parsed = quoteInputSchema.safeParse(await readJson(request));
  if (!parsed.success) return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
  const result = await saveQuote(id, parsed.data, gate.userId);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, url: getQuotePublicUrl(result.value.token) });
}
