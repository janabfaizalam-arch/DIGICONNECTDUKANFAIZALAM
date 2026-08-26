"use client";

import { type ReactNode } from "react";
import { LazyMotion, domAnimation, m, useReducedMotion, type Variants } from "framer-motion";

/**
 * Homepage motion primitives.
 *
 * Framer Motion is loaded through LazyMotion with the `domAnimation` feature
 * bundle only — no layout projection, no drag, no 3D — because the homepage
 * animates nothing but opacity and translate. That is roughly a fifth of the
 * full `motion` import, and it is the difference between the library being a
 * reasonable cost on a phone and being the largest thing on the page.
 *
 * `strict` is on deliberately: it makes `motion.div` throw, so nobody can
 * quietly re-import the full bundle later and undo the saving.
 */
export function MotionRoot({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      {children}
    </LazyMotion>
  );
}

/** The house curve — a soft overshoot-free ease-out, matched to --lg-ease. */
const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Scroll reveal.
 *
 * `once` so a band never re-animates when the user scrolls back up, and the
 * viewport margin fires it slightly before the edge so the motion has finished
 * by the time the section is actually being read.
 */
export function Reveal({
  children,
  delay = 0,
  y = 22,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();

  if (reduced) return <div className={className}>{children}</div>;

  return (
    <m.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      transition={{ duration: 0.55, delay, ease: EASE }}
    >
      {children}
    </m.div>
  );
}

const STAGGER_PARENT: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

/** The elements these wrappers are allowed to become. */
type Tag = "div" | "ul" | "ol" | "li";

const STAGGER_CHILD: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.985 },
  shown: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.42, ease: EASE } },
};

/**
 * A grid or rail whose children arrive one after another.
 *
 * Pair with `StaggerItem`. The parent owns the timing, so an item never has to
 * know its own index — which matters because these lists are built from live
 * catalogue data whose length changes.
 */
export function Stagger({
  children,
  className,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  /** Set to "ol"/"ul" when the children are list items — a motion wrapper that
      renders a div between a list and its items is invalid markup, and screen
      readers stop announcing the list's length. */
  as?: Tag;
}) {
  const reduced = useReducedMotion();
  const Static = as;
  const Motion = m[as];

  if (reduced) return <Static className={className}>{children}</Static>;

  return (
    <Motion
      className={className}
      variants={STAGGER_PARENT}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
    >
      {children}
    </Motion>
  );
}

export function StaggerItem({
  children,
  className,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: Tag;
}) {
  const reduced = useReducedMotion();
  const Static = as;
  const Motion = m[as];

  if (reduced) return <Static className={className}>{children}</Static>;

  return (
    <Motion className={className} variants={STAGGER_CHILD}>
      {children}
    </Motion>
  );
}

/**
 * Press feedback for a glass tile.
 *
 * Hover lift lives in CSS (`.lg-raise`) so it costs nothing and works before
 * hydration; only the tap scale is here, because a spring on press is the one
 * part that reads as cheap when done with a CSS transition.
 */
export function Press({ children, className }: { children: ReactNode; className?: string }) {
  const reduced = useReducedMotion();

  if (reduced) return <div className={className}>{children}</div>;

  return (
    <m.div
      className={className}
      whileTap={{ scale: 0.975 }}
      transition={{ type: "spring", stiffness: 420, damping: 28 }}
    >
      {children}
    </m.div>
  );
}
