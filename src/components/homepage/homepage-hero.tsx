import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Globe2,
  Headphones,
  Printer,
  QrCode,
  ShieldCheck,
  Sparkles,
  Upload,
} from "lucide-react";

import { SmartSearchHub, type SearchCatalogItem } from "@/components/homepage/smart-search-hub";
import type { HomepageSlide } from "@/lib/homepage-slides";
import { HOMEPAGE_HERO_DESKTOP, HOMEPAGE_HERO_MOBILE } from "@/lib/homepage-visual-assets";

type HomepageHeroProps = {
  catalog: SearchCatalogItem[];
  slides: HomepageSlide[];
};

const trustItems = [
  { label: "Secure payments", icon: ShieldCheck },
  { label: "Expert verification", icon: BadgeCheck },
  { label: "PAN India assistance", icon: Globe2 },
  { label: "WhatsApp support", icon: Headphones },
] as const;

/** Staggered entrance without a JS animation library. */
function rise(delayMs: number) {
  return { animationDelay: `${delayMs}ms` };
}

function sanitizeHref(url: string, fallback: string) {
  const trimmed = url.trim();
  if (!trimmed || /^javascript:/i.test(trimmed) || /^data:/i.test(trimmed)) return fallback;
  return trimmed;
}

/**
 * Smart Print, as a glass card rather than a solid orange panel.
 *
 * It used to occupy a third column of its own and compete with the headline
 * for attention; here it floats over the hero media instead.
 */
