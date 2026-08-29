"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * The apply flow's form controls.
 *
 * The portal already exports cards, headings and buttons, and this flow uses
 * those directly rather than growing a second set — signing in and applying
 * should not look like two products. What the portal had no need for is a
 * form: these are the field shapes, on the same `.lg-field` glass as the
 * search docks on the marketing pages.
 */

export function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 flex items-baseline gap-1.5 text-[12.5px] font-extrabold text-[var(--dc-ink)]">
        {label}
        {required ? (
          <span className="text-[var(--dc-orange-600)]" aria-hidden="true">
            *
          </span>
        ) : (
          <span className="text-[11px] font-bold text-[var(--dc-ink)]/40">optional</span>
        )}
      </span>
      {children}
      {/*
        The error replaces the hint rather than stacking under it. Two lines of
        small text under a field, one of them red, is how a form starts feeling
        like it is telling you off.
      */}
      {error ? (
        <span className="mt-1.5 block text-[11.5px] font-bold text-rose-600">{error}</span>
      ) : hint ? (
        <span className="mt-1.5 block text-[11.5px] font-semibold text-[var(--dc-ink)]/50">{hint}</span>
      ) : null}
    </label>
  );
}

const CONTROL =
  "w-full rounded-[0.9rem] border px-3.5 text-[15px] font-semibold text-[var(--dc-ink)] outline-none transition duration-200 placeholder:font-medium placeholder:text-[var(--dc-ink)]/35 focus:ring-4";

/**
 * 15px, not the 13px the old form used.
 *
 * iOS zooms the whole page in when a focused input's text is under 16px, and
 * the flow is mostly used on a phone. This sits at the edge of that, and the
 * fields are the one place on the site where the type does not go smaller.
 */
export function TextInput({
  invalid,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      {...props}
      aria-invalid={invalid || undefined}
      className={cn(
        CONTROL,
        "h-12 bg-white/70 backdrop-blur-sm",
        invalid
          ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100"
          : "border-[var(--dc-blue-bright)]/15 focus:border-[var(--dc-blue-bright)]/45 focus:ring-[var(--dc-blue-soft)]",
        className,
      )}
    />
  );
}

export function TextArea({
  invalid,
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea
      {...props}
      aria-invalid={invalid || undefined}
      className={cn(
        CONTROL,
        "min-h-[5.5rem] resize-y bg-white/70 py-3 backdrop-blur-sm",
        invalid
          ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100"
          : "border-[var(--dc-blue-bright)]/15 focus:border-[var(--dc-blue-bright)]/45 focus:ring-[var(--dc-blue-soft)]",
        className,
      )}
    />
  );
}

/** A labelled row in a summary panel. */
export function SummaryRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <span className="shrink-0 text-[12px] font-bold text-[var(--dc-ink)]/50">{label}</span>
      <span className="min-w-0 text-right text-[13.5px] font-bold text-[var(--dc-ink)]">{value}</span>
    </div>
  );
}
