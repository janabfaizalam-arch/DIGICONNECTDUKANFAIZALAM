import Link from "next/link";
import { ArrowRight, ArrowUpRight, Lock, Printer, ShieldCheck } from "lucide-react";

import { SmartSearchHub, type SearchCatalogItem } from "@/components/homepage/smart-search-hub";
import type { HomepageSlide } from "@/lib/homepage-slides";

type HomepageHeroProps = {
  catalog: SearchCatalogItem[];
  slides: HomepageSlide[];
};

/** Plain text, separated by hairlines — not four coloured boxes. */
const assurances = [
  "Secure payments",
  "Expert verification",
  "PAN India",
  "WhatsApp support",
] as const;

const popular = [
  { label: "GST Registration", href: "/services/gst-registration" },
  { label: "ITR Filing", href: "/services/itr-filing" },
  { label: "PAN Card", href: "/services" },
  { label: "Smart Print", href: "/print" },
] as const;

function stagger(delayMs: number) {
  return { animationDelay: `${delayMs}ms` };
}

function sanitizeHref(url: string, fallback: string) {
  const trimmed = url.trim();
  if (!trimmed || /^javascript:/i.test(trimmed) || /^data:/i.test(trimmed)) return fallback;
  return trimmed;
}

/**
 * Homepage hero — Aurora Light.
 *
 * A deliberate break from the previous treatment rather than a refinement of
 * it: light canvas instead of a saturated blue slab, one centred column
 * instead of a three-way split, typography carrying the page instead of
 * stacked cards, and a single accent used sparingly.
 *
 * The search is the hero. Everything else is sized to stay beneath it.
 *
 * Headline, subtitle and CTAs still come from the CMS lead slide.
 */
