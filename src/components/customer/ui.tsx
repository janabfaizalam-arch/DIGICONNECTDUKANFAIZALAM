import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * The customer portal's shared surface.
 *
 * The portal used to have its own visual language — flat white cards, slate
 * borders, `rounded-3xl`, its own blue — which meant a customer who signed in
 * left the site they had just been browsing and arrived somewhere that merely
 * resembled it. These primitives are the same `lg-card` / brand-ramp
 * vocabulary the marketing pages use, so signing in changes what is on screen
 * and not what the product looks like.
 */

/** A titled block. One of these per idea, never two ideas in one. */
export function PortalCard({
  children,
  className,
  interactive,
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
  padded?: boolean;
}) {
  return (
    <div
      className={cn(
        "lg-card overflow-hidden",
        interactive && "lg-raise lg-sheen",
        padded && "p-4 sm:p-5",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * Section heading inside a panel.
 *
 * The flame rule from the logo's "DUKAN" lockup, at the small end of the
 * scale, so a portal screen full of these still reads as one page.
 */
export function PortalHeading({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow ? (
          <p className="dc-eyebrow-rule-start inline-flex items-center text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-[var(--dc-flame)]">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="mt-2 text-[1.25rem] font-extrabold leading-tight tracking-[-0.02em] text-[var(--dc-ink)] sm:text-[1.5rem]">
          {title}
        </h2>
        {description ? (
          <p className="mt-1.5 max-w-xl text-[13.5px] font-medium leading-relaxed text-[var(--dc-body)]">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/** Icon disc in one of the two logo ramps. */
export function PortalIcon({
  children,
  tone = "blue",
  className,
}: {
  children: ReactNode;
  tone?: "blue" | "flame" | "muted";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.85rem]",
        tone === "muted"
          ? "bg-[var(--dc-blue-soft)] text-[var(--dc-blue-mid)]"
          : "text-white shadow-[0_8px_18px_-8px_rgba(0,29,95,0.7)]",
        className,
      )}
      style={
        tone === "muted"
          ? undefined
          : { background: tone === "flame" ? "var(--dc-grad-flame)" : "var(--dc-grad-blue)" }
      }
    >
      {children}
    </span>
  );
}

/** The portal's one primary button. */
export function PortalButton({
  children,
  href,
  onClick,
  tone = "blue",
  type = "button",
  disabled,
  className,
}: {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  tone?: "blue" | "flame" | "ghost";
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
}) {
  const classes = cn(
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-[14px] font-extrabold transition duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dc-blue-bright)] disabled:cursor-not-allowed disabled:opacity-60",
    tone === "ghost"
      ? "lg-pill lg-raise text-[var(--dc-blue-mid)]"
      : "text-white hover:brightness-110 disabled:hover:brightness-100",
    className,
  );
  const style =
    tone === "ghost"
      ? undefined
      : { background: tone === "flame" ? "var(--dc-grad-flame)" : "var(--dc-grad-blue)" };

  if (href) {
    return (
      <Link href={href} className={classes} style={style}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} disabled={disabled} className={classes} style={style}>
      {children}
    </button>
  );
}

/**
 * A number the customer cares about.
 *
 * `hint` is for the sentence that stops a figure being ambiguous — what the
 * money is, when it expires, what counts as "active". A stat with no hint
 * usually means the label was doing two jobs.
 */
export function StatTile({
  label,
  value,
  hint,
  icon,
  tone = "blue",
  href,
  onClick,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
  tone?: "blue" | "flame" | "muted";
  href?: string;
  onClick?: () => void;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10.5px] font-extrabold uppercase tracking-[0.12em] text-[var(--dc-muted)]">{label}</p>
        {icon ? (
          <PortalIcon tone={tone} className="h-8 w-8 rounded-[0.7rem]">
            {icon}
          </PortalIcon>
        ) : null}
      </div>
      <p className="mt-2 text-[1.4rem] font-extrabold leading-none tracking-[-0.02em] text-[var(--dc-ink)] sm:text-[1.65rem]">
        {value}
      </p>
      {hint ? (
        <p className="mt-1.5 text-[11.5px] font-medium leading-snug text-[var(--dc-body)]">{hint}</p>
      ) : null}
    </>
  );

  const shell = "lg-card lg-raise lg-sheen block h-full w-full p-3.5 text-left sm:p-4";

  if (href) {
    return (
      <Link href={href} className={shell}>
        {body}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={shell}>
        {body}
      </button>
    );
  }
  return <div className={shell}>{body}</div>;
}

/**
 * What a list shows when it is empty.
 *
 * Every empty state names the thing that is missing and offers the one action
 * that fixes it. An empty panel with "No data" in grey is a dead end, and a
 * customer who has just signed up sees nothing but dead ends.
 */
export function EmptyState({
  icon,
  title,
  description,
  actionHref,
  actionLabel,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="lg-card flex flex-col items-center gap-3 px-5 py-10 text-center">
      <PortalIcon tone="blue" className="h-12 w-12 rounded-2xl">
        {icon}
      </PortalIcon>
      <p className="text-[15.5px] font-extrabold text-[var(--dc-ink)]">{title}</p>
      <p className="max-w-sm text-[13px] font-medium leading-relaxed text-[var(--dc-body)]">{description}</p>
      {actionHref && actionLabel ? (
        <PortalButton href={actionHref} tone="flame" className="mt-1">
          {actionLabel}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </PortalButton>
      ) : null}
    </div>
  );
}

/** Rupees, the way an Indian customer expects to read them. */
export function formatINR(value: number | null | undefined) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}

/** A date a customer can read at a glance. */
export function formatDate(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(date);
}
