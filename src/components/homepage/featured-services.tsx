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
    <HomepageSection id="top-services" surface="sky">
      <HomepageSectionHeader
        eyebrow="Featured assistance"
        title="Featured digital assistance"
        description="Selected services from the live catalog. Fees shown are RNOS assistance fees where listed."
        actionHref="/services"
        actionLabel="All services"
      />

      {/* Desktop editorial layout */}
      <div className="hidden gap-5 lg:grid lg:grid-cols-[1.15fr_1fr]">
        <article className="overflow-hidden rounded-[1.5rem] border border-[var(--dc-blue-500)]/12 bg-white shadow-[0_16px_40px_rgba(7,31,77,0.08)]">
          <div className="relative aspect-[16/10] bg-gradient-to-br from-[var(--dc-blue-700)] to-[var(--dc-navy-950)]">
            {leadImage ? (
              <Image src={leadImage} alt="" fill className="object-cover" sizes="(max-width: 1024px) 100vw, 680px" priority={false} />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <LeadIcon className="h-16 w-16 text-white/80" aria-hidden="true" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" aria-hidden="true" />
            {lead.badge ? (
              <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-xs font-black uppercase tracking-wide text-[var(--dc-blue-700)]">
                {lead.badge}
              </span>
            ) : null}
          </div>
          <div className="p-6 md:p-8">
            <p className="text-xs font-black uppercase tracking-wider text-[var(--dc-blue-600)]">{lead.category}</p>
            <h3 className="mt-2 text-2xl font-black tracking-tight text-[var(--dc-ink)] md:text-[1.75rem]">{lead.title}</h3>
            {lead.shortDescription ? (
              <p className="mt-3 line-clamp-3 text-base font-semibold leading-relaxed text-[var(--dc-body)]">
                {lead.shortDescription}
              </p>
            ) : null}
            <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-[var(--dc-muted)]">Assistance fee</p>
                <p className="mt-1 text-xl font-black text-[var(--dc-ink)]">{lead.priceLabel}</p>
              </div>
              <Link
                href={`/services/${lead.slug}`}
                className="inline-flex h-12 min-w-[9rem] items-center justify-center gap-1.5 rounded-xl bg-[var(--dc-orange-500)] px-6 text-[15px] font-black text-white transition hover:bg-[var(--dc-orange-600)]"
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
                  className="group flex h-full flex-col overflow-hidden rounded-[1.35rem] border border-[var(--dc-blue-500)]/10 bg-white shadow-[0_8px_24px_rgba(7,31,77,0.05)] transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <span className="relative block aspect-[16/11] bg-[var(--dc-blue-soft)]">
                    {imageSrc ? (
                      <Image src={imageSrc} alt="" fill className="object-cover transition duration-300 group-hover:scale-[1.03]" sizes="280px" />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center text-[var(--dc-blue-700)]">
                        <Icon className="h-8 w-8" aria-hidden="true" />
                      </span>
                    )}
                  </span>
                  <span className="flex flex-1 flex-col p-4">
                    <span className="line-clamp-2 text-[15px] font-extrabold leading-snug text-[var(--dc-ink)] group-hover:text-[var(--dc-blue-700)]">
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
        <article className="overflow-hidden rounded-[1.35rem] border border-[var(--dc-blue-500)]/12 bg-white shadow-sm">
          <div className="relative aspect-[16/10] bg-[var(--dc-blue-soft)]">
            {leadImage ? (
              <Image src={leadImage} alt="" fill className="object-cover" sizes="100vw" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-[var(--dc-blue-700)]">
                <LeadIcon className="h-10 w-10" aria-hidden="true" />
              </div>
            )}
          </div>
          <div className="p-4">
            <h3 className="text-xl font-black tracking-tight text-[var(--dc-ink)]">{lead.title}</h3>
            <p className="mt-1 text-sm font-bold text-[var(--dc-body)]">{lead.priceLabel}</p>
            <Link
              href={`/services/${lead.slug}`}
              className="mt-4 inline-flex h-12 w-full items-center justify-center gap-1.5 rounded-xl bg-[var(--dc-orange-500)] text-sm font-black text-white"
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
                    className="w-[78%] max-w-[280px] shrink-0 snap-start overflow-hidden rounded-[1.25rem] border border-[var(--dc-blue-500)]/10 bg-white shadow-sm"
                  >
                    <span className="relative block aspect-[16/10] bg-[var(--dc-blue-soft)]">
                      {imageSrc ? (
                        <Image src={imageSrc} alt="" fill className="object-cover" sizes="280px" />
                      ) : (
                        <span className="absolute inset-0 flex items-center justify-center text-[var(--dc-blue-700)]">
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