export function HomepageHero({ catalog, slides }: HomepageHeroProps) {
  const leadSlide = slides[0] ?? null;
  const heading = leadSlide?.title?.trim() || "Government paperwork, handled properly.";
  const subtitle =
    leadSlide?.subtitle?.trim() ||
    "GST, ITR, passport, licence, insurance and scheme filings — prepared and checked by people who do this every day.";
  const primaryUrl = sanitizeHref(leadSlide?.cta_primary_url || "", "/services");
  const primaryLabel = leadSlide?.cta_primary_label?.trim() || "Explore services";
  const secondaryUrl = sanitizeHref(leadSlide?.cta_secondary_url || "", "/track-application");
  const secondaryLabel = leadSlide?.cta_secondary_label?.trim() || "Track application";

  return (
    <section
      className="relative isolate overflow-hidden bg-[var(--al-canvas)]"
      aria-labelledby="home-hero-heading"
    >
      {/* Barely-there colour. Two soft washes and a fading grid — the page
          should read as paper, not as a coloured banner. */}
      <div
        className="al-drift pointer-events-none absolute -left-40 -top-56 -z-10 h-[640px] w-[640px] rounded-full opacity-[0.55] blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(27,59,214,0.16) 0%, transparent 65%)" }}
        aria-hidden="true"
      />
      <div
        className="al-drift pointer-events-none absolute -right-40 top-10 -z-10 h-[560px] w-[560px] rounded-full opacity-[0.5] blur-3xl"
        style={{
          background: "radial-gradient(circle, rgba(255,104,0,0.14) 0%, transparent 65%)",
          animationDelay: "-11s",
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.5]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(11,11,13,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(11,11,13,0.05) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
          maskImage: "radial-gradient(ellipse 70% 55% at 50% 35%, #000 20%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(ellipse 70% 55% at 50% 35%, #000 20%, transparent 80%)",
        }}
        aria-hidden="true"
      />

      <div className="mx-auto max-w-[var(--dc-max)] px-[var(--mobile-page-gutter)] pb-14 pt-12 sm:px-6 sm:pb-20 sm:pt-16 md:px-8 lg:pb-28 lg:pt-24">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <Link
            href="/digi-partner"
            className="al-in al-hairline al-lift inline-flex items-center gap-2 rounded-full bg-[var(--al-surface)] py-1.5 pl-2 pr-3.5 text-[12px] font-medium text-[var(--al-ink-2)]"
            style={stagger(0)}
          >
            <span className="rounded-full bg-[var(--al-accent-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--al-accent)]">
              New
            </span>
            Earn as a Digi Partner
            <ArrowUpRight className="h-3.5 w-3.5 text-[var(--al-ink-3)]" aria-hidden="true" />
          </Link>

          <h1
            id="home-hero-heading"
            className="al-in mt-7 text-balance text-[2.15rem] leading-[1.06] tracking-[-0.035em] text-[var(--al-ink)] sm:text-[3.1rem] lg:text-[3.9rem]"
            // Set inline rather than via a utility: the global `h1` rule pins
            // the heading face and weight, and Poppins ships only 600/700 here,
            // which reads as a heavy poster face at display sizes. The body
            // face at 500 is what gives this theme its quieter editorial feel.
            style={{
              ...stagger(70),
              fontFamily: "var(--font-body), ui-sans-serif, system-ui, sans-serif",
              fontWeight: 500,
            }}
          >
            {heading}
          </h1>

          <p
            className="al-in mt-5 max-w-xl text-pretty text-[15px] leading-relaxed text-[var(--al-ink-2)] sm:text-[17px]"
            style={stagger(140)}
          >
            {subtitle}
          </p>

          {/* The search is the hero, so it sits alone with room around it. */}
          <div className="al-in mt-9 w-full max-w-2xl" style={stagger(210)}>
            <SmartSearchHub catalog={catalog} variant="hero" />
          </div>

          <div className="al-in mt-4 flex flex-wrap items-center justify-center gap-2" style={stagger(270)}>
            <span className="text-[12px] text-[var(--al-ink-3)]">Popular</span>
            {popular.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="al-hairline rounded-full bg-[var(--al-surface)] px-3 py-1.5 text-[12px] font-medium text-[var(--al-ink-2)] transition-colors hover:border-[var(--al-line-strong)] hover:text-[var(--al-ink)]"
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="al-in mt-9 flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row" style={stagger(330)}>
            <Link
              href={primaryUrl}
              className="group inline-flex h-12 items-center justify-center gap-2 rounded-[var(--al-radius)] bg-[var(--al-ink)] px-6 text-[14px] font-semibold text-white transition-colors hover:bg-[#22232b]"
            >
              {primaryLabel}
              <ArrowRight
                className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
            <Link
              href={secondaryUrl}
              className="al-hairline inline-flex h-12 items-center justify-center rounded-[var(--al-radius)] bg-[var(--al-surface)] px-6 text-[14px] font-semibold text-[var(--al-ink)] transition-colors hover:border-[var(--al-line-strong)]"
            >
              {secondaryLabel}
            </Link>
          </div>

          <ul
            className="al-in mt-10 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12px] text-[var(--al-ink-3)]"
            style={stagger(390)}
          >
            {assurances.map((label, index) => (
              <li key={label} className="flex items-center gap-5">
                {index > 0 ? <span className="h-3 w-px bg-[var(--al-line-strong)]" aria-hidden="true" /> : null}
                <span>{label}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Two quiet entry points. Cards, but hairline-thin and unfilled —
            they support the hero instead of competing with it. */}
        <div className="al-in mx-auto mt-14 grid max-w-4xl gap-3 sm:grid-cols-2 lg:mt-20" style={stagger(450)}>
          {[
            {
              href: "/print",
              icon: Printer,
              title: "Smart Print",
              body: "Scan a QR or upload from your phone. Collect at the counter.",
            },
            {
              href: "/track-application",
              icon: ShieldCheck,
              title: "Track an application",
              body: "Every status change, document request and receipt in one place.",
            },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.title}
                href={card.href}
                className="al-hairline al-lift group flex items-start gap-3.5 rounded-[var(--al-radius-lg)] bg-[var(--al-surface)] p-5"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--al-accent-soft)] text-[var(--al-accent)]">
                  <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 text-[15px] font-semibold text-[var(--al-ink)]">
                    {card.title}
                    <ArrowUpRight
                      className="h-4 w-4 text-[var(--al-ink-3)] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </span>
                  <span className="mt-1 block text-[13px] leading-relaxed text-[var(--al-ink-2)]">{card.body}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/**
 * Compact assurance strip for mobile placement after Quick Actions.
 *
 * Kept as a separate export because the page composes it independently.
 */
export function HomepageTrustChips() {
  return (
    <section
      aria-label="Trust benefits"
      className="border-y border-[var(--al-line)] bg-[var(--al-surface)] px-[var(--mobile-page-gutter)] py-3 lg:hidden"
    >
      <ul className="mx-auto flex max-w-[var(--dc-max)] items-center justify-center gap-3 text-[11px] text-[var(--al-ink-3)]">
        <li className="flex items-center gap-1.5">
          <Lock className="h-3 w-3" aria-hidden="true" />
          Razorpay secured
        </li>
        <li className="h-3 w-px bg-[var(--al-line-strong)]" aria-hidden="true" />
        <li>Documents encrypted</li>
        <li className="h-3 w-px bg-[var(--al-line-strong)]" aria-hidden="true" />
        <li>Human verified</li>
      </ul>
    </section>
  );
}
