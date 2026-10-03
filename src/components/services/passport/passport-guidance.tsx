"use client";

import {
  Baby,
  CalendarCheck,
  Check,
  Clock,
  FileCheck2,
  Fingerprint,
  HeartHandshake,
  KeyRound,
  LayoutDashboard,
  Lock,
  MapPin,
  ShieldCheck,
  Smartphone,
  Ticket,
  Users,
  type LucideIcon,
} from "lucide-react";

import {
  APPOINTMENT_POINTS,
  FAMILY_POINTS,
  PASSPORT_JOURNEY,
  PASSPORT_VISUALS,
  SECURITY_POINTS,
} from "@/lib/passport/content";
import { Reveal, Stagger, StaggerItem } from "@/components/homepage/motion";
import { cn } from "@/lib/utils";
import { JOURNEY_ICONS } from "./passport-journey";
import { ChakraWheel, IndiaMap, LiquidGlassCard, PassportBooklet, PassportCTA, SceneImage, SectionHeading, type PassportLinks } from "./passport-ui";
import s from "./passport.module.css";

/* ─────────────────────────────────────────────────────────────────────────
   "Everything You Need. One Guided Journey."
   ───────────────────────────────────────────────────────────────────────── */

const ASSIST_STEPS = PASSPORT_JOURNEY.slice(0, 3);

export function PassportApplication({ links }: { links: PassportLinks }) {
  const visual = PASSPORT_VISUALS.application;

  return (
    <section aria-labelledby="application-title" className="bg-white px-5 py-20 sm:px-8 sm:py-28 lg:px-12">
      <div className="mx-auto max-w-[1280px]">
        <Reveal>
          <SectionHeading
            id="application-title"
            eyebrow="Application assistance"
            title={
              <>
                Everything You Need. <span className={s.inkBlue}>One Guided Journey.</span>
              </>
            }
            lede="A real person sits with your application — checking what you upload, preparing the form with you and telling you what comes next."
          />
        </Reveal>

        <div className="relative mt-12">
          <Reveal>
            <SceneImage
              visual={visual}
              sizes="(min-width: 1280px) 1280px, 100vw"
              className="aspect-[4/3] rounded-[1.75rem] shadow-[0_50px_90px_-45px_rgba(8,43,99,0.6)] sm:aspect-[16/8]"
              imageClassName="object-[62%_center]"
              fallback={null}
            />
          </Reveal>

          <Reveal delay={0.12} className="relative -mt-16 px-3 sm:px-6 lg:absolute lg:bottom-8 lg:left-8 lg:mt-0 lg:w-[27rem] lg:px-0">
            <LiquidGlassCard className="p-6 sm:p-7">
              <ol className="space-y-4">
                {ASSIST_STEPS.map((step) => {
                  const Icon = JOURNEY_ICONS[step.icon];
                  return (
                    <li key={step.title} className="flex gap-3.5">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--pp-blue)] text-white">
                        <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                      </span>
                      <span>
                        <span className="block font-semibold text-[var(--pp-ink)]">{step.title}</span>
                        <span className="mt-0.5 block text-sm leading-snug text-[var(--pp-body)]">{step.body}</span>
                      </span>
                    </li>
                  );
                })}
              </ol>
              <div className="mt-6">
                <PassportCTA href={links.applyHref} className="w-full sm:w-auto">
                  Start Passport Application
                </PassportCTA>
              </div>
            </LiquidGlassCard>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Appointment
   ───────────────────────────────────────────────────────────────────────── */

const APPOINTMENT_ICONS: LucideIcon[] = [MapPin, CalendarCheck, FileCheck2, Ticket];

