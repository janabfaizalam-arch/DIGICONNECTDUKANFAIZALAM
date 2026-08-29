import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { BrandWash } from "@/components/homepage/brand-backdrop";
import { cn } from "@/lib/utils";

export type HomepageSurface =
  | "white"
  | "sky"
  | "cream"
  | "tealSoft"
  | "violetSoft"
  | "orangeSoft"
  | "navy"
  | "blue"
  | "aqua";

/**
 * Section backgrounds.
 *
 * The page once used seven different tints across seventeen sections — cream,
 * aqua, teal, violet, orange, sky and white — so every band announced itself
 * and the page read as a stack of unrelated pages. The tinted variants all
 * resolve to one soft tint, leaving a simple alternation of white and tint
 * with the dark surfaces as deliberate punctuation.
 *
 * The names are kept so no section has to change; only what they resolve to
 * has been narrowed. `navy` and `blue` now both carry the logo's own blue ramp
 * rather than two flat blues that were nearly the same colour anyway.
 */
const TINT = "bg-[var(--dc-sky-soft)] text-[var(--dc-ink)]";

const SURFACE: Record<HomepageSurface, string> = {
  white: "bg-white text-[var(--dc-ink)]",
  sky: TINT,
  cream: TINT,
  tealSoft: TINT,
  violetSoft: TINT,
  orangeSoft: TINT,
  aqua: TINT,
  navy: "text-white",
  blue: "text-white",
};

const DARK_SURFACES: ReadonlySet<HomepageSurface> = new Set(["navy", "blue"]);

/**
 * Shared homepage section.
 *
 * Consistent gutters and vertical rhythm, plus two things every band gets for
 * free:
 *
 *   • an ambient wash behind the content, because clear glass takes its colour
 *     from what is behind it — a glass card on flat white is just grey plastic;
 *   • `content-visibility: auto`, so the browser can skip laying out and
 *     rasterising a band until it is near the viewport. With this many blurred
 *     surfaces on one page that is the single largest scroll-performance win
 *     available, and the intrinsic size keeps the scrollbar from jumping.
 *
 * `eager` opts a band out of the deferral — use it for anything within the
 * first screen or two, where deferring would cost a paint rather than save one.
 */
export function HomepageSection({
  id,
  surface = "white",
  className,
  children,
  compact,
  eager,
  wash = "blue",
  "aria-labelledby": ariaLabelledby,
}: {
  id?: string;
  surface?: HomepageSurface;
  className?: string;
  children: ReactNode;
  compact?: boolean;
  eager?: boolean;
  wash?: "blue" | "flame" | "dual" | "none";
  "aria-labelledby"?: string;
}) {
  const dark = DARK_SURFACES.has(surface);

  return (
    <section
      id={id}
      aria-labelledby={ariaLabelledby}
      className={cn(
        "dc-ambient relative overflow-hidden",
        SURFACE[surface],
        !eager && "lg-defer",
        /*
          The phone column is tighter than the desktop one.

          Seventeen bands at 48px of padding each is 1600px of empty space
          before a single card is drawn, and on a phone that reads as one
          crowded thing stacked on the next rather than as breathing room. Only
          the base step is reduced; from `sm` up the rhythm is unchanged,
          because the wide layout has the room to use it.
        */
        compact
          ? "px-[var(--mobile-page-gutter)] py-6 sm:px-6 sm:py-9 md:px-8 md:py-11"
          : "px-[var(--mobile-page-gutter)] py-8 sm:px-6 sm:py-14 md:px-8 md:py-20",
        className,
      )}
      style={dark ? { background: "var(--dc-grad-blue)" } : undefined}
    >
      {dark ? (
        <div className="dc-ambient-layer" aria-hidden="true">
          <div className="dc-jaali absolute inset-0 opacity-[0.06]" />
          <div className="dc-orb dc-orb-flame lg-drift-slow -right-[12%] -top-[40%] h-[34rem] w-[34rem] opacity-55" />
        </div>
      ) : wash !== "none" ? (
        <BrandWash variant={wash} />
      ) : null}

      <div className="relative mx-auto w-full max-w-[var(--dc-max)]">{children}</div>
    </section>
  );
}

