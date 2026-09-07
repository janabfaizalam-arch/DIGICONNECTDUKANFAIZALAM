"use client";

import Link from "next/link";
import { AlertTriangle, Database, Loader2, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { ContentStatus } from "@/lib/content-engine/types";

/**
 * The small pieces every Content Engine screen is built from.
 *
 * They exist so the twelve screens look like one product rather than twelve
 * people's ideas of a card, and so that the two states that matter most —
 * "the migration has not been run" and "this is government content" — look
 * the same everywhere they appear.
 */

export function SectionCard({
  title,
  subtitle,
  action,
  children,
  className,
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-[1.25rem] border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(16,33,61,0.04)] sm:p-5",
        className,
      )}
    >
      {(title || action) && (
        <header className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title && (
              <h2 className="text-[15px] font-bold tracking-tight text-[var(--dc-ink)]">{title}</h2>
            )}
            {subtitle && (
              <p className="mt-0.5 text-[12.5px] font-medium leading-snug text-[var(--dc-muted)]">{subtitle}</p>
            )}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function StatCard({
  label,
  value,
  hint,
  href,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  href?: string;
  tone?: "default" | "warn" | "good";
}) {
  const body = (
    <div
      className={cn(
        "rounded-[1rem] border p-3 transition-colors",
        tone === "warn"
          ? "border-amber-200 bg-amber-50/70"
          : tone === "good"
            ? "border-emerald-200 bg-emerald-50/60"
            : "border-slate-200 bg-white",
        href && "hover:border-[var(--dc-blue-600)]/40 hover:bg-[var(--dc-sky-soft)]",
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--dc-muted)]">{label}</p>
      <p className="mt-1 text-[1.4rem] font-extrabold leading-none text-[var(--dc-ink)]">{value}</p>
      {hint && <p className="mt-1 text-[11.5px] font-medium text-[var(--dc-muted)]">{hint}</p>}
    </div>
  );

  return href ? <Link href={href}>{body}</Link> : body;
}

/** The pipeline stage, coloured by how close to the public it is. */
export function StageBadge({ status }: { status: ContentStatus | string }) {
  const tone =
    status === "FAILED"
      ? "bg-rose-50 text-rose-700 border-rose-200"
      : status === "PUBLISHED" || status === "ANALYZED"
        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
        : status === "APPROVAL_PENDING" || status === "FACT_CHECK_PENDING"
          ? "bg-amber-50 text-amber-800 border-amber-200"
          : status === "APPROVED" || status === "SCHEDULED"
            ? "bg-sky-50 text-sky-800 border-sky-200"
            : "bg-slate-50 text-slate-700 border-slate-200";

  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold", tone)}>
      {String(status).replace(/_/g, " ")}
    </span>
  );
}

/**
 * The sarkari mark.
 *
 * Deliberately loud and deliberately everywhere a government post appears. A
 * reviewer skimming a queue needs to know before they click which rows carry
 * an amount somebody will act on.
 */
export function GovernmentBadge({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-900">
      <ShieldCheck className="h-3 w-3" />
      {compact ? "Sarkari" : "Sarkari — insaan ki approval zaruri"}
    </span>
  );
}

export function EmptyState({ title, detail, action }: { title: string; detail: string; action?: ReactNode }) {
  return (
    <div className="rounded-[1rem] border border-dashed border-slate-300 bg-slate-50/60 p-6 text-center">
      <p className="text-[14px] font-bold text-[var(--dc-ink)]">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-[12.5px] font-medium leading-snug text-[var(--dc-muted)]">{detail}</p>
      {action && <div className="mt-3 flex justify-center">{action}</div>}
    </div>
  );
}

/**
 * The tables are not there yet.
 *
 * Shown instead of an error, because in this project migrations are applied
 * by hand in the Supabase SQL editor and "not migrated yet" is a real state
 * rather than a bug. It names the file so nobody has to go looking.
 */
export function NotInstalledNotice() {
  return (
    <div className="rounded-[1.25rem] border border-amber-300 bg-amber-50 p-5">
      <div className="flex items-start gap-3">
        <Database className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
        <div>
          <p className="text-[15px] font-bold text-amber-900">Pehle database migration chalaiye</p>
          <p className="mt-1 text-[13px] font-medium leading-snug text-amber-900/90">
            AI Content Engine ki tables abhi banayi nahi gayi hain. Supabase SQL editor kholiye aur{" "}
            <code className="rounded bg-amber-100 px-1 py-0.5 text-[12px] font-semibold">
              supabase/migrations/20260906120000_ai_content_engine.sql
            </code>{" "}
            chalaiye. Uske baad ye screen apne aap kaam karne lagegi.
          </p>
        </div>
      </div>
    </div>
  );
}

export function ErrorNotice({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-[1rem] border border-rose-200 bg-rose-50 p-3">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
      <p className="text-[12.5px] font-semibold leading-snug text-rose-900">{message}</p>
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-8 text-[13px] font-semibold text-[var(--dc-muted)]">
      <Loader2 className="h-4 w-4 animate-spin" />
      {label ?? "Loading…"}
    </div>
  );
}

/** A score out of ten as a bar, because five numbers in a row read as noise. */
export function ScoreBar({ label, value, max = 10 }: { label: string; value: number; max?: number }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="flex items-center gap-2">
      <span className="w-[86px] shrink-0 text-[11px] font-semibold text-[var(--dc-muted)]">{label}</span>
      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
        <span
          className="block h-full rounded-full bg-[var(--dc-blue-600)]"
          style={{ width: `${pct}%` }}
        />
      </span>
      <span className="w-6 shrink-0 text-right text-[11px] font-bold text-[var(--dc-ink)]">{value}</span>
    </div>
  );
}
