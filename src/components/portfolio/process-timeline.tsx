"use client";

import { useRef } from "react";
import { m, useReducedMotion, useScroll, useSpring } from "framer-motion";

/**
 * The six steps, with a line that fills as the reader scrolls through them.
 * The fill is a scaleY transform driven by scroll position: no layout work
 * per frame, and it is simply full for people who prefer less motion.
 */
export function ProcessTimeline({ steps }: { steps: { step: string; title: string; text: string }[] }) {
  const ref = useRef<HTMLOListElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 75%", "end 55%"] });
  const progress = useSpring(scrollYProgress, { stiffness: 90, damping: 24, mass: 0.4 });

  return (
    <ol ref={ref} className="relative grid gap-10 pl-10 sm:pl-14">
      <span aria-hidden="true" className="absolute bottom-2 left-[11px] top-2 w-px bg-slate-900/10 sm:left-[15px]" />
      <m.span
        aria-hidden="true"
        className="absolute bottom-2 left-[11px] top-2 w-px origin-top bg-gradient-to-b from-[var(--dc-blue-bright)] to-[var(--dc-flame)] sm:left-[15px]"
        style={{ scaleY: reduced ? 1 : progress }}
      />
      {steps.map((item, index) => (
        <m.li
          key={item.step}
          className="relative"
          initial={reduced ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "0px 0px -15% 0px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.04 * index }}
        >
          <span
            aria-hidden="true"
            className="absolute -left-10 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white ring-1 ring-slate-900/15 sm:-left-14 sm:h-8 sm:w-8"
          >
            <span className="h-2 w-2 rounded-full bg-[var(--dc-blue-bright)]" />
          </span>
          <p className="font-mono text-xs font-semibold text-[var(--dc-flame)]">{item.step}</p>
          <h3 className="mt-1 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-[-0.03em] text-[var(--dc-ink)] sm:text-3xl">
            {item.title}
          </h3>
          <p className="mt-2 max-w-md text-[15px] leading-7 text-[var(--dc-body)]">{item.text}</p>
        </m.li>
      ))}
    </ol>
  );
}
