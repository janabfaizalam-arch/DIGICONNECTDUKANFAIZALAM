import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Car,
  CreditCard,
  FileText,
  Headphones,
  IdCard,
  Landmark,
  Plane,
  Printer,
  Receipt,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { SmartSearchHub, type SearchCatalogItem } from "@/components/homepage/smart-search-hub";
import type { HomepageSlide } from "@/lib/homepage-slides";
import { HOMEPAGE_HERO_DESKTOP, HOMEPAGE_HERO_MOBILE } from "@/lib/homepage-visual-assets";

type HomepageHeroProps = {
  catalog: SearchCatalogItem[];
  slides: HomepageSlide[];
};

/**
 * The services people actually arrive for.
 *
 * Each carries its own colour so the row scans as a set of distinct
 * destinations rather than a grey list — a customer looking for "GST" should
 * find it without reading every tile.
 */
const quickServices = [
  { label: "GST", sub: "Registration", href: "/services/gst-registration", icon: Receipt, tint: "bg-blue-50 text-blue-700 ring-blue-100" },
  { label: "ITR", sub: "Filing", href: "/services/itr-filing", icon: FileText, tint: "bg-emerald-50 text-emerald-700 ring-emerald-100" },
  { label: "PAN", sub: "New / correction", href: "/services", icon: IdCard, tint: "bg-violet-50 text-violet-700 ring-violet-100" },
  { label: "Passport", sub: "Apply / renew", href: "/services", icon: Plane, tint: "bg-sky-50 text-sky-700 ring-sky-100" },
  { label: "Insurance", sub: "Vehicle", href: "/services", icon: Car, tint: "bg-amber-50 text-amber-700 ring-amber-100" },
  { label: "Schemes", sub: "Government", href: "/#schemes", icon: Landmark, tint: "bg-rose-50 text-rose-700 ring-rose-100" },
] as const;

