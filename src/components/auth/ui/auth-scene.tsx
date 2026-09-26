"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { BadgeIndianRupee, ShieldCheck, Zap } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

import { cardReveal, revealItem, staggerContainer, staticVariants } from "@/components/auth/ui/motion";
import { cn } from "@/lib/utils";

const TAGLINE = "Connecting People. Empowering Digital India.";
const DEFAULT_HEADLINE = "Digital Services Made Simple";

/**
 * Two picture slots on the brand panel, both optional.
 *
 * `BRAND_ARTWORK` is a full-bleed backdrop: it fills the panel edge to edge
 * and a scrim is laid over it so the text stays readable, which means it is
 * seen through roughly half a wash. That suits a scene -- a storefront, a
 * street, a texture -- and not a character, which the wash would flatten.
 *
 * `BRAND_MASCOT` is a cutout with a transparent background, drawn over the
 * scrim at full strength in the gap between the logo and the headline. That
 * is the slot for an avatar or a character, because nothing is laid over it.
 *
 * Either can be set without the other. Drop the file in
 * `public/images/auth/` -- that folder's README has the size and composition
 * each slot crops to -- and point the constant at it. A path that resolves to
 * nothing falls back to the plain gradient panel rather than leaving a hole,
 * so a typo in the filename costs a 404 and nothing else.
 *
 * `ARTWORK_IS_LIGHT` tells the panel which way to shade its text, and applies
 * to the backdrop only. A light scene like the DigiConnect storefront needs
 * dark text and a white scrim; a dark one keeps the white text the gradient
 * was built for.
 */
const BRAND_ARTWORK: string | null = null;
const ARTWORK_IS_LIGHT = true;
const BRAND_MASCOT: string | null = "/images/auth/brand-hero.webp";

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

/**
 * A panel image that takes itself off the panel if the file is not there.
 *
 * These are `fill` images, so each one needs its own positioned box: the
 * panel itself turns `sticky` at `lg`, which is positioned but is not one of
 * the values `next/image` accepts as a parent.
 */
function PanelImage({
  src,
  sizes,
  priority,
  className,
  onBroken,
}: {
  src: string;
  sizes: string;
  priority?: boolean;
  className: string;
  onBroken: () => void;
}) {
  const ref = useRef<HTMLImageElement | null>(null);

  /* A `priority` image can finish -- or fail -- before React hydrates, and
     that error event is gone by the time `onError` is attached. Ask the
     element instead: a decoded image has a natural width. `onError` still
     covers a failure that lands after hydration. */
  useEffect(() => {
    const img = ref.current;
    if (img?.complete && img.naturalWidth === 0) onBroken();
  }, [onBroken]);

  return (
    <Image
      ref={ref}
      src={src}
      alt=""
      fill
      sizes={sizes}
      priority={priority}
      onError={onBroken}
      className={className}
    />
  );
}

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
  /* A missing or broken file drops the panel back to the gradient, text and
     all -- shading for a backdrop that never arrived is how text ends up
     navy-on-navy. */
  const [artworkBroken, setArtworkBroken] = useState(false);
  const [mascotBroken, setMascotBroken] = useState(false);
  const markArtworkBroken = useCallback(() => setArtworkBroken(true), []);
  const markMascotBroken = useCallback(() => setMascotBroken(true), []);
  const artwork = artworkBroken ? null : BRAND_ARTWORK;
  const mascot = mascotBroken ? null : BRAND_MASCOT;
  /* Only a light backdrop flips the panel to dark text; the gradient is dark. */
  const onLight = artwork !== null && ARTWORK_IS_LIGHT;

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
        {artwork ? (
          <>
            <div aria-hidden className="pointer-events-none absolute inset-0">
              <PanelImage
                src={artwork}
                sizes="(max-width: 1024px) 100vw, 46vw"
                priority
                className="object-cover"
                onBroken={markArtworkBroken}
              />
            </div>
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

        {/*
          The cutout sits above the scrim and below the text, in the band the
          panel leaves empty: to the right of the compact header on a phone,
          and between the logo and the headline on a desktop. It is measured
          off the panel rather than off the text so a longer headline pushes
          nothing around.
        */}
        {mascot ? (
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute z-[5]",
              "right-3 top-2 bottom-2 w-[30%] max-w-[140px]",
              "lg:inset-auto lg:right-12 lg:top-[17%] lg:h-[32%] lg:w-[46%] lg:max-w-none",
            )}
          >
            <PanelImage
              src={mascot}
              sizes="(max-width: 1024px) 40vw, 21vw"
              priority
              className="object-contain object-right-bottom lg:object-right"
              onBroken={markMascotBroken}
            />
          </div>
        ) : null}

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
          className={cn(
            "relative z-10 mt-4 max-w-xl lg:mt-0",
            /* The desktop panel is tall enough to stack them; the phone
               header is not, so the text yields the cutout's column. */
            mascot ? "pr-[34%] lg:pr-0" : "",
          )}
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
