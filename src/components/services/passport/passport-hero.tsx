"use client";

import { getImageProps } from "next/image";
import { useEffect, useRef, type CSSProperties } from "react";
import {
  BadgeCheck,
  Check,
  FileCheck2,
  Headphones,
  Landmark,
  ListChecks,
  Scale,
  ShieldCheck,
} from "lucide-react";

import { PASSPORT_INCLUSIONS, PASSPORT_TRUST, PASSPORT_VISUALS } from "@/lib/passport/content";
import { cn } from "@/lib/utils";
import { HERO_ID } from "./passport-finale";
import { ChakraWheel, LiquidGlassCard, PassportBooklet, PassportCTA, type PassportLinks } from "./passport-ui";
import s from "./passport.module.css";

/** One step of the entrance timeline. */
const beat = (i: number) => ({ "--i": i }) as CSSProperties;

/* The flight path drawn over the hero, in the hero's own 0–100 space. */
const HERO_FLIGHT = "M4 78 C 26 60, 44 40, 62 30 S 88 14, 98 8";

/**
 * Desktop-only parallax.
 *
 * Writes one custom property per frame and lets CSS do the rest, so React
 * never re-renders on scroll. Off on phones, where the extra compositing costs
 * more than it gives, and off entirely under reduced motion.
 */
