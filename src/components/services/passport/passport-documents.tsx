"use client";

import { useState } from "react";
import {
  Cake,
  Camera,
  Check,
  CircleCheck,
  FileStack,
  House,
  IdCard,
  ScanFace,
  Shirt,
  Smile,
  SunMedium,
  X,
  type LucideIcon,
} from "lucide-react";

import {
  PASSPORT_DOCUMENTS,
  PASSPORT_VISUALS,
  PHOTO_MISTAKES,
  PHOTO_RULES,
  type DocumentIcon,
} from "@/lib/passport/content";
import { Reveal, Stagger, StaggerItem } from "@/components/homepage/motion";
import { cn } from "@/lib/utils";
import { IndiaMap, LiquidGlassCard, PassportBooklet, PassportCTA, SceneImage, SectionHeading, type PassportLinks } from "./passport-ui";
import s from "./passport.module.css";

const DOC_ICONS: Record<DocumentIcon, LucideIcon> = {
  identity: IdCard,
  address: House,
  birth: Cake,
  photo: Camera,
  support: FileStack,
};

/** A check that draws itself in when `on` turns true. */
function DrawnCheck({ on, className }: { on: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn(s.check, on && s.checkOn, className)} aria-hidden="true" focusable="false">
      <path d="M5 12.5 L10 17.5 L19 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ProgressRing({ value, total }: { value: number; total: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-16 w-16 shrink-0">
      <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90" aria-hidden="true" focusable="false">
        <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(18,104,232,0.12)" strokeWidth="6" />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke="url(#pp-ring)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - value / total)}
          className={s.ring}
        />
        <defs>
          <linearGradient id="pp-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1268e8" />
            <stop offset="100%" stopColor="#5aa0ff" />
          </linearGradient>
        </defs>
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold tabular-nums text-[var(--pp-ink)]">
        {value}/{total}
      </span>
    </div>
  );
}

/**
 * "Get Your Documents Ready."
 *
 * A checklist the visitor can actually use: tap what you already have and the
 * clipboard ticks it off. Nothing is uploaded or stored here — the documents
 * themselves go in through the application, where our team checks them.
 */
