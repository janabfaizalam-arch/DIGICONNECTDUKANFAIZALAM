"use client";

import Image from "@/components/ui/safe-image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  BadgeCheck,
  BadgeIndianRupee,
  Building2,
  FileText,
  Headset,
  IdCard,
  Lock,
  Receipt,
  ShieldCheck,
  Zap,
  type LucideIcon,
} from "lucide-react";
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
 * scrim at full strength on the stage: a spotlight, an orbit ring and the
 * service chips are all positioned around it.
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
 * stop: a ramp that ends in solid orange forces a dark scrim over the whole
 * panel to keep white text legible, and muddies both colours.
 */
const BRAND_BASE = "linear-gradient(155deg,#04122f 0%,#072a63 34%,#0b4fb8 72%,#1268e8 100%)";

/** What the partner or customer is actually signing in to. */
const PROMISES: { Icon: LucideIcon; title: string; note: string }[] = [
  { Icon: ShieldCheck, title: "Government & digital services", note: "PAN, Aadhaar, MSME, insurance and more" },
  { Icon: Zap, title: "Applied in minutes", note: "One form, tracked end to end" },
  { Icon: BadgeIndianRupee, title: "Paid the way you like", note: "UPI, cards, netbanking — or a payment link" },
];

/**
 * The services that ring the mascot on the stage.
 *
 * Positions are percentages of the stage box so they track the cutout at any
 * panel height, and each one is pushed outside the middle column the mascot
 * occupies. `float` picks the bob phase, so no two move together.
 */
const SERVICE_CHIPS: {
  Icon: LucideIcon;
  label: string;
  className: string;
  float: string;
}[] = [
  { Icon: IdCard, label: "PAN Card", className: "left-[1%] top-[16%]", float: "dcp-auth-float-1" },
  { Icon: FileText, label: "Aadhaar", className: "left-[-1%] top-[54%]", float: "dcp-auth-float-3" },
  { Icon: Receipt, label: "GST & ITR", className: "right-[0%] top-[9%]", float: "dcp-auth-float-2" },
  { Icon: Building2, label: "MSME Udyam", className: "right-[-2%] top-[48%]", float: "dcp-auth-float-4" },
];

