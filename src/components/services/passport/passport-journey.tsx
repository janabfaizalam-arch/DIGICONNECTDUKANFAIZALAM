"use client";

import { useInView } from "framer-motion";
import { useRef, type CSSProperties } from "react";
import {
  BookUser,
  CalendarCheck,
  Cog,
  FileText,
  Files,
  Fingerprint,
  LayoutDashboard,
  MessageCircle,
  PlaneTakeoff,
  type LucideIcon,
} from "lucide-react";

import { PASSPORT_JOURNEY, PASSPORT_VISUALS, type JourneyIcon } from "@/lib/passport/content";
import { Reveal } from "@/components/homepage/motion";
import { cn } from "@/lib/utils";
import { LiquidGlassCard, PassportCTA, SceneImage, SectionHeading, type PassportLinks } from "./passport-ui";
import s from "./passport.module.css";

export const JOURNEY_ICONS: Record<JourneyIcon, LucideIcon> = {
  documents: Files,
  application: FileText,
  appointment: CalendarCheck,
  verification: Fingerprint,
  processing: Cog,
  passport: BookUser,
  travel: PlaneTakeoff,
};

const delay = (i: number): CSSProperties => ({ transitionDelay: `${i * 140}ms` });

function JourneyNode({ icon, index, lit }: { icon: JourneyIcon; index: number; lit: boolean }) {
  const Icon = JOURNEY_ICONS[icon];
  const last = index === PASSPORT_JOURNEY.length - 1;
  return (
    <span
      className={cn(
        s.node,
        "relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border backdrop-blur-md",
        lit
          ? cn(s.nodeLit, last ? "border-orange-200 bg-[var(--pp-orange)] text-white" : "border-white bg-[var(--pp-blue)] text-white")
          : "border-[rgba(18,104,232,0.18)] bg-white/80 text-[var(--pp-blue)]",
      )}
      style={delay(index)}
      aria-hidden="true"
    >
      <Icon className="h-6 w-6" strokeWidth={1.8} />
    </span>
  );
}

/**
 * "From Documents to Departure."
 *
 * Seven stops on one glowing rail — across the page on desktop, down it on
 * phones. The rail fills and the nodes light in order the first time the
 * section is seen; a reader who prefers reduced motion gets the lit state
 * with no transition (the stylesheet drops them).
 */
