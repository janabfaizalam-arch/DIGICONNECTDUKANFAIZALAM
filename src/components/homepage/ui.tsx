import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
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
 * The page previously used seven different tints across seventeen sections —
 * cream, aqua, teal, violet, orange, sky and white — so every band announced
 * itself and the page read as a stack of unrelated pages. The tinted variants
 * now all resolve to one soft tint, leaving a simple alternation of white and
 * tint with the dark surfaces as deliberate punctuation.
 *
 * The names are kept so no section has to change; only what they resolve to
 * has been narrowed.
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
  navy: "bg-[var(--dc-navy-950)] text-white",
  blue: "bg-[var(--dc-blue-700)] text-white",
};

/** Shared homepage section with consistent mobile gutters and desktop rhythm. */
export function HomepageSection({
  id,
  surface = "white",
  className,
  children,
  compact,
  "aria-labelledby": ariaLabelledby,
}: {
  id?: string;
  surface?: HomepageSurface;
  className?: string;
  children: ReactNode;
  compact?: boolean;
  "aria-labelledby"?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={ariaLabelledby}
      className={cn(
        SURFACE[surface],
        compact
          ? "px-[var(--mobile-page-gutter)] py-7 sm:px-6 sm:py-8 md:px-8 md:py-10"
          : "px-[var(--mobile-page-gutter)] py-10 sm:px-6 sm:py-12 md:px-8 md:py-16",
        className,
      )}
    >
      <div className="mx-auto w-full max-w-[var(--dc-max)]">{children}</div>
    </section>
  );
}

export function HomepageSectionHeader({
  eyebrow,
  title,
  description,
  actionHref,
  actionLabel,
  light,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
  light?: boolean;
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4 sm:mb-6 md:mb-8">
      <div className="min-w-0 max-w-3xl">
        {eyebrow ? (
          <p
            className={cn(
              "text-[11px] font-bold uppercase tracking-[0.16em]",
              light ? "text-[var(--dc-orange-400)]" : "text-[var(--dc-blue-600)]",
            )}
          >
            {eyebrow}
          </p>
        ) : null}
        <h2
          className={cn(
            "mt-2 text-[1.5rem] font-black leading-[1.15] tracking-tight sm:text-[1.85rem] md:text-[2.05rem]",
            light ? "text-white" : "text-[var(--dc-ink)]",
          )}
        >
          {title}
        </h2>
        {description ? (
          <p
            className={cn(
              "mt-2.5 max-w-2xl text-[14.5px] font-medium leading-relaxed sm:text-[15px]",
              light ? "text-white/75" : "text-[var(--dc-body)]",
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
            "inline-flex min-h-11 shrink-0 items-center gap-0.5 text-sm font-bold hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 md:text-[15px]",
            light
              ? "text-white focus-visible:outline-white"
              : "text-[var(--dc-blue-600)] focus-visible:outline-[var(--dc-blue-600)]",
          )}
        >
          {actionLabel}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      ) : null}
    </div>
  );
}

export function HomepageMobileRail({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "no-scrollbar -mx-[var(--mobile-page-gutter)] flex snap-x snap-mandatory gap-3 overflow-x-auto px-[var(--mobile-page-gutter)] pb-2 pr-[calc(var(--mobile-page-gutter)+4.75rem+env(safe-area-inset-right))]",
        className,
      )}
    >
      {children}
    </div>
  );
}
