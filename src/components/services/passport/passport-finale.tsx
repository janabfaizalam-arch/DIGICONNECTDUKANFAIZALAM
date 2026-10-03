"use client";

import Image from "next/image";
import { useEffect, useId, useState } from "react";
import { ArrowRight, Building2, ChevronDown, Globe, Landmark, Phone, Plane, PlaneTakeoff, type LucideIcon } from "lucide-react";

import { PASSPORT_DISCLAIMER, PASSPORT_VISUALS } from "@/lib/passport/content";
import { Reveal } from "@/components/homepage/motion";
import { WhatsAppIcon } from "@/components/services/shell";
import { useChromeHiddenOnScroll } from "@/lib/ui/use-chrome-visibility";
import { cn } from "@/lib/utils";
import { INDIA_OUTLINE, LiquidGlassCard, PassportCTA, SectionHeading, type PassportLinks } from "./passport-ui";
import s from "./passport.module.css";

export const HERO_ID = "passport-hero";
export const FINAL_ID = "passport-final";

/* ─────────────────────────────────────────────────────────────────────────
   "Your Journey Starts Here." — the emotional peak.
   ───────────────────────────────────────────────────────────────────────── */

const ROUTE: { Icon: LucideIcon; label: string }[] = [
  { Icon: Landmark, label: "India" },
  { Icon: Building2, label: "Airport" },
  { Icon: PlaneTakeoff, label: "Take-off" },
  { Icon: Globe, label: "The world" },
];

/* India on the left, the world on the right, and an arc between them. */
const ARC = "M150 250 C 330 40, 600 30, 860 170";

function TravelScene() {
  return (
    <svg viewBox="0 0 1000 420" className="h-auto w-full" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="pp-globe" cx="35%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#5aa0ff" stopOpacity="0.55" />
          <stop offset="60%" stopColor="#1268e8" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#082b63" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="pp-arc" x1="0" x2="1">
          <stop offset="0%" stopColor="#5aa0ff" />
          <stop offset="100%" stopColor="#ffb27a" />
        </linearGradient>
      </defs>

      <g transform="translate(60 150) scale(2.4)">
        <path d={INDIA_OUTLINE} fill="rgba(90,160,255,0.12)" stroke="#7fb5ff" strokeWidth="0.5" strokeLinejoin="round" />
        <circle cx="31.3" cy="30.2" r="2.2" fill="#ffb27a" className={s.pulse} />
      </g>

      <g transform="translate(860 230)">
        <circle r="120" fill="url(#pp-globe)" />
        <circle r="96" fill="none" stroke="#7fb5ff" strokeOpacity="0.45" strokeWidth="1" />
        <ellipse rx="96" ry="34" fill="none" stroke="#7fb5ff" strokeOpacity="0.25" strokeWidth="1" />
        <ellipse rx="96" ry="70" fill="none" stroke="#7fb5ff" strokeOpacity="0.18" strokeWidth="1" />
        <ellipse rx="40" ry="96" fill="none" stroke="#7fb5ff" strokeOpacity="0.25" strokeWidth="1" />
        <line x1="-96" x2="96" y1="0" y2="0" stroke="#7fb5ff" strokeOpacity="0.3" strokeWidth="1" />
      </g>

      <path d={ARC} fill="none" stroke="url(#pp-arc)" strokeWidth="2.5" strokeLinecap="round" pathLength={1} className={s.flightDraw} />
      <path d={ARC} fill="none" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="1" className={s.dash} />

      <circle r="5" fill="#ffd9bd" className={s.spark}>
        <animateMotion dur="6s" repeatCount="indefinite" path={ARC} keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines="0.45 0 0.55 1" />
      </circle>
    </svg>
  );
}

