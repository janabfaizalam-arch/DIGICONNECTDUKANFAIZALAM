import { NextResponse } from "next/server";
import { z } from "zod";

import { readJson, requireAdmin } from "@/lib/digital-plans/admin-auth";
import { revalidateDigitalCatalogue } from "@/lib/digital-plans/revalidate";
import { reorder } from "@/lib/digital-plans/store";

const schema = z.object({ table: z.enum(["plans", "addons"]), ids: z.array(z.string().uuid()).min(1).max(100) });

export async function POST(request: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) return NextResponse.json({ error: "Invalid order." }, { status: 400 });
  const result = await reorder(parsed.data.table === "plans" ? "digital_plans" : "digital_addons", parsed.data.ids);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  revalidateDigitalCatalogue();
  return NextResponse.json({ ok: true });
}
