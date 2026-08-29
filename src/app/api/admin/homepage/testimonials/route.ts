import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { listHomepageTestimonialsForAdmin, toEmbedUrl } from "@/lib/homepage/testimonials";
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
  customer_name: z.string().trim().min(2).max(120),
  customer_location: z.string().trim().max(120).default(""),
  review_text: z.string().trim().min(10).max(1200),
  rating: z.number().int().min(1).max(5).default(5),
  photo_url: httpsUrl.optional().nullable(),
  service_label: z.string().trim().max(120).optional().nullable(),
  video_url: httpsUrl.optional().nullable(),
  video_thumbnail_url: httpsUrl.optional().nullable(),
  consent_confirmed: z.boolean().default(false),
  sort_order: z.number().int().min(0).max(9999).default(0),
  is_active: z.boolean().default(true),
});

const MISSING_TABLE =
  "The homepage_testimonials table does not exist yet. Run migration 20260812130000_homepage_faqs_testimonials.sql in Supabase.";

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

  const { rows, tableMissing } = await listHomepageTestimonialsForAdmin();
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
      { error: "Name, review text and a valid https link (if given) are required." },
      { status: 400 },
    );
  }

  // Reject a video link we could not turn into an embed, rather than saving a
  // row that renders as an empty black box on the homepage.
  if (payload.video_url && !toEmbedUrl(payload.video_url)) {
    return NextResponse.json(
      { error: "That video link cannot be embedded. Use a YouTube or Vimeo link." },
      { status: 400 },
    );
  }

  // Publishing someone's face, name or voice without consent on record is not
  // something the API should allow by accident.
  if (payload.is_active && !payload.consent_confirmed) {
    return NextResponse.json(
      { error: "Confirm the customer's consent before publishing this testimonial." },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Service unavailable" }, { status: 503 });

  const row = {
    ...(payload.id ? { id: payload.id } : {}),
    customer_name: payload.customer_name,
    customer_location: payload.customer_location,
    review_text: payload.review_text,
    rating: payload.rating,
    photo_url: payload.photo_url || null,
    service_label: payload.service_label || null,
    video_url: payload.video_url || null,
    video_thumbnail_url: payload.video_thumbnail_url || null,
    consent_confirmed: payload.consent_confirmed,
    sort_order: payload.sort_order,
    is_active: payload.is_active,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from("homepage_testimonials").upsert(row).select("id").maybeSingle();

  if (error) {
    console.error("[admin-homepage-testimonials] save_failed", { code: error.code, error: error.message });
    const missing = error.code === "42P01" || /does not exist|schema cache/i.test(error.message);
    return NextResponse.json({ error: missing ? MISSING_TABLE : "Could not save." }, { status: missing ? 503 : 500 });
  }

  console.info("[admin-homepage-testimonials] saved", { id: data?.id, adminId: auth.user.id });
  // The public page reads this through a cache; clear it now rather
  // than leaving an admin to wonder why their edit has not appeared.
  revalidateTag(HOMEPAGE_TAGS.testimonials);
  return NextResponse.json({ ok: true, id: data?.id });
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Service unavailable" }, { status: 503 });

  const { error } = await supabase.from("homepage_testimonials").delete().eq("id", id);
  if (error) {
    console.error("[admin-homepage-testimonials] delete_failed", { code: error.code });
    return NextResponse.json({ error: "Could not delete." }, { status: 500 });
  }

  console.info("[admin-homepage-testimonials] deleted", { id, adminId: auth.user.id });
  // The public page reads this through a cache; clear it now rather
  // than leaving an admin to wonder why their edit has not appeared.
  revalidateTag(HOMEPAGE_TAGS.testimonials);
  return NextResponse.json({ ok: true });
}