export function PassportTravelStory({ links }: { links: PassportLinks }) {
  const visual = PASSPORT_VISUALS.travel;

  return (
    <section aria-labelledby="travel-title" className={cn(s.night, "overflow-hidden px-5 py-24 sm:px-8 sm:py-32 lg:px-12")}>
      <div aria-hidden="true" className={cn(s.grid, "absolute inset-0 -z-10")} />
      <div className="mx-auto max-w-[1280px]">
        <Reveal>
          <SectionHeading
            id="travel-title"
            tone="dark"
            align="center"
            eyebrow="From India to the world"
            title={
              <>
                Your Journey <span className={s.inkLight}>Starts Here.</span>
              </>
            }
            lede="A family wedding abroad. A first job overseas. A pilgrimage, a degree, a holiday you have been planning for years. Every one of them begins with the same small blue book."
          />
        </Reveal>

        <Reveal delay={0.1} className="mt-12 sm:mt-16">
          {visual.src ? (
            <div className="relative overflow-hidden rounded-[2rem] ring-1 ring-white/10">
              <Image src={visual.src} alt={visual.alt} width={visual.width} height={visual.height} sizes="(min-width: 1280px) 1280px, 100vw" loading="lazy" className="h-auto w-full" />
            </div>
          ) : (
            <TravelScene />
          )}
        </Reveal>

        <ol className="mx-auto mt-10 flex max-w-3xl flex-wrap items-center justify-center gap-x-2 gap-y-3 text-sm text-blue-50/85">
          {ROUTE.map(({ Icon, label }, i) => (
            <li key={label} className="flex items-center gap-2">
              <span className={cn(s.glassDark, "relative flex items-center gap-2 !rounded-full px-3.5 py-2")}>
                <Icon className="h-4 w-4 text-sky-300" aria-hidden="true" />
                {label}
              </span>
              {i < ROUTE.length - 1 && <ArrowRight className="h-4 w-4 text-white/40" aria-hidden="true" />}
            </li>
          ))}
        </ol>

        <div className="mt-12 flex justify-center">
          <PassportCTA href={links.applyHref}>Start Passport Application</PassportCTA>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   FAQ
   ───────────────────────────────────────────────────────────────────────── */

function FaqItem({ question, answer, open, onToggle }: { question: string; answer: string; open: boolean; onToggle: () => void }) {
  const id = useId();
  return (
    <LiquidGlassCard className="!rounded-2xl">
      <h3>
        <button
          type="button"
          id={`${id}-q`}
          aria-expanded={open}
          aria-controls={`${id}-a`}
          onClick={onToggle}
          className="flex w-full items-center justify-between gap-4 rounded-2xl px-5 py-5 text-left font-semibold text-[var(--pp-ink)] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#93c5fd] sm:px-6"
        >
          <span>{question}</span>
          <span
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors",
              open ? "bg-[var(--pp-blue)] text-white" : "bg-[rgba(18,104,232,0.08)] text-[var(--pp-blue)]",
            )}
            aria-hidden="true"
          >
            <ChevronDown className={cn(s.faqChevron, open && s.faqChevronOpen, "h-4 w-4")} />
          </span>
        </button>
      </h3>
      <div id={`${id}-a`} role="region" aria-labelledby={`${id}-q`} className={cn(s.faqPanel, open && s.faqPanelOpen)}>
        <div className="overflow-hidden" inert={!open}>
          <p className="px-5 pb-5 text-[0.95rem] leading-relaxed text-[var(--pp-body)] sm:px-6">{answer}</p>
        </div>
      </div>
    </LiquidGlassCard>
  );
}

