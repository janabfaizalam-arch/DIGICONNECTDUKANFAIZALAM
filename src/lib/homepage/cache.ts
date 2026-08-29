import { unstable_cache } from "next/cache";

/**
 * Caching for the public marketing content.
 *
 * The homepage and the services directory are `force-dynamic`, and between
 * them they read six tables — services, hero slides, FAQs, testimonials,
 * reels and the footer's social links — on every single visit, by every
 * visitor. None of it is per-visitor and none of it changes unless somebody
 * edits it in the admin panel, so every one of those reads was the same
 * answer fetched again, and the page could not paint until all of them came
 * back. That is most of what "the site is still loading" was.
 *
 * Each loader is cached under its own tag, so an admin edit clears exactly
 * the content it changed and nothing else. The time window is a backstop for
 * anything written outside the admin panel — straight into the database, say
 * — rather than the main mechanism.
 *
 * These loaders all read through the service-role client and take no
 * per-request arguments, which is what makes them safe to cache: none of them
 * touches cookies or headers, so there is no request-specific answer to leak
 * from one visitor to another.
 */

export const HOMEPAGE_TAGS = {
  services: "public:services",
  slides: "public:homepage-slides",
  faqs: "public:homepage-faqs",
  testimonials: "public:homepage-testimonials",
  reels: "public:homepage-reels",
  social: "public:social-links",
} as const;

export type HomepageTag = (typeof HOMEPAGE_TAGS)[keyof typeof HOMEPAGE_TAGS];

/** Long enough to be worth having, short enough that a missed tag self-heals. */
const PUBLIC_CONTENT_TTL_SECONDS = 300;

/**
 * Wrap a public content loader so repeat visits are served from the cache.
 *
 * `key` has to be stable and unique — it is what Next stores the entry under.
 */
export function cachePublicRead<T>(loader: () => Promise<T>, key: string, tag: HomepageTag): () => Promise<T> {
  return unstable_cache(loader, [key], { tags: [tag], revalidate: PUBLIC_CONTENT_TTL_SECONDS });
}
