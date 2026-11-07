"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { AnimatePresence, m, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

/**
 * Website showcase: one stage, several views (desktop, mobile, a product
 * page, a dashboard, the same site across screen sizes). A proper tablist:
 * arrow keys move between tabs, and each view is a labelled tab panel.
 */
export function Showcase({ panels }: { panels: { id: string; label: string; caption: string; node: ReactNode }[] }) {
  const baseId = useId();
  const [active, setActive] = useState(0);
  const reduced = useReducedMotion();
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const keys: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1 };
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      const next = event.key === "Home" ? 0 : panels.length - 1;
      setActive(next);
      tabs.current[next]?.focus();
      return;
    }
    const step = keys[event.key];
    if (!step) return;
    event.preventDefault();
    const next = (active + step + panels.length) % panels.length;
    setActive(next);
    tabs.current[next]?.focus();
  };

  const panel = panels[active];

  return (
    <div>
      <div
        role="tablist"
        aria-label="Showcase views"
        onKeyDown={onKey}
        className="mx-auto flex w-fit max-w-full gap-1 overflow-x-auto rounded-full bg-white/[0.06] p-1 ring-1 ring-white/10 [scrollbar-width:none]"
      >
        {panels.map((item, index) => (
          <button
            key={item.id}
            ref={(node) => {
              tabs.current[index] = node;
            }}
            role="tab"
            type="button"
            id={`${baseId}-tab-${item.id}`}
            aria-selected={active === index}
            aria-controls={`${baseId}-panel-${item.id}`}
            tabIndex={active === index ? 0 : -1}
            onClick={() => setActive(index)}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-300",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70",
              active === index ? "bg-white text-[var(--dc-ink)]" : "text-white/70 hover:text-white",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`${baseId}-panel-${panel.id}`}
        aria-labelledby={`${baseId}-tab-${panel.id}`}
        tabIndex={0}
        className="relative mt-10 rounded-[28px] outline-none focus-visible:ring-2 focus-visible:ring-white/50"
      >
        <AnimatePresence mode="wait" initial={false}>
          <m.div
            key={panel.id}
            initial={reduced ? false : { opacity: 0, y: 24, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? undefined : { opacity: 0, y: -16, scale: 0.985 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            {panel.node}
            <p className="mt-8 text-center text-sm text-white/60">{panel.caption}</p>
          </m.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