/** The calendar is a picture of a calendar — no dates on it are real. */
function AppointmentScene() {
  const days = Array.from({ length: 28 }, (_, i) => i);
  return (
    <div className="relative mx-auto aspect-[5/4] w-full max-w-lg" aria-hidden="true">
      <div className="absolute inset-0 rounded-[2rem] bg-[radial-gradient(70%_60%_at_60%_40%,rgba(18,104,232,0.18),rgba(18,104,232,0)_70%)]" />

      {/* Phone. */}
      <div className={cn(s.floatSlow, "absolute left-[6%] top-[6%] w-[42%]")}>
        <div className="rounded-[1.8rem] bg-[linear-gradient(160deg,#0f2f66,#071a3d)] p-2 shadow-[0_40px_60px_-30px_rgba(4,26,63,0.9)]">
          <div className="rounded-[1.4rem] bg-[linear-gradient(170deg,#1b5fd1,#0b4fb8)] p-3">
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-white/30" />
            <div className="grid grid-cols-4 gap-1.5">
              {days.slice(0, 16).map((d) => (
                <span
                  key={d}
                  className={cn(
                    "aspect-square rounded-md",
                    d === 9 ? "bg-[var(--pp-orange)]" : d === 10 ? "bg-[var(--pp-orange)]/60" : "bg-white/20",
                  )}
                />
              ))}
            </div>
            <div className="mt-3 flex items-center justify-center rounded-xl bg-white/90 py-2 text-[var(--pp-blue)]">
              <Check className="h-4 w-4" strokeWidth={3} />
            </div>
          </div>
        </div>
      </div>

      {/* Calendar. */}
      <LiquidGlassCard className="absolute right-[4%] top-[18%] w-[52%] p-4">
        <div className="mb-3 flex gap-2">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="h-3 w-1.5 rounded-full bg-[var(--pp-blue)]/40" />
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((d) => (
            <span key={d} className={cn("aspect-square rounded-[4px]", d === 17 ? "bg-[var(--pp-orange)]" : "bg-[rgba(18,104,232,0.12)]")} />
          ))}
        </div>
      </LiquidGlassCard>

      {/* Clock, pin, confirmation. */}
      <div className={cn(s.float, "absolute right-[2%] top-0 flex h-16 w-16 items-center justify-center rounded-full border border-white bg-white/80 text-[var(--pp-blue)] shadow-[0_0_30px_-4px_rgba(18,104,232,0.6)] backdrop-blur-md")}>
        <Clock className="h-8 w-8" strokeWidth={1.6} />
      </div>
      <div className={cn(s.float, "absolute bottom-[6%] right-[16%] flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--pp-orange)] text-white shadow-[0_18px_30px_-12px_rgba(242,90,0,0.8)]")} style={{ animationDelay: "-2s" }}>
        <MapPin className="h-7 w-7" />
      </div>
      <div className="absolute bottom-[10%] left-[44%] flex h-12 w-12 items-center justify-center rounded-full border border-white bg-emerald-500 text-white shadow-[0_0_24px_-2px_rgba(16,185,129,0.7)]">
        <Check className="h-6 w-6" strokeWidth={3} />
      </div>
      <svg viewBox="0 0 100 80" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
        <path d="M30 60 C 45 75, 62 72, 74 58 S 88 30, 92 12" fill="none" stroke="#1268e8" strokeOpacity="0.45" strokeWidth="0.5" className={s.dash} />
      </svg>
    </div>
  );
}

