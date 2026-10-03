"use client";

import Image from "next/image";
import Link from "next/link";
import { type ComponentPropsWithoutRef, type ReactNode } from "react";
import { ArrowRight } from "lucide-react";

import type { PassportVisual } from "@/lib/passport/content";
import { cn } from "@/lib/utils";
import s from "./passport.module.css";

/**
 * Building blocks for the passport page.
 *
 * Kept to the handful of pieces that genuinely repeat. A one-off layout stays
 * inline in its section, where it can be read in one place.
 */

/* ─────────────────────────────────────────────────────────────────────────
   What every section is handed: where the buttons go and what to call the
   price. Built once on the server.
   ───────────────────────────────────────────────────────────────────────── */

export type PassportLinks = {
  /** The existing apply flow, through login when signed out. */
  applyHref: string;
  whatsappHref: string;
  phoneHref: string;
  /** The customer's own applications list — the only real status view. */
  statusHref: string;
  /** "₹2,999", from the services row. Null when the row could not be read,
      in which case no figure is printed rather than a guessed one. */
  priceText: string | null;
};

/* ─────────────────────────────────────────────────────────────────────────
   Liquid glass
   ───────────────────────────────────────────────────────────────────────── */

type GlassProps = ComponentPropsWithoutRef<"div"> & {
  tone?: "light" | "dark";
  interactive?: boolean;
};

export function LiquidGlassCard({ tone = "light", interactive = false, className, ...rest }: GlassProps) {
  return <div className={cn("relative", tone === "dark" ? s.glassDark : s.glass, interactive && s.lift, className)} {...rest} />;
}

/* ─────────────────────────────────────────────────────────────────────────
   Buttons
   ───────────────────────────────────────────────────────────────────────── */

type CtaVariant = "primary" | "blue" | "glass" | "ghost";

const VARIANT: Record<CtaVariant, string> = {
  primary: s.btnPrimary,
  blue: s.btnBlue,
  glass: s.btnGlass,
  ghost: s.btnGhost,
};

