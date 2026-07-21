import Link from "next/link";
import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

import { GlassPanel } from "@/components/ap/ui/glass-panel";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  icon?: ReactNode;
  className?: string;
};

export function EmptyState({ title, description, actionLabel, actionHref, icon, className }: EmptyStateProps) {
  return (
    <GlassPanel className={cn("flex flex-col items-center px-6 py-12 text-center", className)} padding="lg">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        {icon ?? <Inbox className="h-5 w-5" />}
      </div>
      <h3 className="text-base font-extrabold text-slate-900">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm font-medium leading-relaxed text-slate-500">{description}</p>
      {actionLabel && actionHref ? (
        <Link
          href={actionHref}
          className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-bold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
        >
          {actionLabel}
        </Link>
      ) : null}
    </GlassPanel>
  );
}

type ErrorStateProps = {
  title?: string;
  description?: string;
  onRetry?: () => void;
  supportHref?: string;
  className?: string;
};

export function ErrorState({
  title = "Something went wrong",
  description = "We couldn’t load this section. Please try again.",
  onRetry,
  supportHref = "/ap/support",
  className,
}: ErrorStateProps) {
  return (
    <GlassPanel className={cn("flex flex-col items-center px-6 py-10 text-center", className)} padding="lg">
      <h3 className="text-base font-extrabold text-slate-900">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm font-medium text-slate-500">{description}</p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex h-11 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-bold text-white"
          >
            Retry
          </button>
        ) : null}
        <Link
          href={supportHref}
          className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700"
        >
          Contact support
        </Link>
      </div>
    </GlassPanel>
  );
}

export function LoadingSkeleton({ className, rows = 3 }: { className?: string; rows?: number }) {
  return (
    <div className={cn("space-y-3", className)} aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-20 animate-pulse rounded-[20px] bg-slate-200/60" />
      ))}
    </div>
  );
}
