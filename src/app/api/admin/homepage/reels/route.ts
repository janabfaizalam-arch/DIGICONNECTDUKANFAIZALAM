import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { listHomepageReelsForAdmin, resolveReelSource, safeReelHref } from "@/lib/homepage/reels";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { HOMEPAGE_TAGS } from "@/lib/homepage/cache";

export const dynamic = "force-dynamic";

const httpsUrl = z
  .string()
  .trim()
  .url()
  .refine((value) => value.startsWith("https://"), "Links must start with https://");

const upsertSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(2).max(120),
  caption: z.string().trim().max(240).default(""),
  video_url: httpsUrl,
  poster_url: httpsUrl.optional().nullable(),
  cta_label: z.string().trim().max(40).optional().nullable(),
  cta_href: z.string().trim().max(500).optional().nullable(),
  sort_order: z.number().int().min(0).max(9999).default(0),
  is_active: z.boolean().default(true),
});

const MISSING_TABLE =
  "The homepage_reels table does not exist yet. Run migration 20260812150000_homepage_reels.sql in Supabase.";

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

  const { rows, tableMissing } = await listHomepageReelsForAdmin();
  return NextResponse.json({ ok: true, rows, tableMissing, setupHint: tableMissing ? MISSING_TABLE : null });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  let payload: z.infer<typeof upsertSchema>;
  try {
    payload = upsertSchema.parse(await request.json());
  } catch {
    return NextResponse.json(
      { error: "Title and an https video link are required." },
      { status: 400 },
    );
  }

  // Reject at save time rather than letting a dead card reach the homepage.
  if (resolveReelSource(payload.video_url).kind === "unsupported") {
    return NextResponse.json(
      {
        error:
          "That video link cannot be played. Use a direct .mp4/.webm/.mov file, or a YouTube Shorts or Vimeo link.",
      },
      { status: 400 },
    );
  }

  // The CTA is rendered as an anchor on a public page, so a javascript: value
  // would execute for every visitor.
  if (payload.cta_href && !safeReelHref(payload.cta_href)) {
    return NextResponse.json(
      { error: "The button link must be an internal path (/services) or an https:// URL." },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Service unavailable" }, { status: 503 });

  const row = {
    ...(payload.id ? { id: payload.id } : {}),
    title: payload.title,
    caption: payload.caption,
    video_url: payload.video_url,
    poster_url: payload.poster_url || null,
    cta_label: payload.cta_label || null,
    cta_href: payload.cta_href || null,
    sort_order: payload.sort_order,
    is_active: payload.is_active,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from("homepage_reels").upsert(row).select("id").maybeSingle();

  if (error) {
    console.error("[admin-homepage-reels] save_failed", { code: error.code, error: error.message });
    const missing = error.code === "42P01" || /does not exist|schema cache/i.test(error.message);
    return NextResponse.json({ error: missing ? MISSING_TABLE : "Could not save." }, { status: missing ? 503 : 500 });
  }

  console.info("[admin-homepage-reels] saved", { id: data?.id, adminId: auth.user.id });
  // The public page reads this through a cache; clear it now rather
  // than leaving an admin to wonder why their edit has not appeared.
  revalidateTag(HOMEPAGE_TAGS.reels);
  return NextResponse.json({ ok: true, id: data?.id });
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Service unavailable" }, { status: 503 });

  const { error } = await supabase.from("homepage_reels").delete().eq("id", id);
  if (error) {
    console.error("[admin-homepage-reels] delete_failed", { code: error.code });
    return NextResponse.json({ error: "Could not delete." }, { status: 500 });
  }

  console.info("[admin-homepage-reels] deleted", { id, adminId: auth.user.id });
  // The public page reads this through a cache; clear it now rather
  // than leaving an admin to wonder why their edit has not appeared.
  revalidateTag(HOMEPAGE_TAGS.reels);
  return NextResponse.json({ ok: true });
}
