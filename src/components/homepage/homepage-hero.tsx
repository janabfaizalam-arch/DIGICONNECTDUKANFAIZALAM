import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Printer,
  QrCode,
  Upload,
  ShieldCheck,
  Headphones,
  Globe2,
  BadgeCheck,
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

function SmartPrintModule({ compact = false }: { compact?: boolean }) {
  return (
    <aside
      className={`rounded-2xl border border-[var(--dc-orange-500)]/30 bg-[var(--dc-cream)] shadow-[0_12px_28px_rgba(242,90,0,0.16)] ${
        compact ? "p-3" : "p-4"
      }`}
      aria-labelledby="smart-print-heading"
    >
      <div className="flex items-center gap-2.5">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--dc-orange-500)] text-white">
          <Printer className="h-5 w-5" aria-hidden="true" />
        </span>
        <h2
          id="smart-print-heading"
          className="text-base font-black uppercase tracking-wide text-[var(--dc-orange-600)] sm:text-lg"
        >
          Smart Print
        </h2>
      </div>
      <p className={`mt-2 font-semibold leading-relaxed text-[var(--dc-ink)] ${compact ? "text-[11px]" : "text-xs sm:text-sm"}`}>
        Scan QR or upload securely. Colour or B&amp;W on the print flow.
      </p>
      <Link
        href="/print"
        className="mt-2.5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--dc-orange-500)] px-4 text-sm font-black text-white transition hover:bg-[var(--dc-orange-600)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dc-orange-400)]"
      >
        Get Started
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
      <ul className="mt-2 grid grid-cols-3 gap-1.5">
        {[
          { href: "/print", label: "Scan QR", short: "Scan", icon: QrCode },
          { href: "/print", label: "Upload", short: "Upload", icon: Upload },
          { href: "/print", label: "Print", short: "Print", icon: Printer },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.label}>
              <Link
                href={item.href}
                className="flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-xl border border-[var(--dc-orange-500)]/20 bg-white px-1 py-1.5 text-[10px] font-extrabold text-[var(--dc-orange-600)]"
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {compact ? item.short : item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

function sanitizeHref(url: string, fallback: string) {
  const trimmed = url.trim();
  if (!trimmed || /^javascript:/i.test(trimmed) || /^data:/i.test(trimmed)) return fallback;
  return trimmed;
}

/**
 * Option 3 desktop: ~40% copy / ~40% photo / ~20% Smart Print.
 * Mobile: compact stack with early Smart Print; separate mobile crop as atmosphere.
 */
export function HomepageHero({ catalog, slides }: HomepageHeroProps) {
  const leadSlide = slides[0] ?? null;
  const heading = leadSlide?.title?.trim() || "India’s most trusted partner for digital services.";
  const subtitle =
    leadSlide?.subtitle?.trim() ||
    "Fast, reliable and secure private digital assistance for individuals, businesses and entrepreneurs — by RNOS India Pvt Ltd.";
  const primaryUrl = sanitizeHref(leadSlide?.cta_primary_url || "", "/services");
  const primaryLabel = leadSlide?.cta_primary_label?.trim() || "Explore services";
  const secondaryUrl = sanitizeHref(leadSlide?.cta_secondary_url || "", "/track-application");
  const secondaryLabel = leadSlide?.cta_secondary_label?.trim() || "Track application";

  return (
    <section
      className="relative overflow-hidden bg-gradient-to-r from-[var(--dc-blue-800)] via-[var(--dc-blue-700)] to-[var(--dc-blue-500)] text-white"
      aria-labelledby="home-hero-heading"
    >
      <div className="pointer-events-none absolute inset-0 lg:hidden" aria-hidden="true">
        <Image
          src={HOMEPAGE_HERO_MOBILE}
          alt=""
          fill
          priority
          className="object-cover object-center opacity-25"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--dc-blue-800)]/90 via-[var(--dc-blue-700)]/88 to-[var(--dc-blue-700)]" />
      </div>

      <div
        className="pointer-events-none absolute inset-0 hidden opacity-40 lg:block"
        style={{
          background:
            "radial-gradient(ellipse 55% 70% at 8% 20%, rgba(255,104,0,0.28), transparent 55%), radial-gradient(ellipse 50% 60% at 92% 10%, rgba(255,255,255,0.18), transparent 50%)",
        }}
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-[var(--dc-max)] px-[var(--mobile-page-gutter)] py-3 sm:px-6 sm:py-5 md:px-8 md:py-6 lg:py-7">
        <div className="grid items-stretch gap-3 lg:min-h-[330px] lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1fr)_minmax(240px,0.48fr)] lg:gap-4 xl:min-h-[350px]">
          <div className="flex min-w-0 flex-col justify-center">
            <h1
              id="home-hero-heading"
              className="max-w-xl text-[1.45rem] font-black leading-tight tracking-tight sm:text-3xl lg:max-w-md lg:text-[2rem] lg:leading-[1.12] xl:text-[2.25rem]"
            >
              {heading.includes("digital") ? (
                <>
                  {heading.split(/(digital\s+assistance|digital\s+services\.?)/i).map((part, i) =>
                    /digital\s+(assistance|services)/i.test(part) ? (
                      <span key={i} className="text-[var(--dc-orange-400)]">
                        {part}
                      </span>
                    ) : (
                      <span key={i}>{part}</span>
                    ),
                  )}
                </>
              ) : (
                heading
              )}
            </h1>
            <p className="mt-2 line-clamp-3 max-w-xl text-[13px] font-semibold leading-relaxed text-white/90 sm:text-sm lg:mt-2.5 lg:line-clamp-none lg:max-w-md">
              {subtitle}
            </p>
            <div className="mt-3 max-w-xl lg:mt-4">
              <SmartSearchHub catalog={catalog} variant="hero" />
            </div>
            <div className="mt-3 flex gap-2 lg:flex-wrap">
              <Link
                href={primaryUrl}
                className="inline-flex h-11 flex-1 items-center justify-center rounded-xl bg-[var(--dc-orange-500)] px-3 text-sm font-black text-white transition hover:bg-[var(--dc-orange-600)] sm:flex-none sm:px-4"
              >
                {primaryLabel}
              </Link>
              <Link
                href={secondaryUrl}
                className="inline-flex h-11 flex-1 items-center justify-center rounded-xl border border-white/35 bg-white/10 px-3 text-sm font-bold text-white transition hover:bg-white/20 sm:flex-none sm:px-4"
              >
                {secondaryLabel}
              </Link>
            </div>

            {/* Mobile: Smart Print immediately after CTAs */}
            <div className="mt-3 lg:hidden">
              <SmartPrintModule compact />
            </div>

            <ul className="mt-5 hidden grid-cols-2 gap-2 lg:grid xl:grid-cols-4">
              {trustItems.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.label} className="flex items-center gap-2 rounded-xl bg-white/10 px-2.5 py-2 text-[11px] font-bold">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/15">
                      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    <span className="leading-tight">{item.label}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="relative hidden min-h-[300px] overflow-hidden rounded-2xl shadow-[0_18px_40px_rgba(7,31,77,0.28)] lg:block">
            <Image
              src={HOMEPAGE_HERO_DESKTOP}
              alt="DigiConnect advisor assisting a customer with digital documentation"
              fill
              priority
              className="object-cover object-[62%_center]"
              sizes="(max-width: 1280px) 40vw, 560px"
            />
            <div
              className="pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-[var(--dc-blue-700)]/55 to-transparent"
              aria-hidden="true"
            />
          </div>

          <div className="hidden items-center lg:flex">
            <div className="w-full max-w-[280px]">
              <SmartPrintModule />
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
