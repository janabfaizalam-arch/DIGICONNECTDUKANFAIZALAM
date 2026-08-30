"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useInView } from "framer-motion";

import { HomepageSection, HomepageSectionHeader, type HomepageSurface } from "@/components/homepage/ui";
import { cn } from "@/lib/utils";

/**
 * Shared chrome for the site's dedicated service pages.
 *
 * The DPR page and the CM YUVA page are the same shape: a dark brand hero,
 * then a run of bands explaining a scheme, then pricing, FAQ and a closing
 * call to action. They used to each invent their own section wrapper, card and
 * button, which is how they ended up looking like two different websites.
 *
 * Everything here defers to the shared liquid glass system — the homepage's
 * section rhythm, `lg-card` surfaces, the two logo ramps — so a new service
 * page is written by supplying content, not styling.
 */

/* ─────────────────────────────────────────────────────────────────────────
   Icons
   ───────────────────────────────────────────────────────────────────────── */

export function WhatsAppIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.705 1.458h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

/** Icon disc in one of the two logo ramps — blue by default, flame for accents. */
export function ServiceIcon({
  children,
  tone = "blue",
  className,
}: {
  children: React.ReactNode;
  tone?: "blue" | "flame";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.85rem] text-white shadow-[0_8px_18px_-8px_rgba(0,29,95,0.7)] sm:h-11 sm:w-11",
        className,
      )}
      style={{ background: tone === "flame" ? "var(--dc-grad-flame)" : "var(--dc-grad-blue)" }}
    >
      {children}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Bands
   ───────────────────────────────────────────────────────────────────────── */

/**
 * One band of a service page.
 *
 * A thin wrapper over the homepage's `HomepageSection`, so a service page
 * picks up the shared gutters, vertical rhythm, ambient wash and the
 * `content-visibility` deferral that keeps a page with this many blurred
 * surfaces scrolling smoothly.
 */
export function ServiceSection({
  id,
  title,
  description,
  eyebrow,
  className,
  children,
  surface = "white",
  eager,
  center = true,
  wash = "blue",
}: {
  id?: string;
  title?: string | null;
  description?: string | null;
  eyebrow?: string;
  className?: string;
  children: React.ReactNode;
  surface?: HomepageSurface;
  eager?: boolean;
  center?: boolean;
  wash?: "blue" | "flame" | "dual" | "none";
}) {
  const dark = surface === "navy" || surface === "blue";
  const headingId = id ? `${id}-heading` : undefined;

  return (
    <HomepageSection
      id={id}
      surface={surface}
      eager={eager}
      wash={wash}
      className={className}
      aria-labelledby={title ? headingId : undefined}
    >
      {title || description ? (
        <HomepageSectionHeader
          eyebrow={eyebrow}
          title={title ?? ""}
          description={description ?? undefined}
          light={dark}
          center={center}
        />
      ) : null}
      {children}
    </HomepageSection>
  );
}

