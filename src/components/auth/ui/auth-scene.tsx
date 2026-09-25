"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { BadgeIndianRupee, ShieldCheck, Zap } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

import { cardReveal, revealItem, staggerContainer, staticVariants } from "@/components/auth/ui/motion";
import { cn } from "@/lib/utils";

const TAGLINE = "Connecting People. Empowering Digital India.";
const DEFAULT_HEADLINE = "Digital Services Made Simple";

/**
 * Brand artwork behind the panel, when there is one.
 *
 * Drop a file at `public/images/auth/brand-hero.webp` and set this to
 * "/images/auth/brand-hero.webp". Until then the panel stands on its own --
 * pointing this at a file that is not there would 404 on every auth page,
 * which is worse than no artwork.
 *
 * It fills the panel (object-cover), so the composition matters more than its
 * exact size: the panel is roughly 3:4 on a desktop and much wider on a
 * phone, which means the middle of the image is the only part guaranteed to
 * survive both. A subject placed low and centre reads at every width.
 *
 * `ARTWORK_IS_LIGHT` tells the panel which way to shade its text. A light
 * scene like the DigiConnect storefront needs dark text and a white scrim; a
 * dark one keeps the white text the gradient was built for.
 */
const BRAND_ARTWORK: string | null = null;
const ARTWORK_IS_LIGHT = true;

/**
 * The brand side reads as DigiConnect rather than as a gradient.
 *
 * Navy through the brand blue, with the orange kept to a bloom rather than a
 * stop: the previous ramp ended in solid orange, which forced a dark scrim
 * over the whole panel to keep white text legible and muddied both colours.
 */
const BRAND_BASE = "linear-gradient(160deg,#0a1f4d 0%,#0b3fb8 45%,#1268e8 100%)";

/** What the partner or customer is actually signing in to. */
const PROMISES = [
  { Icon: ShieldCheck, title: "Government & digital services", note: "PAN, Aadhaar, MSME, insurance and more" },
  { Icon: Zap, title: "Applied in minutes", note: "One form, tracked end to end" },
  { Icon: BadgeIndianRupee, title: "Paid the way you like", note: "UPI, cards, netbanking — or a payment link" },
];

type AuthSceneProps = {
  children: ReactNode;
  /** Small uppercase label shown above the card, e.g. "Control Room". */
  eyebrow?: string;
  /** Large statement on the brand panel. */
  headline?: ReactNode;
  /** Small line above the headline. */
  kicker?: string;
  /** Max width of the form column. */
  className?: string;
};

/**
 * Split-screen auth layout: a brand panel beside the form column.
 *
 * The panel used to be a gradient with one line on it, and on a phone it took
 * 38vh to say that -- most of the first screen spent before the form began.
 * It now carries what someone is signing in to, and on a phone it is a
 * compact header instead of a hero.
 *
 * Decorative layers are aria-hidden, motion is disabled under
 * `prefers-reduced-motion`, and children are expected to be a `GlassCard`.
 */