export function PassportDocumentChecklist({ links }: { links: PassportLinks }) {
  const [have, setHave] = useState<ReadonlySet<string>>(() => new Set());
  const toggle = (id: string) =>
    setHave((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  /* Supporting documents are case-dependent, so being "ready" is the four
     every applicant needs. */
  const core = PASSPORT_DOCUMENTS.filter((doc) => doc.id !== "support");
  const ready = core.every((doc) => have.has(doc.id));
  const count = PASSPORT_DOCUMENTS.filter((doc) => have.has(doc.id)).length;

  const clipboard = (
    <div className="relative mx-auto w-full max-w-md" aria-hidden="true">
      <div className="pointer-events-none absolute -right-10 -top-10 w-44 text-sky-300 opacity-70">
        <IndiaMap className="h-auto w-full" />
      </div>
      <LiquidGlassCard className="relative p-5 pt-10 sm:p-7 sm:pt-12">
        <span className="absolute left-1/2 top-0 h-7 w-28 -translate-x-1/2 -translate-y-1/2 rounded-xl bg-[linear-gradient(180deg,#e8eef8,#c9d6ea)] shadow-[0_6px_14px_-6px_rgba(8,43,99,0.4)]" />
        <span
          className={cn(
            s.node,
            "absolute left-1/2 top-0 flex h-12 w-12 -translate-x-1/2 -translate-y-[85%] items-center justify-center rounded-full text-white",
            ready ? cn(s.nodeLit, "bg-[var(--pp-blue)]") : "bg-[rgba(18,104,232,0.35)]",
          )}
        >
          <DrawnCheck on={ready} className="h-6 w-6" />
        </span>
        <ul className="space-y-3">
          {PASSPORT_DOCUMENTS.map((doc) => {
            const Icon = DOC_ICONS[doc.icon];
            const on = have.has(doc.id);
            return (
              <li
                key={doc.id}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border px-3.5 py-3 transition-colors duration-300",
                  on ? "border-[rgba(18,104,232,0.3)] bg-white/90" : "border-white/80 bg-white/55",
                )}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[rgba(18,104,232,0.08)] text-[var(--pp-blue)]">
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <span className="h-2 flex-1 rounded-full bg-[rgba(8,43,99,0.08)]">
                  <span className="block h-full w-2/3 rounded-full bg-[rgba(8,43,99,0.08)]" />
                </span>
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full transition-colors duration-300",
                    on ? "bg-emerald-500 text-white" : "bg-[rgba(8,43,99,0.06)] text-transparent",
                  )}
                >
                  <DrawnCheck on={on} className="h-4 w-4" />
                </span>
              </li>
            );
          })}
        </ul>
      </LiquidGlassCard>
      <div className="absolute -bottom-6 -right-3 w-20 rotate-[10deg] sm:-right-8 sm:w-24">
        <div className={s.floatSlow}>
          <PassportBooklet />
        </div>
      </div>
    </div>
  );

  return (
    <section
      id="documents"
      aria-labelledby="documents-title"
      className="scroll-mt-[calc(var(--header-height)+1rem)] bg-white px-5 py-20 sm:px-8 sm:py-28 lg:px-12"
    >
      <div className="mx-auto grid max-w-[1280px] items-center gap-14 lg:grid-cols-[1.1fr_1fr] lg:gap-20">
        <div>
          <Reveal>
            <SectionHeading
              id="documents-title"
              eyebrow="Documents"
              title={
                <>
                  Get Your Documents <span className={s.inkBlue}>Ready.</span>
                </>
              }
              lede="Tap the ones you already have. Most applicants need the first four; we tell you if your case needs anything more."
            />
          </Reveal>

          <Stagger as="ul" className="mt-9 grid gap-3 sm:grid-cols-2">
            {PASSPORT_DOCUMENTS.map((doc) => {
              const Icon = DOC_ICONS[doc.icon];
              const on = have.has(doc.id);
              return (
                <StaggerItem as="li" key={doc.id} className={cn(doc.id === "support" && "sm:col-span-2")}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(doc.id)}
                    className={cn(
                      "relative",
                      s.glass,
                      s.lift,
                      "flex h-full w-full items-start gap-3.5 p-4 text-left focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#93c5fd]",
                      on && "!border-[rgba(18,104,232,0.4)]",
                    )}
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[rgba(18,104,232,0.08)] text-[var(--pp-blue)]">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-[var(--pp-ink)]">{doc.title}</span>
                      <span className="mt-0.5 block text-sm leading-snug text-[var(--pp-body)]">{doc.body}</span>
                      <span className="mt-1.5 block text-xs text-[var(--pp-muted)]">{doc.examples}</span>
                    </span>
                    <span
                      className={cn(
                        "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors duration-300",
                        on ? "border-emerald-500 bg-emerald-500 text-white" : "border-[rgba(8,43,99,0.18)] text-transparent",
                      )}
                      aria-hidden="true"
                    >
                      <DrawnCheck on={on} className="h-3.5 w-3.5" />
                    </span>
                  </button>
                </StaggerItem>
              );
            })}
          </Stagger>

          <div className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4" role="status" aria-live="polite">
              <ProgressRing value={count} total={PASSPORT_DOCUMENTS.length} />
              <p className="max-w-[16rem] text-sm leading-snug text-[var(--pp-body)]">
                {ready ? (
                  <>
                    <span className="font-semibold text-[var(--pp-ink)]">You have the essentials.</span> Upload them in your application and we check each one.
                  </>
                ) : (
                  <>Upload what you have in the application — our team checks every document before anything is filed.</>
                )}
              </p>
            </div>
            <PassportCTA href={links.applyHref} variant={ready ? "primary" : "blue"} className="sm:ml-auto">
              Check My Documents
            </PassportCTA>
          </div>
        </div>

        <Reveal delay={0.1}>
          <SceneImage
            visual={PASSPORT_VISUALS.documents}
            sizes="(min-width: 1024px) 560px, 100vw"
            className="aspect-[4/3] rounded-[1.75rem] shadow-[0_40px_80px_-40px_rgba(8,43,99,0.55)]"
            fallback={clipboard}
          />
        </Reveal>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Photograph
   ───────────────────────────────────────────────────────────────────────── */

const RULE_ICONS: LucideIcon[] = [ScanFace, Smile, SunMedium, Shirt];