export function PassportJourney() {
  const ref = useRef<HTMLOListElement>(null);
  const lit = useInView(ref, { once: true, margin: "0px 0px -20% 0px" });

  return (
    <section aria-labelledby="journey-title" className={cn(s.mist, "relative px-5 py-20 sm:px-8 sm:py-28 lg:px-12")}>
      <div className="mx-auto max-w-[1280px]">
        <Reveal>
          <SectionHeading
            id="journey-title"
            eyebrow="Your journey"
            title={
              <>
                From Documents <span className={s.inkBlue}>to Departure.</span>
              </>
            }
            lede="Seven stops between you and your passport. We stay with you through the first three, and help you understand every one after."
          />
        </Reveal>

        <SceneImage
          visual={PASSPORT_VISUALS.timeline}
          sizes="(min-width: 1280px) 1280px, 100vw"
          className="mt-12 aspect-[16/7] rounded-[1.75rem] shadow-[0_40px_80px_-40px_rgba(8,43,99,0.55)]"
          fallback={null}
        />

        <ol ref={ref} className="relative mt-14 grid gap-7 lg:mt-20 lg:grid-cols-7 lg:gap-4">
          {/* Rail — vertical on phones, horizontal from lg. */}
          <span aria-hidden="true" className="absolute bottom-7 left-7 top-7 w-px -translate-x-1/2 bg-[rgba(18,104,232,0.14)] lg:hidden" />
          <span
            aria-hidden="true"
            className={cn(s.railFillVertical, "absolute bottom-7 left-7 top-7 w-[3px] rounded-full bg-[linear-gradient(180deg,var(--pp-blue),#5aa0ff_70%,var(--pp-orange))] lg:hidden")}
            style={{ transform: `translateX(-50%) scaleY(${lit ? 1 : 0})` }}
          />
          <span aria-hidden="true" className="absolute left-[7%] right-[7%] top-7 hidden h-px bg-[rgba(18,104,232,0.14)] lg:block" />
          <span
            aria-hidden="true"
            className={cn(s.railFill, "absolute left-[7%] right-[7%] top-[27px] hidden h-[3px] rounded-full bg-[linear-gradient(90deg,var(--pp-blue),#5aa0ff_70%,var(--pp-orange))] lg:block")}
            style={{ transform: `scaleX(${lit ? 1 : 0})` }}
          />

          {PASSPORT_JOURNEY.map((step, i) => (
            <li key={step.title} className="relative flex gap-5 lg:flex-col lg:items-center lg:gap-4 lg:text-center">
              <JourneyNode icon={step.icon} index={i} lit={lit} />
              <div className="min-w-0 pt-1 lg:pt-0">
                <p className="text-xs font-semibold tabular-nums tracking-[0.14em] text-[var(--pp-blue)]">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-1 text-lg font-semibold leading-snug text-[var(--pp-ink)]">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[var(--pp-body)]">{step.body}</p>
                <p className="mt-2 inline-flex rounded-full bg-white px-2.5 py-1 text-[0.7rem] font-medium text-[var(--pp-muted)] ring-1 ring-[rgba(8,43,99,0.08)]">
                  {step.who}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Status
   ─────────────────────────────────────────────────────────────────────────
   There is no live passport-stage feed to connect to, so this is drawn as an
   illustration of how a file moves and labelled as one. Real updates are where
   they actually are: the customer's dashboard, WhatsApp, and Passport Seva. */

const TRACK_STEPS = PASSPORT_JOURNEY.slice(0, 6);

export function PassportTracking({ links }: { links: PassportLinks }) {
  const ref = useRef<HTMLOListElement>(null);
  const lit = useInView(ref, { once: true, margin: "0px 0px -15% 0px" });

  const tracker = (
    <LiquidGlassCard tone="dark" className="p-6 sm:p-8">
      <p className={cn(s.eyebrow, "text-sky-200/80")}>Illustration · how a passport file moves</p>
      <ol ref={ref} className="relative mt-6 space-y-5">
        <span aria-hidden="true" className="absolute bottom-5 left-5 top-5 w-px -translate-x-1/2 bg-white/15" />
        <span
          aria-hidden="true"
          className={cn(s.railFillVertical, "absolute bottom-5 left-5 top-5 w-[3px] rounded-full bg-[linear-gradient(180deg,#5aa0ff,var(--pp-orange))]")}
          style={{ transform: `translateX(-50%) scaleY(${lit ? 1 : 0})` }}
        />
        {TRACK_STEPS.map((step, i) => {
          const Icon = JOURNEY_ICONS[step.icon];
          return (
            <li key={step.title} className="relative flex items-center gap-4">
              <span
                className={cn(
                  s.node,
                  "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
                  lit ? cn(s.nodeLit, "border-white/40 bg-[var(--pp-blue)] text-white") : "border-white/15 bg-white/5 text-sky-200",
                )}
                style={delay(i)}
                aria-hidden="true"
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
              </span>
              <span className="min-w-0">
                <span className="block text-[0.95rem] font-semibold text-white">{step.title}</span>
                <span className="block text-xs text-blue-100/60">{step.who}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </LiquidGlassCard>
  );

  return (
    <section aria-labelledby="tracking-title" className={cn(s.night, "overflow-hidden px-5 py-20 sm:px-8 sm:py-28 lg:px-12")}>
      <div aria-hidden="true" className={cn(s.grid, "absolute inset-0 -z-10")} />
      <div className="mx-auto grid max-w-[1280px] items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <Reveal>
          <SectionHeading
            id="tracking-title"
            tone="dark"
            eyebrow="Status guidance"
            title={
              <>
                Always Know <span className={s.inkLight}>What Happens Next.</span>
              </>
            }
            lede="While we are assisting you, updates come to you on WhatsApp and in your DigiConnect Dukan dashboard. The official status of your passport file is on the Passport Seva portal, under your file number — and we help you read it."
          />
          <ul className="mt-8 grid gap-3 text-sm text-blue-50/85 sm:grid-cols-2">
            <li className="flex items-center gap-3">
              <LayoutDashboard className="h-5 w-5 shrink-0 text-sky-300" aria-hidden="true" />
              Your applications, in your dashboard
            </li>
            <li className="flex items-center gap-3">
              <MessageCircle className="h-5 w-5 shrink-0 text-sky-300" aria-hidden="true" />
              Updates from our team on WhatsApp
            </li>
          </ul>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <PassportCTA href={links.applyHref}>Start Passport Application</PassportCTA>
            <PassportCTA href={links.statusHref} variant="glass" icon={<LayoutDashboard className="h-4 w-4" aria-hidden="true" />}>
              View My Applications
            </PassportCTA>
          </div>
        </Reveal>

        <Reveal delay={0.1}>{tracker}</Reveal>
      </div>
    </section>
  );
}
