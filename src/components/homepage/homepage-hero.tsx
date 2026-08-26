import Link from "next/link";
import { ArrowRight, BadgeCheck, CreditCard, Headphones, Radio, ShieldCheck } from "lucide-react";

import { BrandField, BrandWash } from "@/components/homepage/brand-backdrop";
import { HeroPopularServices } from "@/components/homepage/hero-popular-services";
import { HeroServiceSearch } from "@/components/homepage/hero-service-search";
import { HeroTrustStrip } from "@/components/homepage/hero-trust-strip";
import type { SearchCatalogItem } from "@/lib/search/service-search";
import type { HomepageSlide } from "@/lib/homepage-slides";

type HomepageHeroProps = {
  catalog: SearchCatalogItem[];
  slides: HomepageSlide[];
};

const DEFAULT_BADGE = "All Digital & Government Services";
const DEFAULT_HEADING = "Har Zaroori Digital Service, Ek Hi Jagah";
/*
  The headline already says "Ek Hi Jagah". This line must not say it again —
  the previous copy closed on "sab kuch ek hi jagah", so the two largest pieces
  of text on the first screen made the same point, and the subtitle bought
  nothing. It now answers the question the headline provokes instead: fine, one
  place — but who actually does the work, and what do I get?

  Three concrete promises, in the order a first-time customer worries about
  them: what it costs, whether the money is safe, and whether they will be left
  in the dark afterwards.
*/
const DEFAULT_SUBTITLE =
  "GST, ITR, passport, licence ya insurance — application se delivery tak poora kaam hamari team sambhaalti hai. Fees pehle se saaf, payment secure, aur status har waqt aapke saamne.";

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
 * One centred column on the brand field: a glass badge, an oversized headline
 * whose closing clause carries the logo's flame gradient, one line of support,
 * the search dock, the six services people actually arrive for, two calls to
 * action, and a factual trust strip. Nothing else — the rest of the homepage is
 * where the detail lives.
 *
 * The search sits inside a clear-glass dock rather than floating on the field:
 * the dock gives the input an edge to sit against, and the blur pulls the
 * colour of the mesh behind it through the panel, which is what makes the
 * glass read as glass rather than as a grey rectangle.
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
      className="relative isolate flex min-h-[min(92svh,760px)] items-center overflow-hidden text-white lg:min-h-[860px]"
      aria-labelledby="home-hero-heading"
    >
      <BrandField imageUrl={atmosphereImage} />

      <div className="relative z-10 mx-auto flex w-full max-w-[var(--dc-max)] flex-col items-center px-[var(--mobile-page-gutter)] py-14 text-center sm:px-6 sm:py-16 md:px-8 lg:py-20">
        <Link
          href="/services"
          className="lg-pill-dark lg-raise-dark dc-hero-rise inline-flex max-w-full items-center gap-2 py-1.5 pl-2 pr-4 text-[11px] font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:text-xs"
          style={rise(0)}
        >
          {/* The logo's own D–C bridge, reduced to its connector. */}
          <span
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
            style={{ background: "var(--dc-grad-flame)" }}
          >
            <Radio className="h-3 w-3 text-white" aria-hidden="true" />
          </span>
          <span className="truncate tracking-[0.01em]">{DEFAULT_BADGE}</span>
        </Link>

        <h1
          id="home-hero-heading"
          className="dc-hero-rise mt-6 max-w-[18ch] text-balance text-[2.3rem] font-extrabold leading-[1.04] tracking-[-0.028em] sm:max-w-[20ch] sm:text-[3.35rem] lg:max-w-[16ch] lg:text-[4.6rem]"
          style={rise(80)}
        >
          {lead}
          {accent ? (
            <>
              {" "}
              <span className="dc-hero-accent dc-text-flame">{accent}</span>
            </>
          ) : null}
        </h1>

        <p
          className="dc-hero-rise mt-5 max-w-[56ch] text-pretty text-[14.5px] font-medium leading-relaxed text-white/72 sm:text-[17px]"
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
        <div className="dc-hero-rise relative z-40 mt-8 w-full max-w-2xl sm:mt-10" style={rise(220)}>
          <div className="lg-card-dark rounded-[1.85rem] p-1.5 sm:rounded-full sm:p-2.5">
            <HeroServiceSearch catalog={catalog} />
          </div>
        </div>

        <div className="dc-hero-rise relative z-10 mt-5 w-full max-w-5xl" style={rise(290)}>
          <HeroPopularServices />
        </div>

        <div
          className="dc-hero-rise relative z-10 mt-8 flex w-full max-w-md flex-col gap-2.5 sm:mt-10 sm:w-auto sm:max-w-none sm:flex-row sm:justify-center"
          style={rise(350)}
        >
          <Link
            href={primaryUrl}
            className="group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white pl-7 pr-2 text-sm font-bold text-[var(--dc-blue-deep)] shadow-[0_18px_40px_-14px_rgba(0,10,40,0.85)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_26px_54px_-16px_rgba(0,10,40,0.9)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:h-[3.35rem]"
          >
            {primaryLabel}
            {/* The arrow chip carries the logo's flame ramp — the one place the
                orange appears at full strength in the hero. */}
            <span
              className="flex h-9 w-9 items-center justify-center rounded-full text-white transition-transform duration-300 group-hover:translate-x-0.5"
              style={{ background: "var(--dc-grad-flame)" }}
            >
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </span>
          </Link>
          <Link
            href={secondaryUrl}
            className="lg-pill-dark lg-raise-dark inline-flex h-12 items-center justify-center px-7 text-sm font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:h-[3.35rem]"
          >
            {secondaryLabel}
          </Link>
        </div>

        <div className="dc-hero-rise relative z-10 mt-10 w-full max-w-4xl sm:mt-14" style={rise(420)}>
          <HeroTrustStrip />
        </div>
      </div>
    </section>
  );
}

const TRUST_CHIPS = [
  { label: "Secure payments", icon: ShieldCheck },
  { label: "Expert verification", icon: BadgeCheck },
  { label: "PAN India assistance", icon: CreditCard },
  { label: "WhatsApp support", icon: Headphones },
] as const;

/**
 * Compact assurance strip for mobile placement after Quick Actions.
 *
 * Phone-only: on desktop the hero's own trust strip is still on screen at this
 * scroll position, and saying the same thing twice in one viewport reads as
 * padding rather than reassurance.
 */
export function HomepageTrustChips() {
  return (
    <section
      aria-label="Trust benefits"
      className="dc-ambient bg-[var(--dc-sky-soft)] px-[var(--mobile-page-gutter)] py-4 lg:hidden"
    >
      <BrandWash variant="dual" />
      <ul className="mx-auto grid max-w-[var(--dc-max)] grid-cols-2 gap-2">
        {TRUST_CHIPS.map((item) => {
          const Icon = item.icon;
          return (
            <li
              key={item.label}
              className="lg-card flex min-h-11 items-center gap-2 rounded-xl px-2.5 py-2 text-[11px] font-bold text-[var(--dc-ink)]"
            >
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white"
                style={{ background: "var(--dc-grad-blue)" }}
              >
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
