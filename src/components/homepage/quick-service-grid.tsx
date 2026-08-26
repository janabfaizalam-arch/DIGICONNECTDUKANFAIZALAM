import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { getPublicCategoriesWithCounts } from "@/lib/services";
import { resolveHomepageCategoryArt } from "@/lib/homepage-visual-assets";
import { CategoryArt } from "@/components/homepage/category-art";
import { HomepageSection, HomepageSectionHeader } from "@/components/homepage/ui";
import { Stagger, StaggerItem } from "@/components/homepage/motion";

/**
 * Browse by category.
 *
 * Two things were wrong here. The tiles carried six different pastel tints from
 * the visual-asset map, so the grid's colour told the reader nothing — it was
 * decoration shaped like information. And each one had an opaque photographic
 * rectangle wedged into the bottom-right corner, on its own background colour,
 * cut off by the card edge.
 *
 * Now every tile is the same glass, the artwork is drawn and transparent (see
 * `category-art.tsx`), and the only tile that differs is the first, whose art
 * takes the flame ramp so the eye has somewhere to enter the grid.
 */
export async function QuickServiceGrid() {
  const categories = await getPublicCategoriesWithCounts();
  const visible = categories.filter((c) => (c.serviceCount ?? 0) > 0).slice(0, 6);

  if (!visible.length) return null;

  return (
    <HomepageSection id="categories" surface="white" wash="blue">
      <HomepageSectionHeader
        eyebrow="Browse"
        title="Browse by category"
        description="Every service grouped the way people actually look for them."
        actionHref="/services"
        actionLabel="All categories"
      />

      <Stagger className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((category, index) => {
          const art = resolveHomepageCategoryArt(category.slug, category.title);
          const count = category.serviceCount ?? 0;
          return (
            <StaggerItem key={category.slug} className="h-full">
              <Link
                href={`/services/${category.slug}`}
                className="lg-card lg-raise lg-sheen group relative flex h-full min-h-[168px] flex-col justify-between overflow-hidden p-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dc-blue-bright)]"
              >
                <CategoryArt
                  slug={category.slug}
                  title={category.title}
                  tone={index === 0 ? "flame" : "blue"}
                />

                {/* The copy column is held to 64% so a long category name wraps
                    before it ever reaches the artwork. */}
                <span className="relative z-10 max-w-[64%]">
                  <span className="inline-flex items-center rounded-full bg-[var(--dc-blue-soft)] px-2.5 py-1 text-[10.5px] font-extrabold uppercase tracking-[0.12em] text-[var(--dc-blue-mid)]">
                    {count} service{count === 1 ? "" : "s"}
                  </span>
                  <span className="mt-3 block text-[17px] font-extrabold leading-snug tracking-[-0.015em] text-[var(--dc-ink)]">
                    {category.title}
                  </span>
                  <span className="mt-1.5 block text-[13px] font-medium leading-snug text-[var(--dc-body)]">
                    {art.descriptor}
                  </span>
                </span>

                <span className="relative z-10 mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-[var(--dc-blue-mid)]">
                  Explore
                  <ArrowRight
                    className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </span>
              </Link>
            </StaggerItem>
          );
        })}
      </Stagger>
    </HomepageSection>
  );
}
