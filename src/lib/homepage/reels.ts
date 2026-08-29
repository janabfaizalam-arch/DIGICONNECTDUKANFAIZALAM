import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type HomepageReel = {
  id: string;
  title: string;
  caption: string;
  video_url: string;
  poster_url: string | null;
  cta_label: string | null;
  cta_href: string | null;
  sort_order: number;
  is_active: boolean;
};

const SELECT =
  "id, title, caption, video_url, poster_url, cta_label, cta_href, sort_order, is_active";

function isMissingTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === "42P01" || /does not exist|schema cache/i.test(error.message ?? "");
}

/**
 * How a reel should be played.
 *
 * A direct file can autoplay muted inline, which is what makes a reel rail feel
 * like a reel rail. An embedded short cannot — it has to go in an iframe with
 * the provider's own chrome. Deciding this once, here, keeps the component from
 * guessing per render.
 */
export type ReelSource =
  | { kind: "file"; src: string }
  | { kind: "embed"; src: string }
  | { kind: "unsupported" };

const VIDEO_FILE_PATTERN = /\.(mp4|webm|mov)(\?|#|$)/i;

export function resolveReelSource(rawUrl: string | null | undefined): ReelSource {
  const url = String(rawUrl ?? "").trim();
  if (!url.startsWith("https://")) return { kind: "unsupported" };

  if (VIDEO_FILE_PATTERN.test(url)) return { kind: "file", src: url };

  const youtube = url.match(
    /(?:youtube\.com\/shorts\/|youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/,
  );
  if (youtube) {
    // Muted + loop + no related videos, so an embedded short behaves as close
    // to an inline reel as the provider allows.
    const id = youtube[1];
    return {
      kind: "embed",
      src: `https://www.youtube-nocookie.com/embed/${id}?autoplay=0&mute=1&loop=1&playlist=${id}&rel=0&playsinline=1`,
    };
  }

  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return { kind: "embed", src: `https://player.vimeo.com/video/${vimeo[1]}?muted=1&loop=1` };

  return { kind: "unsupported" };
}

export function isPlayableReel(reel: Pick<HomepageReel, "video_url">): boolean {
  return resolveReelSource(reel.video_url).kind !== "unsupported";
}

/**
 * Only same-origin paths or https links are allowed as a reel CTA.
 *
 * The target comes from admin input and is rendered as an anchor, so a
 * `javascript:` value would execute on the public homepage.
 */
export function safeReelHref(rawHref: string | null | undefined): string | null {
  const href = String(rawHref ?? "").trim();
  if (!href) return null;
  if (href.startsWith("//")) return null;
  if (href.startsWith("/")) return href;
  return href.startsWith("https://") ? href : null;
}

export async function getHomepageReels(): Promise<HomepageReel[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("homepage_reels")
    .select(SELECT)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    if (!isMissingTable(error)) {
      console.error("[homepage-reels] load_failed", { code: error.code, error: error.message });
    }
    return [];
  }

  // A row whose URL we cannot play would render as a dead black card.
  return ((data ?? []) as HomepageReel[]).filter(isPlayableReel);
}

export async function listHomepageReelsForAdmin(): Promise<{ rows: HomepageReel[]; tableMissing: boolean }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { rows: [], tableMissing: false };

  const { data, error } = await supabase
    .from("homepage_reels")
    .select(SELECT)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) return { rows: [], tableMissing: isMissingTable(error) };

  return { rows: (data ?? []) as HomepageReel[], tableMissing: false };
}

/**
 * VideoObject structured data for the reel rail.
 *
 * Google requires a name, description, thumbnail and upload date; a reel with
 * no poster has no thumbnail, so it is left out rather than emitted incomplete.
 */
export function buildReelsJsonLd(
  reels: HomepageReel[],
  uploadDateIso: string,
): Record<string, unknown> | null {
  const usable = reels.filter((reel) => reel.title.trim() && reel.poster_url?.trim());
  if (!usable.length) return null;

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: usable.map((reel, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "VideoObject",
        name: reel.title.trim(),
        description: reel.caption.trim() || reel.title.trim(),
        thumbnailUrl: reel.poster_url,
        contentUrl: reel.video_url,
        uploadDate: uploadDateIso,
      },
    })),
  };
}