function SmartPrintCard({ compact = false }: { compact?: boolean }) {
  return (
    <aside
      className={`rounded-2xl border border-white/20 bg-white/10 shadow-[0_20px_45px_rgba(4,20,54,0.35)] backdrop-blur-xl ${
        compact ? "p-3" : "p-4"
      }`}
      aria-labelledby="smart-print-heading"
    >
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--dc-orange-500)] text-white shadow-lg shadow-orange-500/30">
          <Printer className="h-[18px] w-[18px]" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 id="smart-print-heading" className="text-sm font-black uppercase tracking-wide text-white">
            Smart Print
          </h2>
          <p className="text-[11px] font-semibold text-white/70">Scan, upload, collect</p>
        </div>
      </div>

      <Link
        href="/print"
        className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[var(--dc-orange-500)] px-4 text-[13px] font-black text-white transition hover:bg-[var(--dc-orange-600)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dc-orange-400)]"
      >
        Get started
        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </Link>

      <ul className="mt-2 grid grid-cols-3 gap-1.5">
        {[
          { label: "Scan QR", short: "Scan", icon: QrCode },
          { label: "Upload", short: "Upload", icon: Upload },
          { label: "Print", short: "Print", icon: Printer },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.label}>
              <Link
                href="/print"
                className="flex min-h-10 flex-col items-center justify-center gap-0.5 rounded-lg border border-white/15 bg-white/5 px-1 py-1.5 text-[10px] font-extrabold text-white/85 transition hover:bg-white/15"
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {compact ? item.short : item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

/**
 * Homepage hero.
 *
 * Two columns rather than three: the message and search own the left, the
 * media owns the right, and Smart Print floats on top of the media. The old
 * three-column split squeezed the headline into a narrow strip and left the
 * page's most important element — the search — visually secondary.
 *
 * Headline, subtitle and both CTAs still come from the CMS lead slide.
 */
export function HomepageHero({ catalog, slides }: HomepageHeroProps) {
  const leadSlide = slides[0] ?? null;
  const heading = leadSlide?.title?.trim() || "India's most trusted partner for digital services.";
  const subtitle =
    leadSlide?.subtitle?.trim() ||
    "Fast, reliable and secure private digital assistance for individuals, businesses and entrepreneurs — by RNOS India Pvt Ltd.";
  const primaryUrl = sanitizeHref(leadSlide?.cta_primary_url || "", "/services");
  const primaryLabel = leadSlide?.cta_primary_label?.trim() || "Explore services";
  const secondaryUrl = sanitizeHref(leadSlide?.cta_secondary_url || "", "/track-application");
  const secondaryLabel = leadSlide?.cta_secondary_label?.trim() || "Track application";

  return (
    <section
      className="relative isolate overflow-hidden bg-[#05224f] text-white"
      aria-labelledby="home-hero-heading"
    >
      {/* Depth: base wash, two drifting auroras, and a fine grid. */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(135deg, #04193c 0%, #06377d 45%, #0a4fa8 100%)",
        }}
        aria-hidden="true"
      />
      <div
        className="hero-aurora pointer-events-none absolute -left-32 -top-40 -z-10 h-[520px] w-[520px] rounded-full opacity-60 blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(255,104,0,0.55) 0%, transparent 68%)" }}
        aria-hidden="true"
      />
      <div
        className="hero-aurora pointer-events-none absolute -bottom-52 right-[-10%] -z-10 h-[560px] w-[560px] rounded-full opacity-50 blur-3xl"
        style={{
          background: "radial-gradient(circle, rgba(56,189,248,0.45) 0%, transparent 68%)",
          animationDelay: "-9s",
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.16]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.7) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, #000 30%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, #000 30%, transparent 75%)",
        }}
        aria-hidden="true"
      />

      {/* Mobile atmosphere photo, well behind the copy. */}
      <div className="pointer-events-none absolute inset-0 -z-10 lg:hidden" aria-hidden="true">
        <Image
          src={HOMEPAGE_HERO_MOBILE}
          alt=""
          fill
          priority
          className="object-cover object-center opacity-20"
          sizes="100vw"
        />
      </div>

      <div className="relative mx-auto max-w-[var(--dc-max)] px-[var(--mobile-page-gutter)] py-6 sm:px-6 sm:py-10 md:px-8 lg:py-14">
        <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-12">
          <div className="flex min-w-0 flex-col">
            <span
              className="hero-rise inline-flex w-fit items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-white/90 backdrop-blur-sm"
              style={rise(0)}
            >
              <Sparkles className="h-3.5 w-3.5 text-[var(--dc-orange-400)]" aria-hidden="true" />
              By RNOS India Pvt Ltd
            </span>

            <h1
              id="home-hero-heading"
              className="hero-rise mt-4 max-w-2xl text-[2rem] font-black leading-[1.08] tracking-tight sm:text-[2.6rem] lg:text-[3.1rem] xl:text-[3.4rem]"
              style={rise(80)}
            >
              {heading.split(/(digital\s+assistance|digital\s+services)/i).map((part, index) =>
                /digital\s+(assistance|services)/i.test(part) ? (
                  <span
                    key={index}
                    className="bg-gradient-to-r from-[var(--dc-orange-400)] via-[#ffa14d] to-[var(--dc-orange-400)] bg-clip-text text-transparent"
                  >
                    {part}
                  </span>
                ) : (
                  <span key={index}>{part}</span>
                ),
              )}
            </h1>

            <p
              className="hero-rise mt-4 max-w-xl text-[14px] font-medium leading-relaxed text-white/75 sm:text-[15px]"
              style={rise(160)}
            >
              {subtitle}
            </p>

            <div className="hero-rise mt-6 max-w-xl" style={rise(240)}>
              <SmartSearchHub catalog={catalog} variant="hero" />
            </div>

            <div className="hero-rise mt-4 flex flex-wrap gap-2.5" style={rise(320)}>
              <Link
                href={primaryUrl}
                className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--dc-orange-500)] px-5 text-sm font-black text-white shadow-lg shadow-orange-600/25 transition hover:-translate-y-0.5 hover:bg-[var(--dc-orange-600)] hover:shadow-xl hover:shadow-orange-600/30 sm:flex-none"
              >
                {primaryLabel}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href={secondaryUrl}
                className="inline-flex h-12 flex-1 items-center justify-center rounded-xl border border-white/25 bg-white/10 px-5 text-sm font-bold text-white backdrop-blur-sm transition hover:-translate-y-0.5 hover:bg-white/20 sm:flex-none"
              >
                {secondaryLabel}
              </Link>
            </div>

            {/* Mobile keeps Smart Print early — it is a walk-in driver. */}
            <div className="hero-rise mt-5 lg:hidden" style={rise(400)}>
              <SmartPrintCard compact />
            </div>

            <ul className="hero-rise mt-8 hidden gap-2.5 lg:grid lg:grid-cols-2 xl:grid-cols-4" style={rise(400)}>
              {trustItems.map((item) => {
                const Icon = item.icon;
                return (
                  <li
                    key={item.label}
                    className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.07] px-3 py-2.5 text-[11px] font-bold backdrop-blur-sm"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--dc-orange-500)]/20 text-[var(--dc-orange-400)]">
                      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    <span className="leading-tight">{item.label}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Media column — tilted card with Smart Print floating over it. */}
          <div className="hero-rise relative hidden lg:block" style={rise(200)}>
            <div className="hero-tilt relative overflow-hidden rounded-[28px] shadow-[0_40px_80px_-20px_rgba(2,12,40,0.75)] ring-1 ring-white/15">
              <div className="relative aspect-[4/3.2]">
                <Image
                  src={HOMEPAGE_HERO_DESKTOP}
                  alt="DigiConnect advisor assisting a customer with digital documentation"
                  fill
                  priority
                  className="object-cover object-[58%_center]"
                  sizes="(max-width: 1280px) 45vw, 620px"
                />
                <div
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#04193c]/70 via-transparent to-transparent"
                  aria-hidden="true"
                />
              </div>
            </div>

            <div className="absolute -bottom-6 -left-8 w-[260px]">
              <SmartPrintCard />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Compact trust strip for mobile placement after Quick Actions. */
export function HomepageTrustChips() {
  return (
    <section aria-label="Trust benefits" className="bg-[var(--dc-cream)] px-[var(--mobile-page-gutter)] py-3 lg:hidden">
      <ul className="mx-auto grid max-w-[var(--dc-max)] grid-cols-2 gap-2">
        {trustItems.map((item) => {
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
