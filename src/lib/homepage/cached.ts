import "server-only";

import { getActiveHomepageSlides } from "@/lib/homepage-slides";
import { getHomepageFaqs } from "@/lib/homepage/faqs";
import { getHomepageReels } from "@/lib/homepage/reels";
import { getFooterSocialLinks } from "@/lib/homepage/social";
import { getHomepageTestimonials } from "@/lib/homepage/testimonials";
import { getPublicServices } from "@/lib/services";
import { cachePublicRead, HOMEPAGE_TAGS } from "@/lib/homepage/cache";

/**
 * The cached reads, kept in a module of their own.
 *
 * The wrappers were first written into the loader files themselves, which was
 * wrong in a way the type checker could not see: client components import
 * those files for their types and their pure helpers — the reels rail, the
 * slider, the admin managers — so adding `next/cache` to them pulled server
 * code into the browser bundle. The homepage went from 252 kB to 289 kB of
 * first-load JavaScript, on the change meant to make it faster.
 *
 * `server-only` here makes that mistake a build error rather than a number
 * nobody looks at. The loader modules stay importable from anywhere; the
 * caching lives on this side of the line, and pages read from here.
 */

export const getCachedPublicServices = cachePublicRead(
  () => getPublicServices(),
  "public-services",
  HOMEPAGE_TAGS.services,
);

/**
 * Cached at the loader's default limit and sliced by the caller: two callers
 * wanted different counts of the same short list, and one entry serves both.
 */
export const getCachedHomepageSlides = cachePublicRead(
  () => getActiveHomepageSlides(),
  "homepage-slides",
  HOMEPAGE_TAGS.slides,
);

export const getCachedHomepageFaqs = cachePublicRead(
  () => getHomepageFaqs(),
  "homepage-faqs",
  HOMEPAGE_TAGS.faqs,
);

export const getCachedHomepageTestimonials = cachePublicRead(
  () => getHomepageTestimonials(),
  "homepage-testimonials",
  HOMEPAGE_TAGS.testimonials,
);

export const getCachedHomepageReels = cachePublicRead(
  () => getHomepageReels(),
  "homepage-reels",
  HOMEPAGE_TAGS.reels,
);

export const getCachedFooterSocialLinks = cachePublicRead(
  () => getFooterSocialLinks(),
  "social-links",
  HOMEPAGE_TAGS.social,
);
