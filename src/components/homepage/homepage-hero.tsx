import Link from "next/link";
import { ArrowRight, BadgeCheck, CreditCard, Headphones, Sparkles, ShieldCheck } from "lucide-react";

import { HeroBackground } from "@/components/homepage/hero-background";
import { HeroPopularServices } from "@/components/homepage/hero-popular-services";
import { HeroServiceSearch } from "@/components/homepage/hero-service-search";
import { HeroTrustStrip } from "@/components/homepage/hero-trust-strip";
import type { SearchCatalogItem } from "@/lib/search/service-search";
import type { HomepageSlide } from "@/lib/homepage-slides";

type HomepageHeroProps = {
  catalog: SearchCatalogItem[];
  slides: HomepageSlide[];
};

const DEFAULT_BADGE = "India's Digital Service Platform";
const DEFAULT_HEADING = "Har Zaroori Digital Service, Ek Hi Jagah";
const DEFAULT_SUBTITLE =
  "Government services, tax filing, business registration, insurance and more — simple, transparent and online.";

/** Entrance delay, as an inline style so one utility class covers every row. */
function rise(delayMs: number) {
  return { animationDelay: `${delayMs}ms` };
}

/** CMS values are admin-entered; a javascript: or data: href must never ship. */
function sanitizeHref(url: string, fallback: string) {
  const trimmed = url.trim();
  if (!trimmed || /^javascript:/i.test(trimmed) || /^data:/i.test(trimmed)) return fallback;
  return trimmed;
}

/**
 * Split the headline so its last clause can be set in the display serif.
 *
 * The default copy is "Har Zaroori Digital Service, Ek Hi Jagah" and the
 * intended emphasis is the closing "Ek Hi Jagah". Splitting on the final comma
 * keeps that working for any admin-entered headline of the same shape, and
 * degrades to a single sans-serif line when there is no comma at all.
 */
function splitHeadline(heading: string): { lead: string; accent: string | null } {
  const index = heading.lastIndexOf(",");
  if (index <= 0 || index === heading.length - 1) return { lead: heading, accent: null };
  return { lead: heading.slice(0, index + 1), accent: heading.slice(index + 1).trim() };
}

/**
 * Homepage hero.
 *
 * One centred column on a deep, layered blue field: pill badge, oversized
 * headline, one line of supporting copy, the service search, the six services
 * people actually arrive for, two calls to action, and a trust strip. Nothing
 * else — the rest of the homepage is where the detail lives.
 *
 * Headline, subtitle, CTAs and the atmosphere image still come from the lead
 * Homepage CMS slide when an admin has set one, so this redesign does not take
 * the admin panel's control of the hero away.
 */