export function PassportAppointment({ links }: { links: PassportLinks }) {
  return (
    <section aria-labelledby="appointment-title" className={cn(s.mist, "overflow-hidden px-5 py-20 sm:px-8 sm:py-28 lg:px-12")}>
      <div className="mx-auto grid max-w-[1280px] items-center gap-14 lg:grid-cols-2 lg:gap-20">
        <Reveal className="lg:order-2">
          <SceneImage
            visual={PASSPORT_VISUALS.appointment}
            sizes="(min-width: 1024px) 600px, 100vw"
            className="aspect-[16/10] rounded-[1.75rem] shadow-[0_40px_80px_-40px_rgba(8,43,99,0.55)]"
            fallback={<AppointmentScene />}
          />
        </Reveal>

        <div>
          <Reveal>
            <SectionHeading
              id="appointment-title"
              eyebrow="Appointment"
              title={
                <>
                  Appointment Guidance, <span className={s.inkBlue}>Without the Confusion.</span>
                </>
              }
              lede="Slots are allotted by Passport Seva, as available. What we take off your plate is everything around them."
            />
          </Reveal>

          <Stagger as="ul" className="mt-9 grid gap-3 sm:grid-cols-2">
            {APPOINTMENT_POINTS.map((point, i) => {
              const Icon = APPOINTMENT_ICONS[i];
              return (
                <StaggerItem as="li" key={point.title}>
                  <LiquidGlassCard className="h-full p-5">
                    <Icon className="h-5 w-5 text-[var(--pp-blue)]" aria-hidden="true" />
                    <span className="mt-3 block font-semibold text-[var(--pp-ink)]">{point.title}</span>
                    <span className="mt-1 block text-sm leading-snug text-[var(--pp-body)]">{point.body}</span>
                  </LiquidGlassCard>
                </StaggerItem>
              );
            })}
          </Stagger>

          <div className="mt-9">
            <PassportCTA href={links.applyHref} variant="blue">
              Continue Application
            </PassportCTA>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Security
   ───────────────────────────────────────────────────────────────────────── */

const SECURITY_ICONS: LucideIcon[] = [Lock, KeyRound, LayoutDashboard, FileCheck2];

function VaultScene() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-md" aria-hidden="true">
      <div className="absolute inset-[6%] text-sky-300/25">
        <ChakraWheel className="h-full w-full" />
      </div>
      <div className="absolute inset-[22%] rounded-full border border-sky-300/30 shadow-[0_0_80px_-10px_rgba(18,104,232,0.7),inset_0_0_60px_-10px_rgba(90,160,255,0.5)]" />
      <div className="absolute inset-[30%] rounded-full border border-white/20 bg-white/[0.06] backdrop-blur-md" />
      <div className={cn(s.float, "absolute left-1/2 top-1/2 w-[24%] -translate-x-1/2 -translate-y-1/2")}>
        <PassportBooklet />
      </div>
      {[
        { Icon: ShieldCheck, pos: "left-[4%] top-[30%]" },
        { Icon: Fingerprint, pos: "right-[4%] top-[22%]" },
        { Icon: FileCheck2, pos: "right-[10%] bottom-[14%]" },
        { Icon: Lock, pos: "left-[12%] bottom-[10%]" },
      ].map(({ Icon, pos }, i) => (
        <div
          key={pos}
          className={cn(s.glassDark, s.floatSlow, "absolute flex h-14 w-14 items-center justify-center !rounded-2xl text-sky-200", pos)}
          style={{ animationDelay: `${-i * 2}s` }}
        >
          <Icon className="h-6 w-6" strokeWidth={1.6} />
        </div>
      ))}
    </div>
  );
}

