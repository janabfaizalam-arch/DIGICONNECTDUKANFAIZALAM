import { getEnabledSocialLinks, SOCIAL_LINKS, type SocialLink, type SocialPlatform } from "@/lib/social-links";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type SocialLinkRow = {
  platform: string;
  url: string;
  handle: string;
  is_active: boolean;
  sort_order: number;
};

/** Platforms the footer knows how to render an icon and label for. */
const KNOWN: Map<string, SocialLink> = new Map(SOCIAL_LINKS.map((link) => [link.platform, link]));

function isMissingTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === "42P01" || /does not exist|schema cache/i.test(error.message ?? "");
}

/**
 * Social links for the public footer.
 *
 * Admin-managed rows replace the code defaults for the platforms they cover;
 * WhatsApp keeps its built-in entry because its URL is generated from the real
 * support number rather than typed in.
 *
 * Falls back to the code defaults when the table is absent, so a deploy that
 * lands before the migration still renders a footer.
 */
export async function getFooterSocialLinks(): Promise<SocialLink[]> {
  const fallback = getEnabledSocialLinks();

  const supabase = getSupabaseAdmin();
  if (!supabase) return fallback;

  const { data, error } = await supabase
    .from("site_social_links")
    .select("platform, url, handle, is_active, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    if (!isMissingTable(error)) {
      console.error("[social-links] load_failed", { code: error.code, error: error.message });
    }
    return fallback;
  }

  const rows = (data ?? []) as SocialLinkRow[];

  const managed: SocialLink[] = [];
  for (const row of rows) {
    const known = KNOWN.get(row.platform);
    const url = String(row.url ?? "").trim();
    // An unknown platform has no icon, and a non-https URL is not something to
    // put in front of customers.
    if (!known || !url.startsWith("https://")) continue;
    managed.push({
      ...known,
      url,
      handle: String(row.handle ?? "").trim() || known.handle,
      enabled: true,
    });
  }

  // WhatsApp's URL is derived from the support number, so it is never overridden
  // by a typed-in row; keep the built-in entry and drop any duplicate.
  const whatsapp = fallback.filter((link) => link.platform === "whatsapp");
  const withoutWhatsapp = managed.filter((link) => link.platform !== "whatsapp");

  const combined = [...withoutWhatsapp, ...whatsapp];
  return combined.length ? combined : fallback;
}

/** Every known platform, merged with whatever the admin has saved. */
export async function listSocialLinksForAdmin(): Promise<{
  rows: Array<{ platform: SocialPlatform; label: string; url: string; handle: string; is_active: boolean; sort_order: number }>;
  tableMissing: boolean;
}> {
  const base = SOCIAL_LINKS
    // WhatsApp is generated from the support number and has nothing to edit.
    .filter((link) => link.platform !== "whatsapp")
    .map((link, index) => ({
      platform: link.platform,
      label: link.label,
      url: "",
      handle: link.handle ?? "",
      is_active: false,
      sort_order: index,
    }));

  const supabase = getSupabaseAdmin();
  if (!supabase) return { rows: base, tableMissing: false };

  const { data, error } = await supabase
    .from("site_social_links")
    .select("platform, url, handle, is_active, sort_order");

  if (error) return { rows: base, tableMissing: isMissingTable(error) };

  const saved = new Map((data ?? []).map((row) => [String(row.platform), row as SocialLinkRow]));

  return {
    rows: base.map((row) => {
      const match = saved.get(row.platform);
      if (!match) return row;
      return {
        ...row,
        url: String(match.url ?? ""),
        handle: String(match.handle ?? "") || row.handle,
        is_active: Boolean(match.is_active),
        sort_order: Number(match.sort_order ?? row.sort_order),
      };
    }),
    tableMissing: false,
  };
}

