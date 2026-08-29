import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type HomepageTestimonial = {
  id: string;
  customer_name: string;
  customer_location: string;
  review_text: string;
  rating: number;
  photo_url: string | null;
  service_label: string | null;
  video_url: string | null;
  video_thumbnail_url: string | null;
  consent_confirmed: boolean;
  sort_order: number;
  is_active: boolean;
};

const SELECT =
  "id, customer_name, customer_location, review_text, rating, photo_url, service_label, video_url, video_thumbnail_url, consent_confirmed, sort_order, is_active";

function isMissingTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === "42P01" || /does not exist|schema cache/i.test(error.message ?? "");
}

/**
 * Testimonials cleared for publication.
 *
 * Consent is filtered here as well as in the RLS policy: this path uses the
 * service-role client, which bypasses RLS entirely, so the policy alone would
 * not stop an unconsented row reaching the page.
 */
export async function getHomepageTestimonials(): Promise<HomepageTestimonial[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("homepage_testimonials")
    .select(SELECT)
    .eq("is_active", true)
    .eq("consent_confirmed", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    if (!isMissingTable(error)) {
      console.error("[homepage-testimonials] load_failed", { code: error.code, error: error.message });
    }
    return [];
  }

  return (data ?? []) as HomepageTestimonial[];
}

export async function listHomepageTestimonialsForAdmin(): Promise<{
  rows: HomepageTestimonial[];
  tableMissing: boolean;
}> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { rows: [], tableMissing: false };

  const { data, error } = await supabase
    .from("homepage_testimonials")
    .select(SELECT)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    return { rows: [], tableMissing: isMissingTable(error) };
  }

  return { rows: (data ?? []) as HomepageTestimonial[], tableMissing: false };
}

export function hasVideo(testimonial: Pick<HomepageTestimonial, "video_url">): boolean {
  return Boolean(testimonial.video_url?.trim());
}

/** Average rating to one decimal, or null when there is nothing to average. */
export function averageRating(testimonials: HomepageTestimonial[]): number | null {
  const rated = testimonials.filter((t) => Number.isFinite(t.rating) && t.rating > 0);
  if (!rated.length) return null;
  const total = rated.reduce((sum, t) => sum + t.rating, 0);
  return Math.round((total / rated.length) * 10) / 10;
}

/**
 * AggregateRating structured data for the organisation.
 *
 * Deliberately withheld below a small threshold: a "5.0 from 1 review" badge is
 * both useless to readers and the kind of thing Google penalises.
 */
export const MIN_REVIEWS_FOR_AGGREGATE = 3;

export function buildAggregateRatingJsonLd(
  testimonials: HomepageTestimonial[],
  organizationName: string,
): Record<string, unknown> | null {
  const rated = testimonials.filter((t) => Number.isFinite(t.rating) && t.rating > 0);
  if (rated.length < MIN_REVIEWS_FOR_AGGREGATE) return null;

  const average = averageRating(rated);
  if (average === null) return null;

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: organizationName,
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: average,
      reviewCount: rated.length,
      bestRating: 5,
      worstRating: 1,
    },
  };
}

/**
 * Normalise a pasted video link into something embeddable.
 *
 * Admins paste whatever the share button gave them — a watch URL, a youtu.be
 * link, or a Shorts link — and a raw watch URL in an iframe is refused by
 * YouTube, so the section would silently show an empty box.
 */
export function toEmbedUrl(rawUrl: string | null | undefined): string | null {
  const url = String(rawUrl ?? "").trim();
  if (!url) return null;

  const youtube =
    url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/)([\w-]{11})/);
  if (youtube) return `https://www.youtube-nocookie.com/embed/${youtube[1]}`;

  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;

  // Anything else is only embedded when it is already an https URL.
  return url.startsWith("https://") ? url : null;
}