export function AuthScene({ children, eyebrow, headline, kicker, className }: AuthSceneProps) {
  const reduceMotion = useReducedMotion();
  const variants = reduceMotion ? staticVariants : staggerContainer;
  /* Only a light artwork flips the panel to dark text; the gradient is dark. */
  const onLight = BRAND_ARTWORK !== null && ARTWORK_IS_LIGHT;

  return (
    <div data-dcp className="flex min-h-[100dvh] w-full flex-col bg-[var(--dcp-canvas)] lg:flex-row">
      {/* ── Brand panel ─────────────────────────────────────────────────── */}
      <section
        className={cn(
          "relative flex w-full flex-col overflow-hidden px-6 py-6 sm:px-10",
          "lg:sticky lg:top-0 lg:h-screen lg:w-[46%] lg:justify-between lg:px-12 lg:py-12",
        )}
        style={{ background: BRAND_BASE }}
      >
        {BRAND_ARTWORK ? (
          <>
            <Image
              src={BRAND_ARTWORK}
              alt=""
              fill
              sizes="(max-width: 1024px) 100vw, 46vw"
              priority
              className="pointer-events-none object-cover"
            />
            {/*
              A scrim, not a tint: the artwork keeps its colour, and the text
              gets a band it can be read against at the end it sits on.
            */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background: ARTWORK_IS_LIGHT
                  ? "linear-gradient(to bottom, rgba(255,255,255,0.72) 0%, rgba(255,255,255,0.35) 34%, rgba(255,255,255,0.86) 100%)"
                  : "linear-gradient(to bottom, rgba(10,31,77,0.55) 0%, rgba(10,31,77,0.2) 38%, rgba(10,31,77,0.8) 100%)",
              }}
            />
          </>
        ) : (
          /* Brand blooms: orange kept as light, not as a gradient stop. */
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(52% 40% at 88% 12%, rgba(242,90,0,0.55), transparent 62%)," +
                "radial-gradient(46% 34% at 8% 84%, rgba(18,104,232,0.65), transparent 64%)," +
                "radial-gradient(40% 30% at 70% 72%, rgba(255,255,255,0.14), transparent 60%)",
            }}
          />
        )}

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10"
        >
          <Link
            href="/"
            className="group -my-2 inline-flex min-h-11 items-center py-2"
            aria-label="DigiConnect Dukan home"
          >
            <Image
              src="/logo-navbar.png"
              alt=""
              width={160}
              height={48}
              priority
              className={cn(
                "h-8 w-auto object-contain transition-transform duration-300 group-hover:scale-[1.03] sm:h-9",
                // The logo is full colour; only a dark panel needs it knocked out.
                onLight ? "" : "brightness-0 invert",
              )}
            />
          </Link>
        </motion.div>

        <motion.div
          variants={variants}
          initial="hidden"
          animate="visible"
          className="relative z-10 mt-4 max-w-xl lg:mt-0"
        >
          <motion.p
            variants={reduceMotion ? staticVariants : revealItem}
            className={cn(
              "text-xs font-bold uppercase tracking-[0.18em] sm:text-[13px]",
              onLight ? "text-[#c2410c]" : "text-[#ffc9a3]",
            )}
          >
            {kicker ?? TAGLINE}
          </motion.p>

          {/* Deliberately not a heading: each form already owns the page's h1. */}
          <motion.p
            variants={reduceMotion ? staticVariants : revealItem}
            className={cn(
              "mt-2.5 text-balance text-[1.6rem] font-bold leading-[1.12] tracking-tight sm:text-4xl lg:mt-4 lg:text-[3rem]",
              onLight ? "text-[#0a1f4d]" : "text-white",
            )}
          >
            {headline ?? DEFAULT_HEADLINE}
          </motion.p>

          {/* The promises are the panel's substance, and the reason a phone no
              longer needs to scroll past a screen of gradient to reach them. */}
          <motion.ul
            variants={variants}
            className="mt-5 hidden gap-3 lg:mt-9 lg:grid"
          >
            {PROMISES.map(({ Icon, title, note }) => (
              <motion.li
                key={title}
                variants={reduceMotion ? staticVariants : revealItem}
                className={cn(
                  "flex items-start gap-3 rounded-2xl border p-3 backdrop-blur-sm",
                  onLight ? "border-[#0a1f4d]/10 bg-white/70" : "border-white/15 bg-white/10",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                    onLight ? "bg-[#1268e8] text-white" : "bg-white/15 text-white",
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span
                    className={cn(
                      "block text-[13.5px] font-bold leading-tight",
                      onLight ? "text-[#0a1f4d]" : "text-white",
                    )}
                  >
                    {title}
                  </span>
                  <span
                    className={cn(
                      "mt-0.5 block text-[12px] font-medium leading-snug",
                      onLight ? "text-[#0a1f4d]/70" : "text-white/70",
                    )}
                  >
                    {note}
                  </span>
                </span>
              </motion.li>
            ))}
          </motion.ul>
        </motion.div>

      </section>

      {/* ── Form column ─────────────────────────────────────────────────── */}
      <main className="relative flex w-full flex-1 items-center justify-center px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-8 lg:w-[54%] lg:py-14">
        {/* A breath of brand on the canvas, so the form side is not bare white. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(44% 34% at 84% 6%, rgba(18,104,232,0.10), transparent 64%)," +
              "radial-gradient(40% 30% at 6% 92%, rgba(242,90,0,0.08), transparent 62%)",
          }}
        />

        <motion.div
          variants={variants}
          initial="hidden"
          animate="visible"
          className={cn("relative w-full max-w-[440px]", className)}
        >
          {eyebrow ? (
            <motion.p
              variants={reduceMotion ? staticVariants : revealItem}
              className="mb-3 flex justify-center"
            >
              <span className="rounded-full border border-[var(--dcp-line)] bg-white/70 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--dcp-brand-deep)] backdrop-blur">
                {eyebrow}
              </span>
            </motion.p>
          ) : null}

          <motion.div variants={reduceMotion ? staticVariants : cardReveal}>{children}</motion.div>

          <motion.p
            variants={reduceMotion ? staticVariants : revealItem}
            className="mt-6 text-center text-[11px] font-medium text-[var(--dcp-ink-4)]"
          >
            Powered by <span className="font-semibold text-[var(--dcp-ink-3)]">RNoS India Pvt. Ltd.</span>
          </motion.p>
        </motion.div>
      </main>
    </div>
  );
}