/** A head-and-shoulders silhouette, posed for each example. */
function Portrait({ kind }: { kind: "good" | (typeof PHOTO_MISTAKES)[number]["kind"] }) {
  const tilt = kind === "tilt";
  return (
    <svg viewBox="0 0 60 75" className="h-full w-full" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`pp-bg-${kind}`} x1="0" y1="0" x2="1" y2="1">
          {kind === "shadow" ? (
            <>
              <stop offset="0%" stopColor="#eef2f8" />
              <stop offset="100%" stopColor="#8a96a8" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#eef3fb" />
            </>
          )}
        </linearGradient>
      </defs>
      <rect width="60" height="75" fill={`url(#pp-bg-${kind})`} />
      <g transform={tilt ? "rotate(-14 30 50)" : undefined}>
        <path d="M5 75 C 7 57, 18 51, 30 51 C 42 51, 53 57, 55 75Z" fill="#1d4f9a" />
        <path d="M24 49 L30 58 L36 49Z" fill="#f2c9a8" />
        <ellipse cx="30" cy="31" rx="11" ry="13.5" fill="#f2c9a8" />
        <path d="M19 28 C 19 17, 41 15, 41 28 C 38 21, 23 21, 19 28Z" fill="#2b2522" />
        <circle cx="25.6" cy="31" r="1.1" fill="#2b2522" />
        <circle cx="34.4" cy="31" r="1.1" fill="#2b2522" />
        <path d="M27 38.5 Q30 40 33 38.5" stroke="#b07a5a" strokeWidth="0.9" fill="none" strokeLinecap="round" />
        {kind === "glasses" && (
          <g>
            <rect x="21" y="27.6" width="8" height="6.4" rx="2" fill="#dff1ff" fillOpacity="0.85" stroke="#2b2522" strokeWidth="0.8" />
            <rect x="31" y="27.6" width="8" height="6.4" rx="2" fill="#dff1ff" fillOpacity="0.85" stroke="#2b2522" strokeWidth="0.8" />
            <path d="M22.5 29 L26 32.5 M32.5 29 L36 32.5" stroke="#fff" strokeWidth="0.9" />
          </g>
        )}
      </g>
      {kind === "good" && (
        <g stroke="#1268e8" strokeWidth="0.6" fill="none" strokeDasharray="1.6 1.4">
          <ellipse cx="30" cy="31" rx="15" ry="18" />
          <line x1="30" y1="6" x2="30" y2="70" strokeOpacity="0.5" />
        </g>
      )}
    </svg>
  );
}

export function PassportPhotoGuide() {
  const visual = PASSPORT_VISUALS.photo;

  return (
    <section aria-labelledby="photo-title" className={cn(s.mist, "px-5 py-20 sm:px-8 sm:py-28 lg:px-12")}>
      <div className="mx-auto max-w-[1280px]">
        <Reveal>
          <SectionHeading
            id="photo-title"
            eyebrow="Photograph"
            title={
              <>
                Get Your Passport Photo <span className={s.inkBlue}>Right.</span>
              </>
            }
            lede="Your passport photo is captured at the Passport Seva Kendra on your appointment day, and your application needs a recent photograph too. The same few rules apply to both."
          />
        </Reveal>

        <SceneImage
          visual={visual}
          sizes="(min-width: 1280px) 1280px, 100vw"
          className="mt-12 aspect-[16/8] rounded-[1.75rem] shadow-[0_40px_80px_-40px_rgba(8,43,99,0.55)]"
          fallback={null}
        />

        <div className="mt-12 grid gap-6 lg:grid-cols-[1fr_1.15fr] lg:gap-10">
          <Stagger as="ul" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {PHOTO_RULES.map((rule, i) => {
              const Icon = RULE_ICONS[i];
              return (
                <StaggerItem as="li" key={rule.title}>
                  <LiquidGlassCard className="flex h-full items-start gap-4 p-5">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--pp-blue)] text-white shadow-[0_10px_20px_-10px_rgba(18,104,232,0.9)]">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span>
                      <span className="block font-semibold text-[var(--pp-ink)]">{rule.title}</span>
                      <span className="mt-0.5 block text-sm text-[var(--pp-body)]">{rule.body}</span>
                    </span>
                  </LiquidGlassCard>
                </StaggerItem>
              );
            })}
          </Stagger>

          <Reveal delay={0.1}>
            <LiquidGlassCard className="p-5 sm:p-8">
              <div className="grid grid-cols-[1.25fr_1fr] gap-4 sm:gap-6">
                <figure>
                  <div className="relative aspect-[4/5] overflow-hidden rounded-2xl ring-2 ring-emerald-500/70">
                    <Portrait kind="good" />
                    <span className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg">
                      <Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
                    </span>
                  </div>
                  <figcaption className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-[var(--pp-ink)]">
                    <CircleCheck className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                    Looks right
                  </figcaption>
                </figure>

                <div>
                  <p className={cn(s.eyebrow, "text-[var(--pp-muted)]")}>Common mistakes</p>
                  <ul className="mt-3 grid gap-3">
                    {PHOTO_MISTAKES.map((mistake) => (
                      <li key={mistake.kind} className="flex items-center gap-3">
                        <span className="relative aspect-[4/5] w-14 shrink-0 overflow-hidden rounded-xl ring-1 ring-red-300 sm:w-16">
                          <Portrait kind={mistake.kind} />
                          <span className="absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white">
                            <X className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
                          </span>
                        </span>
                        <span className="text-sm font-medium text-[var(--pp-body)]">{mistake.label}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </LiquidGlassCard>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
