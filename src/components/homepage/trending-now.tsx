import { getPublicHomepageServices } from "@/lib/services";
import { resolveHomepageServiceImage } from "@/lib/homepage-visual-assets";
import { ServiceCard } from "@/components/homepage/service-card";
import { HomepageSection, HomepageSectionHeader } from "@/components/homepage/ui";
import { Stagger, StaggerItem } from "@/components/homepage/motion";

/**
 * Trending now.
 *
 * The lead service gets a card that spans two columns *across* rather than two
 * rows *down*. That is the whole layout fix: the previous grid put a tall
 * featured card beside a 3+2 arrangement of small ones, which left an empty
 * cell in the bottom-right corner of the section on every desktop width.
 * Spanning sideways keeps the rows square and gives the lead card room for its
 * artwork at a readable size.
 */
export async function TrendingNow() {
  const services = await getPublicHomepageServices(6);
  if (!services.length) return null;

  const withImages = services.map((service) => ({
    service,
    imageSrc: resolveHomepageServiceImage(service.slug, service.title, service.heroImageUrl),
  }));

  // ITR leads when it is in the set — it is the highest-intent service in the
  // catalogue and the only one people arrive already knowing they need.
  const leadIndex = Math.max(
    0,
    withImages.findIndex((item) => /itr|income.?tax/i.test(`${item.service.slug} ${item.service.title}`)),
  );
  const lead = withImages[leadIndex] ?? withImages[0];
  const rest = withImages.filter((_, i) => i !== leadIndex);

  return (
    <HomepageSection surface="sky" wash="dual" aria-labelledby="trending-heading">
      <HomepageSectionHeader
        eyebrow="Priority services"
        title="Trending now"
        description="What most customers are filing this month."
        actionHref="/services"
        actionLabel="All services"
      />

      {/* One uniform grid at every width.

          Two things were wrong before. The lead card spanned two columns,
          which was an attempt to fix an empty cell and only moved it: with six
          services a spanning lead occupies seven cells, and seven tiles into
          neither three columns nor four without a gap. And phones got a
          horizontal rail that showed one card and a sliver of the next, so
          five of the six were invisible unless you knew to swipe.

          Six equal cards tile perfectly into two columns and three, so the
          same grid serves the phone, the tablet and the desktop. The lead is
          still unmistakably the lead: it alone carries the flame ramp. */}
      <Stagger className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        {[lead, ...rest].map((item, index) => (
          <StaggerItem key={item.service.slug}>
            <ServiceCard
              service={item.service}
              imageSrc={item.imageSrc}
              featured={index === 0}
              sizes="(max-width: 640px) 46vw, (max-width: 1024px) 46vw, 400px"
            />
          </StaggerItem>
        ))}
      </Stagger>
    </HomepageSection>
  );
}