export function HomepageHero({ catalog, slides }: HomepageHeroProps) {
  const leadSlide = slides[0] ?? null;

  const heading = leadSlide?.title?.trim() || DEFAULT_HEADING;
  const { lead, accent } = splitHeadline(heading);
  const subtitle = leadSlide?.subtitle?.trim() || DEFAULT_SUBTITLE;

  const primaryUrl = sanitizeHref(leadSlide?.cta_primary_url || "", "/services");
  const primaryLabel = leadSlide?.cta_primary_label?.trim() || "Explore Services";
  const secondaryUrl = sanitizeHref(leadSlide?.cta_secondary_url || "", "/track-application");
  const secondaryLabel = leadSlide?.cta_secondary_label?.trim() || "Track Application";

  // Only https artwork is honoured. Anything else falls through to the pure
  // CSS/SVG composition rather than rendering a broken image on the busiest
  // page of the site.
  const slideImage = (leadSlide?.image_url ?? "").trim();
  const slideMobileImage = (leadSlide?.mobile_image_url ?? "").trim();
  const atmosphereImage = slideImage.startsWith("https://")
    ? slideImage
    : slideMobileImage.startsWith("https://")
      ? slideMobileImage
      : null;

  return (
    <section
      className="relative isolate flex min-h-[min(88svh,720px)] items-center overflow-hidden text-white lg:min-h-[820px]"
      aria-labelledby="home-hero-heading"
    >
      <HeroBackground imageUrl={atmosphereImage} />

      <div className="relative z-10 mx-auto flex w-full max-w-[var(--dc-max)] flex-col items-center px-[var(--mobile-page-gutter)] py-12 text-center sm:px-6 sm:py-16 md:px-8 lg:py-20">
        <Link
          href="/services"
          className="dc-hero-rise inline-flex max-w-full items-center gap-2 rounded-full border border-white/25 bg-white/10 py-1.5 pl-2.5 pr-4 text-[11px] font-bold backdrop-blur-sm transition hover:border-white/45 hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:text-xs"
          style={rise(0)}
        >
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-[var(--dc-orange-400)]" aria-hidden="true" />
          <span className="truncate">{DEFAULT_BADGE}</span>
        </Link>

        <h1
          id="home-hero-heading"
          className="dc-hero-rise mt-5 max-w-[18ch] text-balance text-[2.15rem] font-bold leading-[1.06] tracking-[-0.02em] sm:max-w-[20ch] sm:text-[3.2rem] lg:max-w-[16ch] lg:text-[4.4rem]"
          style={rise(80)}
        >
          {lead}
          {accent ? (
            <>
              {" "}
              <span className="dc-hero-accent">{accent}</span>
            </>
          ) : null}
        </h1>

        <p
          className="dc-hero-rise mt-4 max-w-[52ch] text-pretty text-[14px] font-medium leading-relaxed text-white/75 sm:mt-5 sm:text-[16.5px]"
          style={rise(150)}
        >
          {subtitle}
        </p>

        {/*
          The suggestions panel opens absolutely positioned. This wrapper holds
          an explicit z-index above everything under it: the entrance animation
          applies a transform, which creates a stacking context and would
          otherwise trap the panel's own z-index inside it, painting the
          suggestions underneath the buttons that follow.
        */}
        <div className="dc-hero-rise relative z-40 mt-7 w-full max-w-2xl sm:mt-9" style={rise(220)}>
          <HeroServiceSearch catalog={catalog} />
        </div>

        <div className="dc-hero-rise relative z-10 mt-5 w-full max-w-5xl" style={rise(290)}>
          <HeroPopularServices />
        </div>

        <div
          className="dc-hero-rise relative z-10 mt-7 flex w-full max-w-md flex-col gap-2.5 sm:mt-9 sm:w-auto sm:max-w-none sm:flex-row sm:justify-center"
          style={rise(350)}
        >
          <Link
            href={primaryUrl}
            className="group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-7 text-sm font-bold text-[var(--dc-navy-950)] shadow-[0_16px_36px_-12px_rgba(3,20,54,0.8)] transition hover:-translate-y-0.5 hover:bg-white/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:h-[3.25rem]"
          >
            {primaryLabel}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
          <Link
            href={secondaryUrl}
            className="inline-flex h-12 items-center justify-center rounded-full border border-white/30 bg-white/5 px-7 text-sm font-bold text-white backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-white/60 hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:h-[3.25rem]"
          >
            {secondaryLabel}
          </Link>
        </div>

        <div className="dc-hero-rise relative z-10 mt-9 w-full max-w-4xl sm:mt-14" style={rise(420)}>
          <HeroTrustStrip />
        </div>
      </div>
    </section>
  );
}

/** Compact assurance strip for mobile placement after Quick Actions. */
export function HomepageTrustChips() {
  return (
    <section aria-label="Trust benefits" className="bg-[var(--dc-cream)] px-[var(--mobile-page-gutter)] py-3 lg:hidden">
      <ul className="mx-auto grid max-w-[var(--dc-max)] grid-cols-2 gap-2">
        {[
          { label: "Secure payments", icon: ShieldCheck },
          { label: "Expert verification", icon: BadgeCheck },
          { label: "PAN India assistance", icon: CreditCard },
          { label: "WhatsApp support", icon: Headphones },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <li
              key={item.label}
              className="flex min-h-11 items-center gap-2 rounded-xl border border-[var(--dc-blue-500)]/10 bg-white px-2.5 py-2 text-[11px] font-bold text-[var(--dc-ink)]"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--dc-blue-soft)] text-[var(--dc-blue-700)]">
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              {item.label}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