export function PassportFAQ({ faqs }: { faqs: { question: string; answer: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section aria-labelledby="faq-title" className={cn(s.mist, "px-5 py-20 sm:px-8 sm:py-28 lg:px-12")}>
      <div className="mx-auto grid max-w-[1280px] gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <Reveal>
          <SectionHeading
            id="faq-title"
            eyebrow="Questions"
            title={
              <>
                Good Questions, <span className={s.inkBlue}>Straight Answers.</span>
              </>
            }
            lede="If yours is not here, ask us on WhatsApp — a person will reply."
          />
        </Reveal>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <FaqItem key={faq.question} {...faq} open={open === i} onToggle={() => setOpen(open === i ? null : i)} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Final call to action
   ───────────────────────────────────────────────────────────────────────── */

export function PassportFinalCTA({ links }: { links: PassportLinks }) {
  /* The closing scene, or the hero's when it has not been added yet — the
     same mascot either way. */
  const visual = PASSPORT_VISUALS.finalCta.src ? PASSPORT_VISUALS.finalCta : PASSPORT_VISUALS.hero;

  return (
    <section id={FINAL_ID} aria-labelledby="final-title" className={cn(s.night, "overflow-hidden")}>
      <div className="absolute inset-0 -z-10">
        <Image
          src={visual.src as string}
          alt=""
          fill
          sizes="100vw"
          loading="lazy"
          className="object-cover object-[70%_center] opacity-60"
        />
        <div className="absolute inset-0 bg-[linear-gradient(0deg,#041a3f_0%,rgba(4,26,63,0.9)_45%,rgba(4,26,63,0.4)_100%)] lg:bg-[linear-gradient(90deg,#041a3f_0%,rgba(4,26,63,0.92)_38%,rgba(4,26,63,0.2)_75%)]" />
      </div>

      <div className="mx-auto max-w-[1280px] px-5 pb-16 pt-56 sm:px-8 sm:pt-72 lg:px-12 lg:py-36">
        <Reveal className="max-w-xl">
          <p className={cn(s.eyebrow, "text-sky-200")}>Passport assistance</p>
          <h2 id="final-title" className={cn(s.display, "mt-4 text-[2.5rem] text-white sm:text-6xl")}>
            Ready to Start Your <span className={s.inkLight}>Passport Journey?</span>
          </h2>
          <p className={cn(s.lede, "mt-5 text-lg text-blue-50/85")}>Professional digital assistance, from documents to application.</p>
          {links.priceText && (
            <p className="mt-7 flex items-baseline gap-3">
              <span className={cn(s.display, "text-5xl text-white")}>{links.priceText}</span>
              <span className="text-sm text-blue-100/70">service charge · official fees separate</span>
            </p>
          )}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <PassportCTA href={links.applyHref}>Start Passport Application</PassportCTA>
            <PassportCTA href={links.whatsappHref} external variant="glass" icon={<WhatsAppIcon className="h-4 w-4" />}>
              Talk to Support
            </PassportCTA>
          </div>
          <a href={links.phoneHref} className="mt-5 inline-flex items-center gap-2 text-sm text-blue-100/75 underline-offset-4 hover:text-white hover:underline">
            <Phone className="h-4 w-4" aria-hidden="true" />
            Or call us
          </a>
        </Reveal>

        <LiquidGlassCard tone="dark" className="mt-14 flex items-start gap-3 p-5 text-sm leading-relaxed text-blue-50/75 sm:p-6 lg:mt-20">
          <Landmark className="mt-0.5 h-5 w-5 shrink-0 text-sky-300" aria-hidden="true" />
          <p>
            <span className="font-semibold text-white">Important: </span>
            {PASSPORT_DISCLAIMER}
          </p>
        </LiquidGlassCard>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Sticky call to action
   ─────────────────────────────────────────────────────────────────────────
   Shown only between the hero and the final call to action — both of which
   already carry the button — so it is never a second copy of something on
   screen. Phones get a dock above the tab bar; desktops a compact pill tucked
   under the header's right edge, clear of the contact button at the bottom
   right and of the centred calls to action in each section. */

function useBetweenHeroAndFinal() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const hero = document.getElementById(HERO_ID);
    const final = document.getElementById(FINAL_ID);
    if (!hero || !final) return;

    let pastHero = false;
    let beforeFinal = true;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === hero) pastHero = !entry.isIntersecting && entry.boundingClientRect.top < 0;
        if (entry.target === final) beforeFinal = !entry.isIntersecting && entry.boundingClientRect.top > 0;
      }
      setShow(pastHero && beforeFinal);
    });
    observer.observe(hero);
    observer.observe(final);
    return () => observer.disconnect();
  }, []);

  return show;
}

export function PassportStickyCTA({ links }: { links: PassportLinks }) {
  const show = useBetweenHeroAndFinal();
  /* When the site's tab bar slides away for reading, the dock drops into the
     space it leaves instead of floating over nothing. */
  const chromeHidden = useChromeHiddenOnScroll();

  return (
    <>
      <div
        role="region"
        aria-label="Start a passport application"
        className={cn(s.dock, !show && s.dockHidden, "fixed inset-x-0 bottom-0 z-[49] px-3 print:hidden md:hidden")}
        style={{
          paddingBottom: "calc(var(--bottom-nav-height) + env(safe-area-inset-bottom) + 0.5rem)",
          transform: show && chromeHidden ? "translate3d(0, var(--bottom-nav-height), 0)" : undefined,
        }}
        inert={!show}
      >
        <div className="dc-tabbar mx-auto flex max-w-md items-center gap-2 p-2">
          <span className="min-w-0 pl-2">
            <span className="block text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[var(--pp-muted)]">Passport Assistance</span>
            {links.priceText && <span className="block text-base font-bold leading-tight text-[var(--pp-ink)]">{links.priceText}</span>}
          </span>
          <a
            href={links.whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[var(--pp-orange)] transition active:scale-95"
            aria-label="Ask about passport assistance on WhatsApp"
          >
            <WhatsAppIcon className="h-5 w-5" />
          </a>
          <PassportCTA href={links.applyHref} className="!min-h-11 !px-4 !text-sm">
            Start Application
          </PassportCTA>
        </div>
      </div>

      <div
        role="region"
        aria-label="Start a passport application"
        className={cn(s.pill, !show && s.pillHidden, "fixed right-6 top-[calc(var(--header-height)+0.75rem)] z-[49] hidden print:hidden md:block")}
        inert={!show}
      >
        <div className={cn(s.glass, "relative flex items-center gap-4 !rounded-full py-2 pl-5 pr-2")}>
          <Plane className="h-4 w-4 text-[var(--pp-blue)]" aria-hidden="true" />
          <span className="text-sm">
            <span className="font-semibold text-[var(--pp-ink)]">Passport Assistance</span>
            {links.priceText && <span className="ml-2 text-[var(--pp-body)]">{links.priceText}</span>}
          </span>
          <PassportCTA href={links.applyHref} className="!min-h-10 !px-4 !text-sm">
            Start Application
          </PassportCTA>
        </div>
      </div>
    </>
  );
}
