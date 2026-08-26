import { getPublicHomepageServices } from "@/lib/services";
import { resolveHomepageServiceImage } from "@/lib/homepage-visual-assets";
import { ServiceCard } from "@/components/homepage/service-card";
import { HomepageSection, HomepageSectionHeader, HomepageMobileRail } from "@/components/homepage/ui";
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

      {/* Phones — one rail, lead first */}
      <HomepageMobileRail className="md:hidden">
        {[lead, ...rest].map((item, index) => (
          <div key={item.service.slug} className="w-[82%] max-w-[300px] shrink-0 snap-start">
            <ServiceCard service={item.service} imageSrc={item.imageSrc} featured={index === 0} />
          </div>
        ))}
      </HomepageMobileRail>

      {/* Tablet and up — a uniform grid.

          The lead card used to span two columns. That was an attempt to fix an
          empty cell and it just moved it: with six services, a spanning lead
          occupies seven cells, and seven tiles into neither three columns nor
          four without a gap. Six equal cards tile perfectly into both (2×3 and
          3×2), and the lead is still obviously the lead — it carries the flame
          ramp and a larger title while every other card is blue. */}
      <Stagger className="hidden gap-4 md:grid md:grid-cols-2 lg:grid-cols-3">
        {[lead, ...rest].map((item, index) => (
          <StaggerItem key={item.service.slug}>
            <ServiceCard
              service={item.service}
              imageSrc={item.imageSrc}
              featured={index === 0}
              sizes="(max-width: 1024px) 46vw, 400px"
            />
          </StaggerItem>
        ))}
      </Stagger>
    </HomepageSection>
  );
}
