import { HomepageSection, HomepageSectionHeader } from "@/components/homepage/ui";
import { ServiceCard } from "@/components/homepage/service-card";
import { Stagger, StaggerItem } from "@/components/homepage/motion";
import { getPublicHomepageServices, getPublicServices } from "@/lib/services";
import { resolveHomepageServiceImage } from "@/lib/homepage-visual-assets";

/** How many services Trending now shows. Kept in step with `trending-now.tsx`. */
const TRENDING_COUNT = 6;

/** Lead plus a 2×2 of supporting cards. */
const FEATURED_COUNT = 5;

/**
 * Featured digital assistance.
 *
 * Two problems, one of layout and one of content.
 *
 * **Layout.** A tall lead card beside a 2×2 of small ones, where the lead's
 * copy stopped well short of its own bottom edge — so a column of dead white
 * space ran down the middle of the section at every desktop width. The lead
 * card's image is now `flex-1`, so it stretches to whatever height the
 * neighbouring column ends up being instead of leaving the slack at the bottom.
 *
 * **Content, and this was the worse one.** Both this section and Trending now
 * called `getPublicHomepageServices`, so both rendered the same six services in
 * the same order — two consecutive bands of identical cards, which reads as a
 * bug rather than a curation.
 *
 * This section now starts where Trending stops. It takes the homepage-flagged
 * services beyond the first six, and when there are not enough of those it
 * fills from the wider published catalogue, skipping anything Trending already
 * showed. So the two bands never repeat each other, and this one always has
 * something to say.
 */
export async function FeaturedServices() {
  const [homepageServices, allServices] = await Promise.all([
    // One more than Trending needs, so the overlap can be computed exactly.
    getPublicHomepageServices(TRENDING_COUNT + FEATURED_COUNT),
    getPublicServices(),
  ]);

  const shownInTrending = new Set(homepageServices.slice(0, TRENDING_COUNT).map((s) => s.slug));

  const picked = [
    // First choice: homepage-flagged services Trending did not reach.
    ...homepageServices.slice(TRENDING_COUNT),
    // Then anything else published, so the band is never thin.
    ...allServices.filter((service) => !shownInTrending.has(service.slug)),
  ];

  // De-duplicate: the two sources overlap by construction.
  const seen = new Set<string>();
  const featured = picked
    .filter((service) => {
      if (shownInTrending.has(service.slug) || seen.has(service.slug)) return false;
      seen.add(service.slug);
      return true;
    })
    .slice(0, FEATURED_COUNT)
    .map((service) => ({
      service,
      imageSrc: resolveHomepageServiceImage(service.slug, service.title, service.heroImageUrl),
    }));

  if (!featured.length) return null;

  const [lead, ...supporting] = featured;

  return (
    <HomepageSection id="top-services" surface="sky" wash="dual">
      <HomepageSectionHeader
        eyebrow="More from the catalog"
        title="Featured digital assistance"
        description="Beyond the trending filings — more services from the live catalog. Fees shown are RNOS assistance fees where listed."
        actionHref="/services"
        actionLabel="All services"
      />

      {/* Desktop — lead beside an equal-height 2×2 */}
      <Stagger className="hidden gap-4 lg:grid lg:grid-cols-[1.05fr_1.2fr] lg:items-stretch">
        <StaggerItem className="h-full">
          <ServiceCard
            service={lead.service}
            imageSrc={lead.imageSrc}
            featured
            sizes="(max-width: 1280px) 45vw, 560px"
          />
        </StaggerItem>

        {supporting.length ? (
          <StaggerItem className="h-full">
            <div className="grid h-full auto-rows-fr grid-cols-2 gap-4">
              {supporting.map((item) => (
                <ServiceCard
                  key={item.service.slug}
                  service={item.service}
                  imageSrc={item.imageSrc}
                  sizes="(max-width: 1280px) 28vw, 300px"
                />
              ))}
            </div>
          </StaggerItem>
        ) : null}
      </Stagger>

      {/* Phone and tablet — a plain grid, no lead treatment and nothing
          hidden off the right edge. The lead/2×2 composition only earns its
          complexity at a width that can show both columns at once. */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:hidden">
        {featured.map((item) => (
          <ServiceCard
            key={item.service.slug}
            service={item.service}
            imageSrc={item.imageSrc}
            sizes="(max-width: 768px) 46vw, 32vw"
          />
        ))}
      </div>
    </HomepageSection>
  );
}
