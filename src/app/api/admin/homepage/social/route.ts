import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { listSocialLinksForAdmin } from "@/lib/homepage/social";
import { SOCIAL_LINKS } from "@/lib/social-links";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const EDITABLE = new Set(SOCIAL_LINKS.map((link) => link.platform).filter((p) => p !== "whatsapp"));

const upsertSchema = z.object({
  platform: z.string().trim().min(2).max(40),
  url: z.string().trim().max(500),
  handle: z.string().trim().max(80).default(""),
  is_active: z.boolean().default(false),
  sort_order: z.number().int().min(0).max(999).default(0),
});

const MISSING_TABLE =
  "The site_social_links table does not exist yet. Run migration 20260812170000_site_social_links.sql in Supabase.";

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

  const { rows, tableMissing } = await listSocialLinksForAdmin();
  return NextResponse.json({ ok: true, rows, tableMissing, setupHint: tableMissing ? MISSING_TABLE : null });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  let payload: z.infer<typeof upsertSchema>;
  try {
    payload = upsertSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid social link." }, { status: 400 });
  }

  // Only platforms the footer can actually render an icon for. WhatsApp is
  // excluded because its URL is generated from the support number.
  if (!EDITABLE.has(payload.platform as never)) {
    return NextResponse.json({ error: "That platform cannot be edited here." }, { status: 400 });
  }

  const url = payload.url.trim();
  if (payload.is_active && !url.startsWith("https://")) {
    return NextResponse.json(
      { error: "Add the full https:// link before showing this profile." },
      { status: 400 },
    );
  }
  if (url && !url.startsWith("https://")) {
    return NextResponse.json({ error: "Links must start with https://" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Service unavailable" }, { status: 503 });

  const { error } = await supabase.from("site_social_links").upsert(
    {
      platform: payload.platform,
      url,
      handle: payload.handle,
      is_active: payload.is_active,
      sort_order: payload.sort_order,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "platform" },
  );

  if (error) {
    console.error("[admin-social-links] save_failed", { code: error.code, error: error.message });
    const missing = error.code === "42P01" || /does not exist|schema cache/i.test(error.message);
    return NextResponse.json({ error: missing ? MISSING_TABLE : "Could not save." }, { status: missing ? 503 : 500 });
  }

  console.info("[admin-social-links] saved", { platform: payload.platform, adminId: auth.user.id });
  return NextResponse.json({ ok: true });
}