export function PassportCTA({
  href,
  children,
  variant = "primary",
  icon,
  external = false,
  className,
  ariaLabel,
}: {
  href: string;
  children: ReactNode;
  variant?: CtaVariant;
  /** Leading icon. Primary buttons get a trailing arrow instead. */
  icon?: ReactNode;
  external?: boolean;
  className?: string;
  ariaLabel?: string;
}) {
  const body = (
    <>
      {icon}
      <span>{children}</span>
      {!icon && <ArrowRight className={cn(s.arrow, "h-4 w-4")} aria-hidden="true" />}
    </>
  );
  const classes = cn(s.btn, VARIANT[variant], className);

  if (external) {
    return (
      <a href={href} className={classes} target="_blank" rel="noopener noreferrer" aria-label={ariaLabel}>
        {body}
      </a>
    );
  }

  /* An in-page anchor is not a navigation: a plain link keeps the browser's
     own smooth scroll and focus behaviour. */
  if (href.startsWith("#") || href.startsWith("tel:")) {
    return (
      <a href={href} className={classes} aria-label={ariaLabel}>
        {body}
      </a>
    );
  }

  return (
    <Link href={href} className={classes} aria-label={ariaLabel}>
      {body}
    </Link>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Section heading
   ───────────────────────────────────────────────────────────────────────── */

export function SectionHeading({
  id,
  eyebrow,
  title,
  lede,
  tone = "light",
  align = "left",
}: {
  id: string;
  eyebrow: string;
  title: ReactNode;
  lede?: ReactNode;
  tone?: "light" | "dark";
  align?: "left" | "center";
}) {
  const dark = tone === "dark";
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center")}>
      <p className={cn(s.eyebrow, dark ? "text-sky-200" : "text-[var(--pp-blue)]")}>{eyebrow}</p>
      <h2 id={id} className={cn(s.display, "mt-3 text-[2.15rem] sm:text-5xl lg:text-[3.4rem]", dark ? "text-white" : "text-[var(--pp-ink)]")}>
        {title}
      </h2>
      {lede && (
        <p className={cn(s.lede, "mt-4 text-base leading-relaxed sm:text-lg", dark ? "text-blue-100/80" : "text-[var(--pp-body)]")}>
          {lede}
        </p>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Scene: the section's artwork, or its code-built stand-in
   ───────────────────────────────────────────────────────────────────────── */

export function SceneImage({
  visual,
  fallback,
  sizes,
  className,
  imageClassName,
}: {
  visual: PassportVisual;
  fallback: ReactNode;
  sizes: string;
  className?: string;
  imageClassName?: string;
}) {
  if (!visual.src) return <>{fallback}</>;

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <Image
        src={visual.src}
        alt={visual.alt}
        width={visual.width}
        height={visual.height}
        sizes={sizes}
        loading="lazy"
        className={cn("h-full w-full object-cover", imageClassName)}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   India, drawn
   ─────────────────────────────────────────────────────────────────────────
   A simplified outline — a silhouette for atmosphere, not a survey map. */

export const INDIA_OUTLINE =
  "M20.4 9.0 L25.5 0.4 L33.3 5.4 L37.1 15.1 L35.7 21.6 L41.5 24.5 L44.5 25.2 L51.0 29.2 L57.8 33.8 L68.0 34.6 L68.7 37.8 L74.1 37.8 L81.6 36.0 L88.4 32.4 L95.2 28.8 L99.6 31.7 L96.9 36.0 L91.8 39.6 L90.4 45.0 L86.0 50.4 L83.3 54.4 L82.3 48.2 L79.6 46.8 L78.2 50.4 L74.8 42.1 L71.4 42.5 L69.7 50.4 L71.4 54.7 L64.6 55.8 L62.9 59.4 L57.8 63.7 L49.3 72.0 L44.2 76.3 L41.5 84.6 L40.8 91.8 L40.1 96.1 L35.7 100.8 L32.3 104.0 L28.9 100.8 L26.5 91.8 L23.1 86.4 L20.4 79.2 L18.0 72.0 L16.3 64.8 L16.3 57.6 L15.3 55.4 L8.5 58.3 L3.4 52.9 L1.7 48.6 L6.8 45.0 L10.2 44.6 L7.8 40.7 L6.8 36.0 L11.9 32.4 L15.3 27.0 L20.4 23.4 L22.4 18.7 L19.7 14.4Z";

/** Delhi, Mumbai, Bengaluru, Kolkata, Lucknow — on the outline's own grid. */
const CITIES: [number, number][] = [
  [31.3, 30.2],
  [16.6, 64.5],
  [32.6, 86.5],
  [69.2, 51.9],
  [44.0, 36.5],
];

export function IndiaMap({ className, glow = true }: { className?: string; glow?: boolean }) {
  return (
    <svg viewBox="-2 -2 104 109" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="pp-india-fill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3d8bff" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#1268e8" stopOpacity="0.06" />
        </linearGradient>
      </defs>
      <path d={INDIA_OUTLINE} fill="url(#pp-india-fill)" stroke="#7fb5ff" strokeWidth="0.6" strokeLinejoin="round" />
      {glow && (
        <path d={INDIA_OUTLINE} fill="none" stroke="#9cc7ff" strokeWidth="2.4" strokeOpacity="0.18" strokeLinejoin="round" className={s.pulse} />
      )}
      {CITIES.map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <circle cx={x} cy={y} r="2.6" fill="#3d8bff" opacity="0.25" className={s.pulse} />
          <circle cx={x} cy={y} r="0.95" fill="#e8f1ff" />
        </g>
      ))}
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   A 24-spoke wheel: the Chakra's geometry, kept abstract and faint.
   ───────────────────────────────────────────────────────────────────────── */

const SPOKES = Array.from({ length: 24 }, (_, i) => {
  const a = (i * Math.PI * 2) / 24;
  return { x1: 50 + Math.cos(a) * 9, y1: 50 + Math.sin(a) * 9, x2: 50 + Math.cos(a) * 44, y2: 50 + Math.sin(a) * 44 };
});

export function ChakraWheel({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={cn(s.spin, className)} aria-hidden="true" focusable="false">
      <circle cx="50" cy="50" r="47" fill="none" stroke="currentColor" strokeWidth="0.5" />
      <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="0.35" />
      <circle cx="50" cy="50" r="7" fill="none" stroke="currentColor" strokeWidth="0.6" />
      {SPOKES.map((spoke, i) => (
        <line key={i} {...spoke} stroke="currentColor" strokeWidth="0.35" />
      ))}
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   A navy passport, drawn — used wherever artwork is not available.
   ───────────────────────────────────────────────────────────────────────── */

export function PassportBooklet({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative aspect-[5/7] rounded-[0.9rem] rounded-l-[0.45rem] bg-[linear-gradient(150deg,#163a7a_0%,#0b2556_55%,#06183b_100%)] shadow-[0_30px_50px_-24px_rgba(4,26,63,0.9),inset_0_1px_0_rgba(255,255,255,0.12),inset_6px_0_0_rgba(0,0,0,0.22)]",
        className,
      )}
      aria-hidden="true"
    >
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-[9%]">
        <div className="h-[30%] w-[38%] rounded-full border border-[#d9b25c]/70 [background:radial-gradient(circle,rgba(217,178,92,0.35)_0%,rgba(217,178,92,0)_70%)]" />
        <div className="h-[3%] w-[44%] rounded-full bg-[#d9b25c]/70" />
        <div className="h-[6%] w-[16%] rounded-[2px] border border-[#d9b25c]/70" />
      </div>
      <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[linear-gradient(120deg,rgba(255,255,255,0.16)_0%,rgba(255,255,255,0)_40%)]" />
    </div>
  );
}