const assurances = [
  { label: "Razorpay secured", icon: ShieldCheck },
  { label: "Expert checked", icon: BadgeCheck },
  { label: "WhatsApp support", icon: Headphones },
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
 * Homepage hero.
 *
 * Brand-led rather than monochrome: the logo is blue and orange, so the page
 * is too. Colour here is doing a job — the service tiles are colour-coded so a
 * customer can find the one they came for at a glance, which matters more on
 * this site than visual restraint does.
 *
 * Headline, subtitle, CTAs and the announcement all come from the CMS lead
 * slide when one is set.
 */
export function HomepageHero({ catalog, slides }: HomepageHeroProps) {
  const leadSlide = slides[0] ?? null;
  const heading = leadSlide?.title?.trim() || "India's most trusted partner for digital services.";
  const subtitle =
    leadSlide?.subtitle?.trim() ||
    "GST, ITR, passport, licence, insurance and government schemes — prepared, checked and tracked by people who do this every day.";
  const primaryUrl = sanitizeHref(leadSlide?.cta_primary_url || "", "/services");
  const primaryLabel = leadSlide?.cta_primary_label?.trim() || "Explore services";
  const secondaryUrl = sanitizeHref(leadSlide?.cta_secondary_url || "", "/track-application");
  const secondaryLabel = leadSlide?.cta_secondary_label?.trim() || "Track application";

  // Hero artwork is admin-managed through Homepage CMS -> Slides. Only https
  // sources are honoured; anything else falls back to the bundled asset rather
  // than rendering a broken image on the busiest page of the site.
  const slideImage = (leadSlide?.image_url ?? "").trim();
  const slideMobileImage = (leadSlide?.mobile_image_url ?? "").trim();
  const desktopImage = slideImage.startsWith("https://") ? slideImage : HOMEPAGE_HERO_DESKTOP;
  const mobileImage = slideMobileImage.startsWith("https://")
    ? slideMobileImage
    : slideImage.startsWith("https://")
      ? slideImage
      : HOMEPAGE_HERO_MOBILE;

  return (
    <section className="relative isolate overflow-hidden text-white" aria-labelledby="home-hero-heading">
      <div
        className="pointer-events-none absolute inset-0 -z-20"
        style={{ background: "linear-gradient(135deg, #062f75 0%, #0a4fa8 52%, #1268cf 100%)" }}
        aria-hidden="true"
      />
      <div
        className="al-drift pointer-events-none absolute -left-40 -top-48 -z-10 h-[560px] w-[560px] rounded-full opacity-70 blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(255,104,0,0.5) 0%, transparent 66%)" }}
        aria-hidden="true"
      />
      <div
        className="al-drift pointer-events-none absolute -bottom-56 right-[-12%] -z-10 h-[560px] w-[560px] rounded-full opacity-60 blur-3xl"
        style={{
          background: "radial-gradient(circle, rgba(56,189,248,0.45) 0%, transparent 66%)",
          animationDelay: "-11s",
        }}
        aria-hidden="true"
      />
      <div className="pointer-events-none absolute inset-0 -z-10 lg:hidden" aria-hidden="true">
        <Image
          src={mobileImage}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center opacity-[0.18]"
        />
      </div>

      <div className="relative mx-auto max-w-[var(--dc-max)] px-[var(--mobile-page-gutter)] pb-8 pt-5 sm:px-6 sm:pb-10 sm:pt-7 md:px-8 lg:pb-12 lg:pt-9">
        <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.9fr)] lg:gap-10">
          <div className="flex min-w-0 flex-col">
            <Link
              href="/digi-partner"
              className="al-in inline-flex w-fit items-center gap-2 rounded-full border border-white/25 bg-white/10 py-1.5 pl-2 pr-3.5 text-[11px] font-bold backdrop-blur-sm transition hover:bg-white/20"
              style={stagger(0)}
            >
              <span className="rounded-full bg-[var(--dc-orange-500)] px-2 py-0.5 text-[10px] font-black uppercase tracking-wide">
                New
              </span>
              <Sparkles className="h-3.5 w-3.5 text-[var(--dc-orange-400)]" aria-hidden="true" />
              Earn every month as a Digi Partner
            </Link>

            <h1
              id="home-hero-heading"
              className="al-in mt-4 max-w-xl text-[1.9rem] font-black leading-[1.08] tracking-tight sm:text-[2.5rem] lg:text-[2.9rem]"
              style={stagger(70)}
            >
              {heading.split(/(digital\s+assistance|digital\s+services)/i).map((part, index) =>
                /digital\s+(assistance|services)/i.test(part) ? (
                  <span key={index} className="text-[var(--dc-orange-400)]">
                    {part}
                  </span>
                ) : (
                  <span key={index}>{part}</span>
                ),
              )}
            </h1>

            <p
              className="al-in mt-3 max-w-xl text-[13.5px] font-medium leading-relaxed text-white/80 sm:text-[15px]"
              style={stagger(140)}
            >
              {subtitle}
            </p>

            {/*
              The search panel opens absolutely positioned. This wrapper must
              hold an explicit z-index above the buttons below it: the entrance
              animation applies a transform, which creates a stacking context
              and would otherwise trap the panel's own z-index inside it — the
              suggestions then render underneath the CTAs.
            */}
            <div className="al-in relative z-40 mt-5 max-w-xl" style={stagger(200)}>
              <SmartSearchHub catalog={catalog} variant="hero" />
            </div>

            <div className="al-in relative z-10 mt-4 flex flex-wrap gap-2.5" style={stagger(260)}>
              <Link
                href={primaryUrl}
                className="group inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--dc-orange-500)] px-5 text-sm font-black shadow-lg shadow-orange-900/25 transition hover:-translate-y-0.5 hover:bg-[var(--dc-orange-600)] sm:flex-none"
              >
                {primaryLabel}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
              <Link
                href={secondaryUrl}
                className="inline-flex h-12 flex-1 items-center justify-center rounded-xl border border-white/30 bg-white/10 px-5 text-sm font-bold backdrop-blur-sm transition hover:-translate-y-0.5 hover:bg-white/20 sm:flex-none"
              >
                {secondaryLabel}
              </Link>
            </div>

            <ul className="al-in mt-5 flex flex-wrap items-center gap-x-4 gap-y-2" style={stagger(320)}>
              {assurances.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.label} className="flex items-center gap-1.5 text-[11.5px] font-bold text-white/75">
                    <Icon className="h-3.5 w-3.5 text-[var(--dc-orange-400)]" aria-hidden="true" />
                    {item.label}
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="al-in relative hidden lg:block" style={stagger(180)}>
            <div className="relative overflow-hidden rounded-[26px] shadow-[0_36px_70px_-24px_rgba(2,12,40,0.8)] ring-1 ring-white/20">
              <div className="relative aspect-[4/3.1]">
                <Image
                  src={desktopImage}
                  alt="DigiConnect advisor assisting a customer with digital documentation"
                  fill
                  priority
                  sizes="(max-width: 1280px) 45vw, 600px"
                  className="object-cover object-[58%_center]"
                />
                <div
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#052a63]/75 via-transparent to-transparent"
                  aria-hidden="true"
                />
              </div>
            </div>

            {/* Smart Print as a real offer card, not a boxed sidebar. */}
            <div className="absolute -bottom-5 -left-6 w-[248px] rounded-2xl border border-white/20 bg-white p-3.5 text-[var(--dc-ink)] shadow-2xl">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--dc-orange-500)] text-white">
                  <Printer className="h-[18px] w-[18px]" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-black">Smart Print</p>
                  <p className="text-[11px] font-semibold text-slate-500">Scan · upload · collect</p>
                </div>
              </div>
              <Link
                href="/print"
                className="mt-2.5 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--dc-blue-700)] text-[12px] font-black text-white transition hover:bg-[var(--dc-blue-600)]"
              >
                Start printing
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>

        {/* Colour-coded shortcuts to the services people arrive for. */}
        <div
          className="al-in relative z-10 mt-8 grid grid-cols-3 gap-2 sm:gap-3 lg:mt-12 lg:grid-cols-6"
          style={stagger(380)}
        >
          {quickServices.map((service) => {
            const Icon = service.icon;
            return (
              <Link
                key={service.label}
                href={service.href}
                className="group flex flex-col items-center gap-2 rounded-2xl border border-white/15 bg-white/95 p-3 text-center shadow-lg transition duration-300 hover:-translate-y-1 hover:shadow-xl sm:p-4"
              >
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-xl ring-1 transition group-hover:scale-105 ${service.tint}`}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-black leading-tight text-[var(--dc-ink)]">{service.label}</span>
                  <span className="mt-0.5 block truncate text-[10.5px] font-semibold text-slate-500">{service.sub}</span>
                </span>
              </Link>
            );
          })}
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