export function PassportSecurity() {
  return (
    <section aria-labelledby="security-title" className={cn(s.night, "overflow-hidden px-5 py-20 sm:px-8 sm:py-28 lg:px-12")}>
      <div aria-hidden="true" className={cn(s.grid, "absolute inset-0 -z-10")} />
      <div className="mx-auto grid max-w-[1280px] items-center gap-14 lg:grid-cols-2 lg:gap-20">
        <div>
          <Reveal>
            <SectionHeading
              id="security-title"
              tone="dark"
              eyebrow="Your data"
              title={
                <>
                  Your Documents Deserve <span className={s.inkLight}>Careful Handling.</span>
                </>
              }
              lede="Your information is handled through secure digital workflows and controlled access."
            />
          </Reveal>
          <Stagger as="ul" className="mt-9 grid gap-3 sm:grid-cols-2">
            {SECURITY_POINTS.map((point, i) => {
              const Icon = SECURITY_ICONS[i];
              return (
                <StaggerItem as="li" key={point.title}>
                  <LiquidGlassCard tone="dark" className="h-full p-5">
                    <Icon className="h-5 w-5 text-sky-300" aria-hidden="true" />
                    <span className="mt-3 block font-semibold text-white">{point.title}</span>
                    <span className="mt-1 block text-sm leading-snug text-blue-100/70">{point.body}</span>
                  </LiquidGlassCard>
                </StaggerItem>
              );
            })}
          </Stagger>
        </div>

        <Reveal delay={0.1}>
          <SceneImage
            visual={PASSPORT_VISUALS.security}
            sizes="(min-width: 1024px) 600px, 100vw"
            className="aspect-[16/10] rounded-[1.75rem] ring-1 ring-white/10"
            fallback={<VaultScene />}
          />
        </Reveal>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Family
   ───────────────────────────────────────────────────────────────────────── */

const FAMILY_ICONS: LucideIcon[] = [Users, Baby, HeartHandshake];

function FamilyScene() {
  return (
    <div
      className="relative mx-auto flex aspect-[16/11] w-full max-w-xl items-center justify-center overflow-hidden rounded-[1.75rem] bg-[radial-gradient(80%_70%_at_30%_20%,#fff4ea_0%,#ffe6d2_35%,#dbe9ff_100%)]"
      aria-hidden="true"
    >
      <div className="absolute -right-6 top-4 w-48 text-[var(--pp-blue)] opacity-40">
        <IndiaMap className="h-auto w-full" glow={false} />
      </div>
      <div className="relative flex items-end">
        <div className="w-24 -rotate-[12deg] sm:w-32">
          <PassportBooklet />
        </div>
        <div className={cn(s.float, "z-10 -mx-5 w-28 sm:w-36")}>
          <PassportBooklet />
        </div>
        <div className="w-20 rotate-[10deg] sm:w-24">
          <PassportBooklet />
        </div>
      </div>
    </div>
  );
}

export function PassportFamily({ links }: { links: PassportLinks }) {
  return (
    <section aria-labelledby="family-title" className="bg-[linear-gradient(180deg,#fffaf5_0%,#ffffff_100%)] px-5 py-20 sm:px-8 sm:py-28 lg:px-12">
      <div className="mx-auto grid max-w-[1280px] items-center gap-14 lg:grid-cols-[1.1fr_1fr] lg:gap-20">
        <Reveal>
          <SceneImage
            visual={PASSPORT_VISUALS.family}
            sizes="(min-width: 1024px) 640px, 100vw"
            className="aspect-[16/10] rounded-[1.75rem] shadow-[0_40px_80px_-40px_rgba(120,60,20,0.35)]"
            fallback={<FamilyScene />}
          />
        </Reveal>

        <div>
          <Reveal>
            <SectionHeading
              id="family-title"
              eyebrow="For families"
              title={
                <>
                  One Journey. <span className={s.inkBlue}>For the Whole Family.</span>
                </>
              }
              lede="A first trip together, a child's first passport, parents renewing at the same time — we help you get every application ready together."
            />
          </Reveal>
          <Stagger as="ul" className="mt-9 space-y-3">
            {FAMILY_POINTS.map((point, i) => {
              const Icon = FAMILY_ICONS[i];
              return (
                <StaggerItem as="li" key={point.who}>
                  <LiquidGlassCard className="flex items-start gap-4 p-5">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[rgba(242,90,0,0.1)] text-[var(--pp-orange)]">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span>
                      <span className="block font-semibold text-[var(--pp-ink)]">{point.who}</span>
                      <span className="mt-0.5 block text-sm leading-snug text-[var(--pp-body)]">{point.body}</span>
                    </span>
                  </LiquidGlassCard>
                </StaggerItem>
              );
            })}
          </Stagger>
          <p className="mt-6 text-xs leading-relaxed text-[var(--pp-muted)]">
            Each applicant is a separate application, with its own service charge and official fee.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <PassportCTA href={links.applyHref}>Start Passport Application</PassportCTA>
            <PassportCTA href={links.whatsappHref} external variant="ghost" icon={<Smartphone className="h-4 w-4" aria-hidden="true" />}>
              Ask About Your Family
            </PassportCTA>
          </div>
        </div>
      </div>
    </section>
  );
}