/** The one card surface, shared with the homepage. */
export function ServiceCard({
  className,
  children,
  dark,
  interactive = true,
}: {
  className?: string;
  children: React.ReactNode;
  dark?: boolean;
  interactive?: boolean;
}) {
  return (
    <div
      className={cn(
        dark ? "lg-card-dark" : "lg-card",
        interactive && (dark ? "lg-raise-dark" : "lg-raise lg-sheen"),
        "overflow-hidden",
        className,
      )}
    >
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Actions
   ───────────────────────────────────────────────────────────────────────── */

/**
 * A service page's action button.
 *
 * `primary` is the white-on-dark pill the homepage hero uses for its main
 * action, with the flame arrow chip; `solid` is its inverse for light bands;
 * `ghost` and `ghostDark` are the glass pills beside them.
 */
export function ServiceCta({
  href,
  label,
  variant = "solid",
  className,
  external,
  icon = true,
}: {
  href: string;
  label: string;
  variant?: "primary" | "solid" | "ghost" | "ghostDark";
  className?: string;
  external?: boolean;
  icon?: boolean;
}) {
  const base =
    "group inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-[13.5px] font-bold transition duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.98] sm:h-12 sm:px-6 sm:text-[15px]";

  const styles: Record<string, string> = {
    primary:
      "bg-white pl-5 pr-1.5 text-[var(--dc-blue-deep)] shadow-[0_18px_40px_-14px_rgba(0,10,40,0.85)] hover:-translate-y-0.5 focus-visible:outline-white sm:pl-7 sm:pr-2",
    solid:
      "text-white shadow-[0_16px_34px_-16px_rgba(0,29,95,0.9)] hover:-translate-y-0.5 focus-visible:outline-[var(--dc-blue-bright)]",
    ghost: "lg-pill lg-raise text-[var(--dc-blue-mid)] focus-visible:outline-[var(--dc-blue-bright)]",
    ghostDark: "lg-pill-dark lg-raise-dark text-white focus-visible:outline-white",
  };

  const body = (
    <>
      {label}
      {variant === "primary" && icon ? (
        <span
          className="flex h-8 w-8 items-center justify-center rounded-full text-white transition-transform duration-300 group-hover:translate-x-0.5 sm:h-9 sm:w-9"
          style={{ background: "var(--dc-grad-flame)" }}
        >
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </span>
      ) : null}
    </>
  );

  const style = variant === "solid" ? { background: "var(--dc-grad-blue)" } : undefined;

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(base, styles[variant], className)}
        style={style}
      >
        {body}
      </a>
    );
  }

  return (
    <Link href={href} className={cn(base, styles[variant], className)} style={style}>
      {body}
    </Link>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Breadcrumb
   ───────────────────────────────────────────────────────────────────────── */

/** The trail back out, on the dark hero. */
export function ServiceBreadcrumb({ current }: { current: string }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold text-white/55">
        <li>
          <Link href="/" className="transition hover:text-white">
            Home
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li>
          <Link href="/services" className="transition hover:text-white">
            Services
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li className="text-white/80">{current}</li>
      </ol>
    </nav>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Counter
   ───────────────────────────────────────────────────────────────────────── */

/**
 * A number that counts up once, when it first comes into view.
 *
 * Only ever fed values the business can stand behind — a price, a loan
 * ceiling, a turnaround window. No customer counts, no star ratings: this
 * component has been used to animate invented figures before, and a number
 * nobody can verify on a page about a government loan costs more trust than
 * it buys.
 */
export function ServiceCounter({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  useEffect(() => {
    if (!isInView) return;
    const steps = 50;
    let step = 0;
    const timer = setInterval(() => {
      step += 1;
      const progress = step / steps;
      const eased = progress * (2 - progress);
      const next = value * eased;
      setCount(decimals > 0 ? Number(next.toFixed(decimals)) : Math.floor(next));
      if (step >= steps) {
        clearInterval(timer);
        setCount(value);
      }
    }, 30);
    return () => clearInterval(timer);
  }, [isInView, value, decimals]);

  return (
    <span ref={ref} className="font-extrabold tabular-nums">
      {prefix}
      {decimals > 0 ? count.toFixed(decimals) : count}
      {suffix}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Artwork
   ───────────────────────────────────────────────────────────────────────── */

/**
 * A framed image inside a band.
 *
 * `next/image` with an explicit aspect so the band reserves its space before
 * the file arrives — a service page full of posters that each shove the page
 * down on load is the worst kind of slow.
 */
export function ServiceFigure({
  src,
  alt,
  caption,
  aspect = "aspect-[4/3]",
  className,
  priority,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
}: {
  src: string;
  alt: string;
  caption?: string;
  aspect?: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
}) {
  return (
    <figure className={cn("lg-card overflow-hidden", className)}>
      <span className={cn("relative block w-full", aspect)}>
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover"
          sizes={sizes}
          priority={priority}
          loading={priority ? undefined : "lazy"}
        />
      </span>
      {caption ? (
        <figcaption className="px-4 py-3 text-[12px] font-semibold leading-snug text-[var(--dc-body)]">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
