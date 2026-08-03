import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { getPublicHomepageServices } from "@/lib/services";
import type { ServiceItem } from "@/lib/services-data";
import { resolveHomepageServiceImage } from "@/lib/homepage-visual-assets";
import { HomepageSection, HomepageSectionHeader, HomepageMobileRail } from "@/components/homepage/ui";
import { cn } from "@/lib/utils";

const ACCENT_BY_INDEX = [
  "from-[#0757c9]/90 to-[#071f4d]/95",
  "from-[#078b75]/85 to-[#0f766e]/95",
  "from-[#7048d8]/85 to-[#4c1d95]/95",
  "from-[#0284c7]/85 to-[#0757c9]/95",
  "from-[#0757c9]/90 to-[#071f4d]/95",
  "from-[#ff6500]/90 to-[#c2410c]/95",
] as const;

function shouldShowBadge(badge: string | undefined) {
  if (!badge?.trim()) return false;
  return true;
}

function HomepageServiceCard({
  service,
  featured = false,
  accent,
  imageSrc,
}: {
  service: ServiceItem;
  featured?: boolean;
  accent: string;
  imageSrc: string | null;
}) {
  const href = `/services/${service.slug}`;
  const showBadge = shouldShowBadge(service.badge);
  const cta = service.amount > 0 ? "Apply" : "Enquire Now";

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/70 bg-white shadow-[0_10px_28px_rgba(7,31,77,0.08)]",
        featured ? "min-h-[260px] md:min-h-[280px]" : "min-h-[230px] md:min-h-[240px]",
      )}
    >
      <div className={cn("relative flex-1 overflow-hidden bg-gradient-to-br", accent)}>
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt=""
            fill
            className="object-cover transition duration-300 group-hover:scale-[1.03]"
            sizes={featured ? "(max-width: 768px) 82vw, 480px" : "(max-width: 768px) 82vw, 240px"}
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-black/10" aria-hidden="true" />
        <div className="relative z-10 flex h-full min-h-[150px] flex-col justify-between p-3.5 text-white md:min-h-[170px]">
          <div className="flex items-start justify-between gap-2">
            {showBadge ? (
              <span className="rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-[var(--dc-ink)]">
                {service.badge}
              </span>
            ) : (
              <span />
            )}
          </div>
          <div>
            <h3 className={cn("font-black leading-snug tracking-tight drop-shadow", featured ? "text-xl md:text-2xl" : "text-base")}>
              {service.title}
            </h3>
            {service.shortDescription ? (
              <p className="mt-1 line-clamp-2 text-[11px] font-semibold text-white/90">{service.shortDescription}</p>
            ) : null}
            {featured ? (
              <p className="mt-2 text-lg font-black text-[var(--dc-orange-400)]">{service.priceLabel}</p>
            ) : null}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 bg-white px-3.5 py-3">
        <div className="min-w-0">
          {!featured ? (
            <>
              <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--dc-muted)]">Assistance fee</p>
              <p className="truncate text-sm font-black text-[var(--dc-ink)]">{service.priceLabel}</p>
            </>
          ) : (
            <p className="text-xs font-bold text-[var(--dc-body)]">RNOS assistance fee</p>
          )}
        </div>
        <Link
          href={href}
          className={cn(
            "inline-flex h-10 shrink-0 items-center gap-1 rounded-xl px-3 text-xs font-black text-white transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
            featured
              ? "bg-white text-[var(--dc-blue-700)] ring-1 ring-[var(--dc-blue-500)]/20 hover:bg-[var(--dc-blue-soft)] focus-visible:outline-[var(--dc-blue-600)]"
              : "bg-[var(--dc-navy-950)] hover:bg-[var(--dc-blue-800)] focus-visible:outline-[var(--dc-blue-600)]",
          )}
        >
          {featured && service.amount > 0 ? "File Now" : cta}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}

/** Option 3 image-led Trending section. */
export async function TrendingNow() {
  const services = await getPublicHomepageServices(6);
  if (!services.length) return null;

  const withImages = services.map((service) => ({
    service,
    imageSrc: resolveHomepageServiceImage(service.slug, service.title, service.heroImageUrl),
  }));

  // Prefer ITR as featured when present (matches Option 3 wider card role)
  const featuredIndex = Math.max(
    0,
    withImages.findIndex((item) => /itr|income.?tax/i.test(`${item.service.slug} ${item.service.title}`)),
  );
  const featured = withImages[featuredIndex] ?? withImages[0];
  const rest = withImages.filter((_, i) => i !== featuredIndex);

  return (
    <HomepageSection surface="sky" aria-labelledby="trending-heading">
      <HomepageSectionHeader
        eyebrow="Priority services"
        title="Trending now"
        actionHref="/services"
        actionLabel="All services"
      />

      <HomepageMobileRail className="md:hidden">
        {[featured, ...rest].map((item, index) => (
          <div key={item.service.slug} className="w-[82%] max-w-[300px] shrink-0 snap-start">
            <HomepageServiceCard
              service={item.service}
              imageSrc={item.imageSrc}
              accent={ACCENT_BY_INDEX[index % ACCENT_BY_INDEX.length]}
              featured={index === 0}
            />
          </div>
        ))}
      </HomepageMobileRail>

      <div className="hidden gap-4 md:grid md:grid-cols-12">
        <div className="md:col-span-5 lg:col-span-4">
          <HomepageServiceCard
            service={featured.service}
            imageSrc={featured.imageSrc}
            featured
            accent={ACCENT_BY_INDEX[0]}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 md:col-span-7 lg:col-span-8 lg:grid-cols-3">
          {rest.map((item, index) => (
            <HomepageServiceCard
              key={item.service.slug}
              service={item.service}
              imageSrc={item.imageSrc}
              accent={ACCENT_BY_INDEX[(index + 1) % ACCENT_BY_INDEX.length]}
            />
          ))}
        </div>
      </div>
    </HomepageSection>
  );
}
