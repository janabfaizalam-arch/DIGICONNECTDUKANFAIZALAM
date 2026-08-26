import { HomepageSection, HomepageSectionHeader, HomepageMobileRail } from "@/components/homepage/ui";
import { ServiceCard } from "@/components/homepage/service-card";
import { Stagger, StaggerItem } from "@/components/homepage/motion";
import { getPublicHomepageServices } from "@/lib/services";
import { resolveHomepageServiceImage } from "@/lib/homepage-visual-assets";

/**
 * Featured digital assistance.
 *
 * The old layout was a tall lead card beside a 2×2 of small ones, and the lead
 * card's copy stopped well short of its own bottom edge — so the section had a
 * column of dead white space running down the middle of it at every desktop
 * width, roughly the height of a card.
 *
 * Two changes close it. The lead card's image is `flex-1`, so it stretches to
 * whatever height the neighbouring column ends up being instead of leaving the
 * slack at the bottom. And the supporting cards now sit in a 2×2 grid whose
 * rows are equal height, so both columns finish on the same line.
 *
 * The section deliberately shows five services, not eight: this band sits
 * directly under Trending now, and a second long list reads as the same section
 * repeated rather than a curated shortlist.
 */
export async function FeaturedServices() {
  const featuredServices = await getPublicHomepageServices(8);
  if (!featuredServices.length) return null;

  const [lead, ...rest] = featuredServices;
  const leadImage = resolveHomepageServiceImage(lead.slug, lead.title, lead.heroImageUrl);
  const supporting = rest.slice(0, 4).map((service) => ({
    service,
    imageSrc: resolveHomepageServiceImage(service.slug, service.title, service.heroImageUrl),
  }));

  return (
    <HomepageSection id="top-services" surface="sky" wash="dual">
      <HomepageSectionHeader
        eyebrow="Featured assistance"
        title="Featured digital assistance"
        description="Selected services from the live catalog. Fees shown are RNOS assistance fees where listed."
        actionHref="/services"
        actionLabel="All services"
      />

      {/* Desktop — lead beside an equal-height 2×2 */}
      <Stagger className="hidden gap-4 lg:grid lg:grid-cols-[1.05fr_1.2fr] lg:items-stretch">
        <StaggerItem className="h-full">
          <ServiceCard
            service={lead}
            imageSrc={leadImage}
            featured
            sizes="(max-width: 1280px) 45vw, 560px"
          />
        </StaggerItem>

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
      </Stagger>

      {/* Tablet — a plain three-up, no lead treatment */}
      <div className="hidden gap-4 md:grid md:grid-cols-3 lg:hidden">
        <ServiceCard service={lead} imageSrc={leadImage} sizes="32vw" />
        {supporting.slice(0, 2).map((item) => (
          <ServiceCard key={item.service.slug} service={item.service} imageSrc={item.imageSrc} sizes="32vw" />
        ))}
      </div>

      {/* Phones — one rail */}
      <HomepageMobileRail className="md:hidden">
        {[{ service: lead, imageSrc: leadImage }, ...supporting].map((item) => (
          <div key={item.service.slug} className="w-[80%] max-w-[290px] shrink-0 snap-start">
            <ServiceCard service={item.service} imageSrc={item.imageSrc} />
          </div>
        ))}
      </HomepageMobileRail>
    </HomepageSection>
  );
}
