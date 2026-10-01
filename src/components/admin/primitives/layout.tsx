/**
 * Admin layout primitives.
 *
 * Every admin page used to set its own width, padding and section spacing,
 * which is why no two screens line up. These own that decision instead, and
 * they are the only place the rhythm from the design tokens is applied.
 *
 * `AdminPageHeader`, `AdminEmptyState` and `AdminStatCard` already live in
 * `admin-shell.tsx` and are not duplicated here — import them from there.
 */

import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * The outermost wrapper of an admin page: one max width, one gutter.
 *
 * Capped at --ds-page-max rather than running edge to edge, because a data
 * table stretched across an ultrawide monitor is unreadable — the eye loses
 * the row between the first column and the last.
 */
export function PageContainer({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[var(--ds-page-max)] px-[var(--ds-page-gutter)] lg:px-[var(--ds-page-gutter-lg)]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Vertical rhythm between the blocks of a page. Pages stack sections; they do
 * not hand-pick margins.
 */
export function AdminSectionStack({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-col gap-[var(--ds-section-gap)]", className)} {...props}>
      {children}
    </div>
  );
}

/**
 * A titled region of a page.
 *
 * `title` is optional: a section that is visually obvious (a single table, a
 * row of stat cards) should not be given a heading just to have one, and an
 * empty <h2> is worse for a screen reader than none.
 */
export function AdminSection({
  title,
  description,
  action,
  className,
  children,
  ...props
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
} & HTMLAttributes<HTMLElement>) {
  return (
    <section className={cn("flex flex-col gap-3", className)} {...props}>
      {title || action ? (
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            {title ? (
              <h2 className="text-[15px] font-bold leading-tight text-ds-text-primary">{title}</h2>
            ) : null}
            {description ? (
              <p className="mt-0.5 text-[13px] leading-relaxed text-ds-text-muted">{description}</p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/**
 * The standard admin surface: a border and restrained shadow, not glass.
 *
 * `padded` is off for cards whose whole body is a table — a table draws its
 * own edge-to-edge rows and padding would leave it floating inside its card.
 */
export function AdminCard({
  padded = true,
  className,
  children,
  ...props
}: { padded?: boolean } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-ds-xl border border-ds-border bg-ds-surface shadow-ds-sm",
        padded && "p-4 sm:p-5",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Horizontal scroll that does not trap the page.
 *
 * A wide table on a phone has to scroll sideways, but `overflow-x-auto` alone
 * also swallows vertical scroll gestures that start inside it. `touch-pan-y`
 * hands those back to the page, so a finger dragged upward still scrolls the
 * screen instead of doing nothing.
 */
export function ResponsiveScrollArea({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("w-full touch-pan-y overflow-x-auto", className)} {...props}>
      {children}
    </div>
  );
}