function useHeroParallax() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const wide = window.matchMedia("(min-width: 1024px)");
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;

    const update = () => {
      frame = 0;
      const y = Math.min(window.scrollY, el.offsetHeight);
      el.style.setProperty("--py", String(y));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const sync = () => {
      window.removeEventListener("scroll", onScroll);
      el.style.setProperty("--py", "0");
      if (wide.matches && !still.matches) {
        window.addEventListener("scroll", onScroll, { passive: true });
        update();
      }
    };

    sync();
    wide.addEventListener("change", sync);
    still.addEventListener("change", sync);
    return () => {
      window.removeEventListener("scroll", onScroll);
      wide.removeEventListener("change", sync);
      still.removeEventListener("change", sync);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return ref;
}

const depth = (factor: number): CSSProperties => ({
  transform: `translate3d(0, calc(var(--py, 0) * ${factor}px), 0)`,
});

export function PassportHero({ links }: { links: PassportLinks }) {
  const ref = useHeroParallax();
  const wide = PASSPORT_VISUALS.hero;
  const tall = PASSPORT_VISUALS.heroPortrait;

  /* Art direction: a 9:16 crop for phones, the full scene from 1024px. Built
     with getImageProps so both sources still go through the optimiser and
     only the one that matches is ever downloaded. */
  const common = { alt: wide.alt, priority: true, sizes: "100vw" } as const;
  const desktop = getImageProps({ ...common, src: wide.src, width: wide.width, height: wide.height }).props;
  const mobile = getImageProps({ ...common, src: tall.src, width: tall.width, height: tall.height }).props;

  return (
    <section
      ref={ref}
      id={HERO_ID}
      aria-labelledby="passport-hero-title"
      className={cn(s.hero, "relative flex min-h-[100svh] flex-col justify-end overflow-hidden lg:min-h-[min(880px,96vh)] lg:justify-center")}
    >
      {/* Layer 1 — the scene (0.2×). */}
      <div className="absolute inset-0 -z-10" style={depth(0.2)}>
        <picture>
          <source media="(min-width: 1024px)" srcSet={desktop.srcSet} sizes="100vw" />
          <source srcSet={mobile.srcSet} sizes="100vw" />
          {/* eslint-disable-next-line jsx-a11y/alt-text -- props come from getImageProps, alt included */}
          <img
            {...mobile}
            className={cn(s.heroArt, "h-full w-full object-cover object-[50%_18%] lg:object-[74%_center]")}
          />
        </picture>
        <div className={cn(s.heroShade, "absolute inset-0")} />
      </div>

      {/* Layer 2 — the wheel (0.4×), desktop only. */}
      <div className="pointer-events-none absolute -left-40 bottom-[-12rem] -z-10 hidden h-[34rem] w-[34rem] text-white/[0.07] lg:block" style={depth(0.4)}>
        <ChakraWheel className="h-full w-full" />
      </div>

      {/* Layer 3 — the flight path (0.6×). */}
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 -z-10 hidden h-full w-full lg:block"
        style={depth(0.6)}
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <linearGradient id="pp-hero-flight" x1="0" x2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="45%" stopColor="#9cc7ff" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#ffb27a" stopOpacity="0.9" />
          </linearGradient>
        </defs>
        <path
          d={HERO_FLIGHT}
          pathLength={1}
          fill="none"
          stroke="url(#pp-hero-flight)"
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
          className={s.flightDraw}
        />
      </svg>

      {/* Copy. */}
      <div className="relative mx-auto w-full max-w-[1280px] px-5 pb-10 pt-[calc(var(--header-height)+2rem)] sm:px-8 lg:px-12 lg:pb-24">
        <div className="max-w-xl">
          <p
            className={cn(s.beat, s.eyebrow, "inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-[0.68rem] text-white backdrop-blur-md")}
            style={beat(1)}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--pp-orange)]" aria-hidden="true" />
            Passport assistance · India
          </p>

          <h1
            id="passport-hero-title"
            className={cn(s.beat, s.display, "mt-5 text-[2.9rem] text-white sm:text-6xl lg:text-[4.6rem]")}
            style={beat(2)}
          >
            Your Passport Journey.
            <span className={cn(s.inkLight, "block")}>Simplified.</span>
          </h1>

          <p className={cn(s.beat, s.lede, "mt-5 max-w-md text-base leading-relaxed text-blue-50/85 sm:text-lg")} style={beat(3)}>
            From documents to application guidance, get professional assistance throughout your passport journey.
          </p>

          {links.priceText && (
            <p className={cn(s.beat, "mt-6 flex items-baseline gap-3")} style={beat(4)}>
              <span className={cn(s.display, "text-4xl text-white sm:text-[2.75rem]")}>{links.priceText}</span>
              <span className="text-sm leading-tight text-blue-100/75">
                service charge
                <span className="block">official fees separate</span>
              </span>
            </p>
          )}

          <div className={cn(s.beat, "mt-7 flex flex-col gap-3 sm:flex-row")} style={beat(5)}>
            <PassportCTA href={links.applyHref}>Start Passport Application</PassportCTA>
            <PassportCTA href="#documents" variant="glass" icon={<ListChecks className="h-4 w-4" aria-hidden="true" />}>
              Check Documents
            </PassportCTA>
          </div>

          <p className={cn(s.beat, "mt-6 flex items-start gap-2 text-xs leading-relaxed text-blue-100/65")} style={beat(6)}>
            <Landmark className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            A private assistance service — not a government website.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   The price dock: floats up over the bottom of the hero.
   ───────────────────────────────────────────────────────────────────────── */

const TRUST_ICONS = [BadgeCheck, Scale, ShieldCheck, Headphones, FileCheck2];

export function PassportPriceDock({ links }: { links: PassportLinks }) {
  return (
    <section aria-label="Passport assistance price" className="relative z-10 -mt-4 px-4 sm:px-8 lg:-mt-20 lg:px-12">
      <div className="mx-auto grid max-w-[1280px] gap-4 lg:grid-cols-[1.05fr_1fr] lg:gap-6">
        <PassportPriceCard links={links} />

        <div className="grid gap-4 lg:gap-6">
          <LiquidGlassCard className="p-6 sm:p-7">
            <h2 className={cn(s.eyebrow, "text-[var(--pp-blue)]")}>What you pay, and to whom</h2>
            <dl className="mt-4 divide-y divide-[rgba(8,43,99,0.08)] text-sm">
              <div className="flex items-start justify-between gap-4 py-3">
                <dt>
                  <span className="font-semibold text-[var(--pp-ink)]">DigiConnect service charge</span>
                  <span className="mt-0.5 block text-[var(--pp-muted)]">Paid to DigiConnect Dukan</span>
                </dt>
                <dd className="shrink-0 text-right font-semibold text-[var(--pp-ink)]">{links.priceText ?? "Shown at checkout"}</dd>
              </div>
              <div className="flex items-start justify-between gap-4 py-3">
                <dt>
                  <span className="font-semibold text-[var(--pp-ink)]">Official passport fee</span>
                  <span className="mt-0.5 block text-[var(--pp-muted)]">Paid on the Passport Seva portal</span>
                </dt>
                <dd className="shrink-0 text-right text-[var(--pp-body)]">As per MEA schedule</dd>
              </div>
              <div className="flex items-start justify-between gap-4 py-3">
                <dt>
                  <span className="font-semibold text-[var(--pp-ink)]">Other charges</span>
                  <span className="mt-0.5 block text-[var(--pp-muted)]">Nothing added by us</span>
                </dt>
                <dd className="shrink-0 text-right text-[var(--pp-body)]">None</dd>
              </div>
            </dl>
          </LiquidGlassCard>

          <LiquidGlassCard className="p-5 sm:p-6">
            <h2 className="sr-only">Why customers use DigiConnect Dukan</h2>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3 lg:grid-cols-3">
              {PASSPORT_TRUST.map((item, i) => {
                const Icon = TRUST_ICONS[i % TRUST_ICONS.length];
                return (
                  <li key={item.title} className={cn("flex items-start gap-2.5", i === PASSPORT_TRUST.length - 1 && "col-span-2 sm:col-span-1")}>
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[rgba(18,104,232,0.08)] text-[var(--pp-blue)]">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[0.82rem] font-semibold leading-snug text-[var(--pp-ink)]">{item.title}</span>
                      <span className="block text-xs leading-snug text-[var(--pp-muted)]">{item.body}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </LiquidGlassCard>
        </div>
      </div>
    </section>
  );
}

export function PassportPriceCard({ links }: { links: PassportLinks }) {
  return (
    <LiquidGlassCard interactive className="overflow-hidden p-6 sm:p-8">
      {/* The passport, floating at the card's edge. */}
      <div className="pointer-events-none absolute -right-6 -top-4 w-24 rotate-[14deg] opacity-90 sm:-right-4 sm:top-6 sm:w-32" aria-hidden="true">
        <div className={s.float}>
          <PassportBooklet />
        </div>
      </div>

      <p className={cn(s.eyebrow, "text-[var(--pp-blue)]")}>Passport assistance</p>
      <p className={cn(s.display, "mt-3 text-5xl text-[var(--pp-ink)] sm:text-6xl")}>
        {links.priceText ?? <span className="text-3xl sm:text-4xl">Price at checkout</span>}
      </p>
      <p className="mt-2 text-sm text-[var(--pp-body)]">Professional application assistance · DigiConnect service charge</p>

      <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
        {PASSPORT_INCLUSIONS.map((item) => (
          <li key={item} className="flex items-center gap-2.5 text-[0.95rem] text-[var(--pp-ink)]">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--pp-blue)] text-white">
              <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
            </span>
            {item}
          </li>
        ))}
      </ul>

      <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
        <PassportCTA href={links.applyHref}>Start Application</PassportCTA>
        <p className="text-xs leading-relaxed text-[var(--pp-muted)] sm:max-w-[15rem]">
          The official passport fee is paid separately, on Passport Seva.
        </p>
      </div>
    </LiquidGlassCard>
  );
}
