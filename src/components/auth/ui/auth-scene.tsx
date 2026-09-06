"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

import { cardReveal, revealItem, staggerContainer, staticVariants } from "@/components/auth/ui/motion";
import { cn } from "@/lib/utils";

const TAGLINE = "Connecting People. Empowering Digital India.";
const DEFAULT_HEADLINE = "Digital Services Made Simple";

/**
 * Brand gradient shared with the homepage hero, built from the logo-derived
 * palette in globals.css: DigiConnect blue → electric blue → DigiConnect orange.
 * The top stays light so the full-colour logo reads without a plate behind it.
 */
const BRAND_GRADIENT =
  "linear-gradient(165deg,#eaf4ff 0%,#a8cdff 15%,#2f80ed 40%,#0f5db8 62%,#f25a00 88%,#c9430a 100%)";

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
 * Split-screen auth layout: a brand-gradient panel beside the form column,
 * stacking to a compact hero above the form below `lg`. Decorative layers are
 * aria-hidden and motion is disabled under `prefers-reduced-motion`.
 * Children are expected to be a `GlassCard`.
 */
export function AuthScene({ children, eyebrow, headline, kicker, className }: AuthSceneProps) {
  const reduceMotion = useReducedMotion();
  const variants = reduceMotion ? staticVariants : staggerContainer;

  return (
    <div className="flex min-h-[100dvh] w-full flex-col bg-[#f6f8fc] lg:flex-row">
      {/* Brand panel */}
      <section
        className="relative flex min-h-[38vh] w-full flex-col justify-between overflow-hidden px-6 py-7 sm:px-10 lg:sticky lg:top-0 lg:h-screen lg:min-h-screen lg:w-[46%] lg:px-12 lg:py-12"
        style={{ background: BRAND_GRADIENT }}
      >
        {/* Soft brand blooms + grain, purely decorative */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 40% at 78% 18%, rgba(255,255,255,0.35), transparent 60%)," +
              "radial-gradient(50% 34% at 12% 62%, rgba(255,255,255,0.18), transparent 60%)",
          }}
        />
        {/* Warm scrim: lifts headline contrast over the orange stop without muddying it */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: "linear-gradient(to top, rgba(60,20,0,0.34), transparent 52%)" }}
        />

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10"
        >
          <Link href="/" className="group -my-2 inline-flex min-h-11 items-center py-2" aria-label="DigiConnect Dukan home">
            <Image
              src="/logo-navbar.png"
              alt=""
              width={160}
              height={48}
              priority
              className="h-8 w-auto object-contain transition-transform duration-300 group-hover:scale-[1.03] sm:h-9"
            />
          </Link>
        </motion.div>

        <motion.div
          variants={variants}
          initial="hidden"
          animate="visible"
          className="relative z-10 max-w-xl pb-2 lg:pb-6"
        >
          <motion.p
            variants={reduceMotion ? staticVariants : revealItem}
            className="text-sm font-semibold text-white/90 sm:text-base"
          >
            {kicker ?? TAGLINE}
          </motion.p>
          {/* Deliberately not a heading: each form already owns the page's h1. */}
          <motion.p
            variants={reduceMotion ? staticVariants : revealItem}
            className="mt-3 text-balance text-[1.75rem] font-bold leading-[1.1] tracking-tight text-white sm:text-4xl lg:text-[3rem]"
          >
            {headline ?? DEFAULT_HEADLINE}
          </motion.p>
        </motion.div>
      </section>

      {/* Form column */}
      <main className="flex w-full flex-1 items-center justify-center px-4 py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))] sm:px-8 lg:w-[54%] lg:py-14">
        <motion.div
          variants={variants}
          initial="hidden"
          animate="visible"
          className={cn("w-full max-w-[440px]", className)}
        >
          {eyebrow ? (
            <motion.p
              variants={reduceMotion ? staticVariants : revealItem}
              className="mb-3 text-center text-[11px] font-bold uppercase tracking-[0.22em] text-blue-600/80"
            >
              {eyebrow}
            </motion.p>
          ) : null}

          <motion.div variants={reduceMotion ? staticVariants : cardReveal}>{children}</motion.div>

          <motion.p
            variants={reduceMotion ? staticVariants : revealItem}
            className="mt-6 text-center text-[11px] font-medium text-slate-400"
          >
            Powered by <span className="font-semibold text-slate-500">RNoS India Pvt. Ltd.</span>
          </motion.p>
        </motion.div>
      </main>
    </div>
  );
}
