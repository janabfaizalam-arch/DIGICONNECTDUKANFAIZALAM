import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { listHomepageFaqsForAdmin } from "@/lib/homepage/faqs";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { HOMEPAGE_TAGS } from "@/lib/homepage/cache";

export const dynamic = "force-dynamic";

const upsertSchema = z.object({
  id: z.string().uuid().optional(),
  question: z.string().trim().min(5).max(300),
  answer: z.string().trim().min(5).max(3000),
  category: z.string().trim().min(1).max(60).default("General"),
  sort_order: z.number().int().min(0).max(9999).default(0),
  is_active: z.boolean().default(true),
});

const MISSING_TABLE =
  "The homepage_faqs table does not exist yet. Run migration 20260812130000_homepage_faqs_testimonials.sql in Supabase.";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (!isAdminRole(await getCurrentUserRole(user))) {
    return { ok: false as const, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { ok: true as const, user };
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { rows, tableMissing } = await listHomepageFaqsForAdmin();
  return NextResponse.json({ ok: true, rows, tableMissing, setupHint: tableMissing ? MISSING_TABLE : null });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  let payload: z.infer<typeof upsertSchema>;
  try {
    payload = upsertSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Question and answer are required." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Service unavailable" }, { status: 503 });

  const row = {
    ...(payload.id ? { id: payload.id } : {}),
    question: payload.question,
    answer: payload.answer,
    category: payload.category,
    sort_order: payload.sort_order,
    is_active: payload.is_active,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from("homepage_faqs").upsert(row).select("id").maybeSingle();

  if (error) {
    console.error("[admin-homepage-faqs] save_failed", { code: error.code, error: error.message });
    const missing = error.code === "42P01" || /does not exist|schema cache/i.test(error.message);
    return NextResponse.json({ error: missing ? MISSING_TABLE : "Could not save." }, { status: missing ? 503 : 500 });
  }

  console.info("[admin-homepage-faqs] saved", { id: data?.id, adminId: auth.user.id });
  // The public page reads this through a cache; clear it now rather
  // than leaving an admin to wonder why their edit has not appeared.
  revalidateTag(HOMEPAGE_TAGS.faqs);
  return NextResponse.json({ ok: true, id: data?.id });
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Service unavailable" }, { status: 503 });

  const { error } = await supabase.from("homepage_faqs").delete().eq("id", id);
  if (error) {
    console.error("[admin-homepage-faqs] delete_failed", { code: error.code });
    return NextResponse.json({ error: "Could not delete." }, { status: 500 });
  }

  console.info("[admin-homepage-faqs] deleted", { id, adminId: auth.user.id });
  // The public page reads this through a cache; clear it now rather
  // than leaving an admin to wonder why their edit has not appeared.
  revalidateTag(HOMEPAGE_TAGS.faqs);
  return NextResponse.json({ ok: true });
}
