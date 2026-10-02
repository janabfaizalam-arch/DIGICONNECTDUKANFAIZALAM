/**
 * The three states every admin screen needs besides its data.
 *
 * Brief §35: loading, empty and error are not afterthoughts — a screen without
 * them shows a blank rectangle and the admin cannot tell which of the three is
 * happening. Empty already exists as `AdminEmptyState` in `admin-shell.tsx`
 * and is not duplicated here.
 */

import type { ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * A skeleton shaped like the table it replaces.
 *
 * Rows and columns are passed in so the placeholder occupies the same space as
 * the real thing; a generic spinner lets the page jump when data lands.
 */
export function TableLoadingState({
  rows = 6,
  columns = 5,
  className,
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div className={cn("animate-pulse", className)} aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className="flex gap-3 border-b border-ds-border px-4 py-3">
        {Array.from({ length: columns }).map((_, column) => (
          <div key={column} className="h-3 flex-1 rounded bg-ds-surface-sunken" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, row) => (
        <div key={row} className="flex gap-3 border-b border-ds-border px-4 py-4 last:border-0">
          {Array.from({ length: columns }).map((_, column) => (
            <div
              key={column}
              className="h-3.5 flex-1 rounded bg-ds-surface-sunken"
              // The first column is usually a name and reads longer than the rest.
              style={{ maxWidth: column === 0 ? undefined : "70%" }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/** A block-level skeleton for cards and panels. */
export function LoadingState({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("animate-pulse space-y-2.5 p-4", className)} aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      {Array.from({ length: lines }).map((_, line) => (
        <div
          key={line}
          className="h-3.5 rounded bg-ds-surface-sunken"
          style={{ width: line === lines - 1 ? "60%" : "100%" }}
        />
      ))}
    </div>
  );
}

/**
 * Something failed.
 *
 * Brief §51: the admin sees a plain sentence and a way forward, never a stack
 * trace. `detail` is for a message already written for a human — an API's
 * "Could not reach the payment provider" — not for raw error text.
 */
export function ErrorState({
  title = "Something went wrong",
  detail,
  onRetry,
  className,
}: {
  title?: string;
  detail?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center gap-3 rounded-ds-xl border border-ds-danger-border bg-ds-danger-soft p-8 text-center",
        className,
      )}
    >
      <AlertTriangle className="h-5 w-5 text-ds-danger" aria-hidden="true" />
      <div>
        <p className="text-[14px] font-bold text-ds-text-primary">{title}</p>
        {detail ? (
          <p className="mx-auto mt-1 max-w-sm text-[13px] leading-relaxed text-ds-text-secondary">{detail}</p>
        ) : null}
      </div>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex h-9 items-center gap-2 rounded-ds-md border border-ds-border-strong bg-ds-surface px-3.5 text-[13px] font-semibold text-ds-text-primary shadow-ds-sm transition hover:bg-ds-surface-sunken"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          Try again
        </button>
      ) : null}
    </div>
  );
}

/**
 * Nothing to show, with the action that would change that.
 *
 * Distinct from `AdminEmptyState`, which states a fact. This one is for a
 * table that filtered down to nothing, where the useful thing is a way out.
 */
export function NoResultsState({
  title = "No results",
  description,
  action,
  className,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-3 px-6 py-12 text-center", className)}>
      <div>
        <p className="text-[14px] font-bold text-ds-text-primary">{title}</p>
        {description ? (
          <p className="mx-auto mt-1 max-w-sm text-[13px] leading-relaxed text-ds-text-muted">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
