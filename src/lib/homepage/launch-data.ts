import "server-only";

import { getPublishedArticles } from "@/lib/articles";
import { cachePublicRead, HOMEPAGE_TAGS } from "@/lib/homepage/cache";
import { getCachedPublicServices } from "@/lib/homepage/cached";
import {
  LAUNCH_MODULES,
  resolveLaunchModules,
  type CatalogueEntry,
  type CheckoutEntry,
} from "@/lib/homepage/launch-catalog";
import { SERVICE_DIRECTORY_META } from "@/lib/services/directory-meta";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const LAUNCH_SLUGS = [...new Set(LAUNCH_MODULES.flatMap((mod) => mod.slugs))];

/**
 * What checkout charges for each launch service.
 *
 * Read from `agent_services`, the table /api/create-order prices orders from,
 * so the homepage shows the figure a customer will actually be asked to pay.
 * Only the customer-facing columns are selected: payout and cost columns stay
 * on the server and never reach the page.
 */
async function loadCheckoutEntries(): Promise<CheckoutEntry[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from("agent_services")
      .select("slug, title, customer_fee, government_fee_type, government_fee_amount, processing_time, is_active")
      .in("slug", LAUNCH_SLUGS)
      .eq("is_active", true);

    if (error) {
      console.error("[homepage/launch] checkout price lookup failed", error.message);
      return [];
    }

    return (data ?? []).map((row) => ({
      slug: String(row.slug),
      title: String(row.title ?? row.slug),
      fee: Number(row.customer_fee ?? 0) || 0,
      governmentFeeType:
        row.government_fee_type === "included" || row.government_fee_type === "extra" ? row.government_fee_type : "not_applicable",
      governmentFeeAmount: Number(row.government_fee_amount ?? 0) || 0,
      processingTime: row.processing_time ? String(row.processing_time) : null,
    }));
  } catch (error) {
    console.error("[homepage/launch] checkout price lookup failed", error);
    return [];
  }
}

/** Cached with the public services, so a catalogue edit clears both together. */
const getCachedCheckoutEntries = cachePublicRead(loadCheckoutEntries, "launch-checkout-prices", HOMEPAGE_TAGS.services);

/** Only turnarounds RNOS has actually configured — never the directory's generic default. */
const QUOTED_TIMELINES: Record<string, string> = Object.fromEntries(
  Object.entries(SERVICE_DIRECTORY_META).map(([slug, meta]) => [slug, meta.processingTime]),
);

export type GuideCard = {
  slug: string;
  title: string;
  excerpt: string;
  category: string | null;
  image: string | null;
  updatedAt: string;
  minutes: number;
};

const GUIDE_TOPICS = /compan|incorporat|llp|opc|gst|msme|udyam|startup|trademark|roc|complian|business|tax|fssai|licen/i;

async function loadGuides(): Promise<GuideCard[]> {
  try {
    const articles = await getPublishedArticles();
    return articles
      .map((article) => {
        const text = `${article.excerpt ?? ""} ${article.content ?? ""}`.replace(/<[^>]+>/g, " ");
        const words = text.trim().split(/\s+/).filter(Boolean).length;
        return {
          slug: article.slug,
          title: article.title,
          excerpt: article.excerpt || article.seo_description || "",
          category: article.category,
          image: article.featured_image_url,
          updatedAt: article.updated_at || article.created_at,
          minutes: Math.max(1, Math.round(words / 200)),
          relevant: GUIDE_TOPICS.test(`${article.title} ${article.category ?? ""} ${(article.keywords ?? []).join(" ")}`),
        };
      })
      .sort((a, b) => Number(b.relevant) - Number(a.relevant))
      .slice(0, 4)
      .map((card): GuideCard => ({
        slug: card.slug,
        title: card.title,
        excerpt: card.excerpt,
        category: card.category,
        image: card.image,
        updatedAt: card.updatedAt,
        minutes: card.minutes,
      }));
  } catch (error) {
    console.warn("[homepage/launch] guides unavailable", error);
    return [];
  }
}

export async function getLaunchHomepageData() {
  const [services, checkout, guides] = await Promise.all([getCachedPublicServices(), getCachedCheckoutEntries(), loadGuides()]);

  const catalogue: CatalogueEntry[] = services.map((service) => ({
    slug: service.slug,
    title: service.title,
    shortDescription: service.shortDescription,
    priceLabel: service.priceLabel,
    amount: service.amount,
  }));

  return {
    catalogue,
    resolved: resolveLaunchModules(catalogue, checkout, QUOTED_TIMELINES),
    guides,
  };
}

export type LaunchHomepageData = Awaited<ReturnType<typeof getLaunchHomepageData>>;
