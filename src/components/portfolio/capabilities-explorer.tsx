"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { AnimatePresence, m, useReducedMotion } from "framer-motion";

import { CapabilityVisual } from "@/components/portfolio/capability-visual";
import type { Capability } from "@/lib/portfolio/content";
import { cn } from "@/lib/utils";

/**
 * Capabilities as an index. On a large screen, pointing at or focusing a line
 * brings its illustration and detail into the panel beside it; on a phone
 * every capability is shown in full, one after another, with nothing hidden
 * behind a hover a finger cannot make.
 */
export function CapabilitiesExplorer({ capabilities }: { capabilities: Capability[] }) {
  const [active, setActive] = useState(0);
  const reduced = useReducedMotion();
  const current = capabilities[active];

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_0.95fr] lg:gap-16">
      <ol className="divide-y divide-slate-900/10 border-y border-slate-900/10">
        {capabilities.map((capability, index) => (
          <li key={capability.id}>
            {/* Desktop: an index line that drives the panel. */}
            <Link
              href={capability.href}
              onPointerEnter={() => setActive(index)}
              onFocus={() => setActive(index)}
              aria-describedby={`cap-${capability.id}-desc`}
              className={cn(
                "group hidden items-baseline gap-6 py-5 outline-none transition-colors lg:flex",
                "focus-visible:ring-2 focus-visible:ring-[var(--dc-blue-bright)] focus-visible:ring-offset-4 rounded-sm",
              )}
            >
              <span className={cn("w-8 shrink-0 font-mono text-xs font-semibold tabular-nums transition-colors", active === index ? "text-[var(--dc-flame)]" : "text-slate-400")}>
                {String(index + 1).padStart(2, "0")}
              </span>
              <span
                className={cn(
                  "flex-1 font-[family-name:var(--font-heading)] text-[clamp(1.5rem,2.4vw,2.25rem)] font-semibold tracking-[-0.03em] transition-[color,transform] duration-500",
                  active === index ? "translate-x-2 text-[var(--dc-ink)]" : "text-slate-400 group-hover:text-slate-600",
                )}
              >
                {capability.title}
              </span>
              <ArrowUpRight
                aria-hidden="true"
                className={cn("h-6 w-6 shrink-0 transition-all duration-500", active === index ? "rotate-0 text-[var(--dc-flame)] opacity-100" : "-rotate-45 opacity-0")}
              />
            </Link>
            <span id={`cap-${capability.id}-desc`} className="sr-only">
              {capability.description}
            </span>

            {/* Phone and tablet: everything visible. */}
            <div className="grid gap-4 py-7 lg:hidden">
              <div className="flex items-baseline gap-4">
                <span className="font-mono text-xs font-semibold text-[var(--dc-flame)]">{String(index + 1).padStart(2, "0")}</span>
                <h3 className="font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-[-0.03em] text-[var(--dc-ink)]">{capability.title}</h3>
              </div>
              <div className="aspect-[16/9]">
                <CapabilityVisual id={capability.id} />
              </div>
              <p className="text-[15px] leading-7 text-[var(--dc-body)]">{capability.description}</p>
              <ul className="flex flex-wrap gap-2">
                {capability.points.map((point) => (
                  <li key={point} className="rounded-full bg-[var(--dc-blue-soft)] px-3 py-1 text-xs font-semibold text-[var(--dc-brand-navy)]">
                    {point}
                  </li>
                ))}
              </ul>
              <Link href={capability.href} className="inline-flex items-center gap-1.5 text-sm font-bold text-[var(--dc-blue-bright)]">
                See related work <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </li>
        ))}
      </ol>

      <div className="relative hidden lg:block">
        <div className="sticky top-28">
          <AnimatePresence mode="wait" initial={false}>
            <m.div
              key={current.id}
              initial={reduced ? false : { opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduced ? undefined : { opacity: 0, y: -12, scale: 0.98 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-[28px] bg-white p-6 shadow-[0_40px_80px_-40px_rgba(1,29,95,0.35)] ring-1 ring-slate-900/5"
            >
              <div className="aspect-[16/10]">
                <CapabilityVisual id={current.id} />
              </div>
              <p className="mt-6 text-lg leading-8 text-[var(--dc-body)]">{current.description}</p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {current.points.map((point) => (
                  <li key={point} className="rounded-full bg-[var(--dc-blue-soft)] px-3 py-1 text-xs font-semibold text-[var(--dc-brand-navy)]">
                    {point}
                  </li>
                ))}
              </ul>
            </m.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
