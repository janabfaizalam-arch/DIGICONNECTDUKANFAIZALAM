import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { HomepageSection, HomepageSectionHeader, HomepageMobileRail } from "@/components/homepage/ui";
import { getPublicHomepageServices } from "@/lib/services";
import { resolveHomepageServiceImage } from "@/lib/homepage-visual-assets";

/** Editorial featured services — large lead + image-led supporting cards. */
export async function FeaturedServices() {
  const featuredServices = await getPublicHomepageServices(8);
  if (!featuredServices.length) return null;

  const [lead, ...rest] = featuredServices;
  const LeadIcon = lead.icon;
  const leadImage = resolveHomepageServiceImage(lead.slug, lead.title, lead.heroImageUrl);
  const supporting = rest.slice(0, 4);

  return (
    <HomepageSection id="top-services" surface="sky" wash="dual">
      <HomepageSectionHeader
        eyebrow="Featured assistance"
        title="Featured digital assistance"
        description="Selected services from the live catalog. Fees shown are RNOS assistance fees where listed."
        actionHref="/services"
        actionLabel="All services"
      />

      {/* Desktop editorial layout */}
      <div className="hidden gap-5 lg:grid lg:grid-cols-[1.15fr_1fr]">
        <article className="lg-card lg-raise overflow-hidden rounded-[1.5rem]">
          <div className="relative aspect-[16/10]" style={{ background: "var(--dc-grad-blue)" }}>
            {leadImage ? (
              <Image src={leadImage} alt="" fill loading="lazy" className="object-cover" sizes="(max-width: 1024px) 100vw, 680px" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <LeadIcon className="h-16 w-16 text-white/80" aria-hidden="true" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" aria-hidden="true" />
            {lead.badge ? (
              <span className="lg-pill absolute left-4 top-4 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-[var(--dc-blue-mid)]">
                {lead.badge}
              </span>
            ) : null}
          </div>
          <div className="p-6 md:p-8">
            <p className="dc-eyebrow-rule-start inline-flex items-center text-[11px] font-extrabold uppercase tracking-[0.18em] text-[var(--dc-flame)]">
              {lead.category}
            </p>
            <h3 className="mt-2.5 text-2xl font-extrabold tracking-[-0.025em] text-[var(--dc-ink)] md:text-[1.75rem]">{lead.title}</h3>
            {lead.shortDescription ? (
              <p className="mt-3 line-clamp-3 text-base font-medium leading-relaxed text-[var(--dc-body)]">
                {lead.shortDescription}
              </p>
            ) : null}
            <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-[var(--dc-muted)]">Assistance fee</p>
                <p className="mt-1 text-xl font-extrabold text-[var(--dc-ink)]">{lead.priceLabel}</p>
              </div>
              <Link
                href={`/services/${lead.slug}`}
                className="group inline-flex h-12 min-w-[9rem] items-center justify-center gap-1.5 rounded-xl px-6 text-[15px] font-extrabold text-white shadow-[0_12px_26px_-12px_rgba(247,74,1,0.95)] transition duration-300 hover:brightness-110"
                style={{ background: "var(--dc-grad-flame)" }}
              >
                View service
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </article>

        <ul className="grid grid-cols-2 gap-4 content-start">
          {supporting.map((service) => {
            const Icon = service.icon;
            const imageSrc = resolveHomepageServiceImage(service.slug, service.title, service.heroImageUrl);
            return (
              <li key={service.slug}>
                <Link
                  href={`/services/${service.slug}`}
                  className="lg-card lg-raise lg-sheen group flex h-full flex-col overflow-hidden rounded-[1.35rem] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dc-blue-bright)]"
                >
                  <span className="relative block aspect-[16/11] bg-[var(--dc-blue-soft)]">
                    {imageSrc ? (
                      <Image
                        src={imageSrc}
                        alt=""
                        fill
                        loading="lazy"
                        className="object-cover transition duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.05]"
                        sizes="280px"
                      />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center text-[var(--dc-blue-mid)]">
                        <Icon className="h-8 w-8" aria-hidden="true" />
                      </span>
                    )}
                  </span>
                  <span className="flex flex-1 flex-col p-4">
                    <span className="line-clamp-2 text-[15px] font-extrabold leading-snug text-[var(--dc-ink)] transition-colors group-hover:text-[var(--dc-blue-mid)]">
                      {service.title}
                    </span>
                    <span className="mt-2 text-sm font-bold text-[var(--dc-body)]">{service.priceLabel}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Mobile: lead card + snap rail */}
      <div className="lg:hidden">
        <article className="lg-card overflow-hidden rounded-[1.35rem]">
          <div className="relative aspect-[16/10] bg-[var(--dc-blue-soft)]">
            {leadImage ? (
              <Image src={leadImage} alt="" fill loading="lazy" className="object-cover" sizes="100vw" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-[var(--dc-blue-mid)]">
                <LeadIcon className="h-10 w-10" aria-hidden="true" />
              </div>
            )}
          </div>
          <div className="p-4">
            <h3 className="text-xl font-extrabold tracking-[-0.025em] text-[var(--dc-ink)]">{lead.title}</h3>
            <p className="mt-1 text-sm font-bold text-[var(--dc-body)]">{lead.priceLabel}</p>
            <Link
              href={`/services/${lead.slug}`}
              className="mt-4 inline-flex h-12 w-full items-center justify-center gap-1.5 rounded-xl text-sm font-extrabold text-white shadow-[0_12px_26px_-12px_rgba(247,74,1,0.95)] transition duration-300 hover:brightness-110"
              style={{ background: "var(--dc-grad-flame)" }}
            >
              View service
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </article>

        {supporting.length ? (
          <div className="mt-4">
            <HomepageMobileRail>
              {supporting.map((service) => {
                const Icon = service.icon;
                const imageSrc = resolveHomepageServiceImage(service.slug, service.title, service.heroImageUrl);
                return (
                  <Link
                    key={service.slug}
                    href={`/services/${service.slug}`}
                    className="lg-card lg-raise w-[78%] max-w-[280px] shrink-0 snap-start overflow-hidden rounded-[1.25rem]"
                  >
                    <span className="relative block aspect-[16/10] bg-[var(--dc-blue-soft)]">
                      {imageSrc ? (
                        <Image src={imageSrc} alt="" fill loading="lazy" className="object-cover" sizes="280px" />
                      ) : (
                        <span className="absolute inset-0 flex items-center justify-center text-[var(--dc-blue-mid)]">
                          <Icon className="h-8 w-8" aria-hidden="true" />
                        </span>
                      )}
                    </span>
                    <span className="block p-3.5">
                      <span className="line-clamp-2 text-[15px] font-extrabold text-[var(--dc-ink)]">{service.title}</span>
                      <span className="mt-1 block text-sm font-bold text-[var(--dc-body)]">{service.priceLabel}</span>
                    </span>
                  </Link>
                );
              })}
            </HomepageMobileRail>
          </div>
        ) : null}
      </div>
    </HomepageSection>
  );
}