/**
 * Section header.
 *
 * The eyebrow carries the flame rule from the logo's "DUKAN" lockup, the title
 * is set tight and heavy, and the optional action link gets a proper 44px tap
 * target with the arrow nudging on hover.
 */
export function HomepageSectionHeader({
  eyebrow,
  title,
  description,
  actionHref,
  actionLabel,
  light,
  center,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
  light?: boolean;
  center?: boolean;
}) {
  return (
    <div
      className={cn(
        "mb-4 gap-3 sm:mb-7 sm:gap-4 md:mb-9",
        center
          ? "flex flex-col items-center text-center"
          : // Stacked on phones. Side by side, the action pill sat hard against
            // a two-line description with nowhere to go, and the two read as
            // one collided block.
            "flex flex-col items-start sm:flex-row sm:items-end sm:justify-between",
      )}
    >
      <div className={cn("min-w-0", center ? "max-w-2xl" : "max-w-3xl")}>
        {eyebrow ? (
          <p
            className={cn(
              "inline-flex items-center text-[10px] font-extrabold uppercase tracking-[0.16em] sm:text-[11px] sm:tracking-[0.18em]",
              // The rule is drawn from the flame ramp on both surfaces; only
              // the text colour has to change.
              center ? "dc-eyebrow-rule" : "dc-eyebrow-rule-start",
              light ? "text-[var(--dc-amber)]" : "text-[var(--dc-flame)]",
            )}
          >
            {eyebrow}
          </p>
        ) : null}

        <h2
          className={cn(
            "mt-2 text-[1.35rem] font-extrabold leading-[1.15] tracking-[-0.025em] sm:mt-2.5 sm:text-[2rem] sm:leading-[1.12] md:text-[2.3rem]",
            light ? "text-white" : "text-[var(--dc-ink)]",
          )}
        >
          {title}
        </h2>

        {description ? (
          <p
            className={cn(
              "mt-2 max-w-2xl text-[13.5px] font-medium leading-[1.55] sm:mt-3 sm:text-[15.5px] sm:leading-relaxed",
              light ? "text-white/72" : "text-[var(--dc-body)]",
            )}
          >
            {description}
          </p>
        ) : null}
      </div>

      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className={cn(
            "group inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-bold transition duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 sm:min-h-11 sm:px-4 sm:text-sm md:text-[15px]",
            light
              ? "lg-pill-dark lg-raise-dark text-white focus-visible:outline-white"
              : "lg-pill lg-raise text-[var(--dc-blue-mid)] focus-visible:outline-[var(--dc-blue-bright)]",
          )}
        >
          {actionLabel}
          <ArrowRight
            className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </Link>
      ) : null}
    </div>
  );
}

/**
 * The homepage's one card.
 *
 * Every tile on the page — a shortcut, a category, a step, a reward — is this
 * component with different contents. That is the whole reason the redesign
 * reads as one page: seventeen bands, one surface treatment.
 */
export function GlassTile({
  children,
  className,
  interactive = true,
  dark,
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
  dark?: boolean;
}) {
  return (
    <div
      className={cn(
        dark ? "lg-card-dark" : "lg-card",
        interactive && (dark ? "lg-raise-dark" : "lg-raise lg-sheen"),
        "h-full overflow-hidden",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * Icon disc in one of the two logo ramps.
 *
 * Blue is the default and orange is reserved for the primary action in a
 * group, mirroring the mark itself: one blue D, one orange C.
 */
export function BrandIcon({
  children,
  tone = "blue",
  className,
}: {
  children: ReactNode;
  tone?: "blue" | "flame";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-[0.9rem] text-white shadow-[0_8px_18px_-8px_rgba(0,29,95,0.7)]",
        className,
      )}
      style={{ background: tone === "flame" ? "var(--dc-grad-flame)" : "var(--dc-grad-blue)" }}
    >
      {children}
    </span>
  );
}