/** The reasons to trust the portal, shown under the headline. */
const TRUST_MARKS: { Icon: LucideIcon; label: string }[] = [
  { Icon: Lock, label: "Razorpay secured" },
  { Icon: BadgeCheck, label: "Verified partners" },
  { Icon: Headset, label: "Support in Hindi" },
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
 * The panel is built in layers rather than as one gradient -- two drifting
 * colour blooms, a masked grid, a spotlight, an orbit ring, the mascot, and
 * the services chipped around it -- because a flat field behind a cutout is
 * what makes the cutout look stuck on. On a phone there is no room for a
 * stage, so it collapses to a compact header with the mascot beside the text.
 *
 * Decorative layers are aria-hidden, every animation stops under
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
          "lg:sticky lg:top-0 lg:h-screen lg:w-[46%] lg:px-12 lg:py-10",
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
          /* Depth in layers: two blooms that drift past each other, then a
             grid that fades out before it reaches the headline. */
          <>
            <div
              aria-hidden
              className="dcp-auth-bloom-a pointer-events-none absolute -right-[18%] -top-[14%] h-[62%] w-[78%] rounded-full opacity-90"
              style={{
                background: "radial-gradient(circle, rgba(242,90,0,0.58) 0%, rgba(242,90,0,0.16) 45%, transparent 70%)",
                filter: "blur(18px)",
              }}
            />
            <div
              aria-hidden
              className="dcp-auth-bloom-b pointer-events-none absolute -bottom-[16%] -left-[22%] h-[64%] w-[82%] rounded-full"
              style={{
                background: "radial-gradient(circle, rgba(56,152,255,0.62) 0%, rgba(18,104,232,0.18) 46%, transparent 72%)",
                filter: "blur(20px)",
              }}
            />
            <div aria-hidden className="dcp-auth-grid pointer-events-none absolute inset-0" />
            {/* The copy sits over the brightest end of the gradient, where
                white at 12px measured under 4.5:1. This puts a darker floor
                under it without touching the colour of the rest. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2"
              style={{
                background:
                  "linear-gradient(to top, rgba(3,14,38,0.62) 0%, rgba(3,14,38,0.3) 46%, transparent 100%)",
              }}
            />
          </>
        )}

        {/* ── Logo ──────────────────────────────────────────────────────── */}
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

        {/* ── The stage ────────────────────────────────────────────────────
            The mascot with a spotlight under it, an orbit ring behind it and
            the services chipped around it. On a desktop it takes whatever
            height is left between the logo and the copy, so a short laptop
            screen shrinks the stage instead of pushing the copy off; on a
            phone there is no room for any of that, so it narrows to a strip
            at the edge of the header and only the cutout survives. */}
        {mascot ? (
          <div
            className={cn(
              /* One element, two jobs: a strip at the edge of the phone
                 header, and the stage in the desktop panel. Rendering it
                 twice and hiding one would still download the picture twice,
                 because a display:none image is fetched all the same. */
              "absolute inset-y-2 right-3 z-[5] w-[30%] max-w-[140px]",
              "lg:static lg:z-10 lg:flex lg:min-h-0 lg:w-auto lg:max-w-none lg:flex-1 lg:items-center lg:justify-center",
            )}
          >
            <div className="relative h-full w-full lg:max-w-[460px] xl:lg:max-w-[540px]">
              {/* Spotlight: a wide, soft pool the cutout stands in. */}
              <div
                aria-hidden
                className="pointer-events-none absolute left-1/2 top-1/2 hidden h-[92%] w-[92%] -translate-x-1/2 -translate-y-1/2 rounded-full lg:block"
                style={{
                  background:
                    "radial-gradient(circle, rgba(255,255,255,0.22) 0%, rgba(120,190,255,0.12) 38%, transparent 68%)",
                }}
              />
              {/* Orbit ring, turning slowly enough to read as depth rather
                  than as movement. The dash makes the rotation legible. */}
              <div
                aria-hidden
                className="dcp-auth-orbit pointer-events-none absolute left-1/2 top-1/2 hidden h-[78%] w-[78%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-white/20 lg:block"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute left-1/2 top-1/2 hidden h-[58%] w-[58%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10 lg:block"
              />

              {/* The cutout itself, resting on the floor of the stage. */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 lg:inset-x-[16%] lg:inset-y-[7%]"
              >
                <PanelImage
                  src={mascot}
                  sizes="(max-width: 1024px) 40vw, 22vw"
                  priority
                  className={cn(
                    "object-contain object-right-bottom drop-shadow-[0_10px_18px_rgba(3,14,38,0.4)]",
                    "lg:object-bottom lg:drop-shadow-[0_26px_38px_rgba(3,14,38,0.5)]",
                  )}
                  onBroken={markMascotBroken}
                />
              </div>

              {/* A contact shadow, so he is standing on something. */}
              <div
                aria-hidden
                className="pointer-events-none absolute bottom-[4%] left-1/2 hidden h-[7%] w-[54%] -translate-x-1/2 rounded-[50%] lg:block"
                style={{ background: "radial-gradient(circle, rgba(2,10,30,0.46) 0%, transparent 70%)" }}
              />

              {/* What he is actually holding up: the services. */}
              <motion.ul
                variants={variants}
                initial="hidden"
                animate="visible"
                className="absolute inset-0 hidden list-none lg:block"
              >
                {SERVICE_CHIPS.map(({ Icon, label, className: pos, float }) => (
                  <motion.li
                    key={label}
                    variants={reduceMotion ? staticVariants : revealItem}
                    className={cn("absolute", pos)}
                  >
                    <span
                      className={cn(
                        "dcp-auth-chip dcp-auth-float flex items-center gap-2 rounded-2xl px-3 py-2 text-[12.5px] font-bold text-white",
                        float,
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0 text-[#ffc9a3]" aria-hidden />
                      {label}
                    </span>
                  </motion.li>
                ))}
              </motion.ul>
            </div>
          </div>
        ) : null}

        {/* ── Copy ─────────────────────────────────────────────────────── */}
        <motion.div
          variants={variants}
          initial="hidden"
          animate="visible"
          className={cn(
            "relative z-10 mt-4 max-w-xl lg:mt-0",
            /* On a phone the header is too short for a stage, so the cutout
               sits beside the text and the text yields it a column. */
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
              "mt-2.5 text-balance text-[1.6rem] font-bold leading-[1.12] tracking-tight sm:text-4xl lg:mt-3 lg:text-[2.9rem]",
              onLight ? "text-[#0a1f4d]" : "text-white",
            )}
          >
            {headline ?? DEFAULT_HEADLINE}
          </motion.p>

          {/* The promises stay on the desktop panel when there is no stage to
              carry them; with a stage, the chips already say this. */}
          {mascot ? null : (
            <motion.ul variants={variants} className="mt-5 hidden gap-3 lg:mt-8 lg:grid">
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
          )}
        </motion.div>

        {/* ── Trust row ────────────────────────────────────────────────────
            Last thing on the panel, because it answers the question someone
            asks with their password already typed. */}
        <motion.ul
          variants={variants}
          initial="hidden"
          animate="visible"
          className="relative z-10 mt-5 hidden flex-wrap items-center gap-x-5 gap-y-2 lg:mt-7 lg:flex"
        >
          {TRUST_MARKS.map(({ Icon, label }) => (
            <motion.li
              key={label}
              variants={reduceMotion ? staticVariants : revealItem}
              className={cn(
                "flex items-center gap-2 text-[12.5px] font-semibold",
                onLight ? "text-[#0a1f4d]/70" : "text-white/75",
              )}
            >
              <Icon className={cn("h-4 w-4", onLight ? "text-[#1268e8]" : "text-[#8fc4ff]")} aria-hidden />
              {label}
            </motion.li>
          ))}
        </motion.ul>
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
        <div aria-hidden className="dcp-auth-grid-light pointer-events-none absolute inset-0" />

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

          {/* A halo behind the card, so it sits above the canvas rather than
              on it -- the flat-card look the style notes warn about. */}
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-x-6 -inset-y-4 -z-10 rounded-[40px] opacity-70"
            style={{
              background:
                "radial-gradient(60% 50% at 50% 0%, rgba(18,104,232,0.16), transparent 70%)," +
                "radial-gradient(50% 40% at 50% 100%, rgba(242,90,0,0.12), transparent 70%)",
            }}
          />

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
