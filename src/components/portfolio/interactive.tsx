"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { m, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";

import { cn } from "@/lib/utils";

/**
 * The portfolio's motion layer.
 *
 * Everything decorative here switches itself off for people who ask for less
 * motion, on touch screens (no hover, no cursor), and on low-powered devices
 * (few cores, little memory, data saver). Only transform and opacity are
 * animated, and pointer tracking runs through motion values, so moving the
 * mouse never re-renders React.
 */

const EASE = [0.22, 1, 0.36, 1] as const;

type NavigatorExtras = Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };

/** True when decorative motion should be skipped. Starts true so the server and first paint agree. */
export function useCalmMotion() {
  const reduced = useReducedMotion();
  const [calm, setCalm] = useState(true);
  useEffect(() => {
    const nav = navigator as NavigatorExtras;
    const weak =
      (nav.hardwareConcurrency !== undefined && nav.hardwareConcurrency <= 4) ||
      (nav.deviceMemory !== undefined && nav.deviceMemory <= 4) ||
      nav.connection?.saveData === true;
    setCalm(Boolean(reduced) || weak);
  }, [reduced]);
  return calm;
}

/** A fine pointer that can hover: a mouse or trackpad, not a finger. */
function useFinePointer() {
  const [fine, setFine] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setFine(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return fine;
}

/* ───────────────────────── Headline ───────────────────────── */

/** Words rise into place one after another. Static for reduced motion. */
export function RiseText({ text, className, delay = 0 }: { text: string; className?: string; delay?: number }) {
  const reduced = useReducedMotion();
  const words = text.split(" ");
  // One tree for server and client: switching markup on reduced motion would
  // not match the server HTML. Reduced motion just skips the travel.
  return (
    <span className={className}>
      {words.map((word, index) => (
        <span key={`${word}-${index}`} className="inline-block overflow-hidden pb-[0.12em] align-bottom">
          <m.span
            className="inline-block"
            initial={{ y: "105%" }}
            animate={{ y: "0%" }}
            transition={reduced ? { duration: 0 } : { duration: 0.9, ease: EASE, delay: delay + index * 0.07 }}
          >
            {word}
            {index < words.length - 1 ? " " : ""}
          </m.span>
        </span>
      ))}
    </span>
  );
}

/** Fades content up after the headline. */
export function FadeUp({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const reduced = useReducedMotion();
  return (
    <m.div className={className} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={reduced ? { duration: 0 } : { duration: 0.8, ease: EASE, delay }}>
      {children}
    </m.div>
  );
}

/* ───────────────────────── Hero stage ───────────────────────── */

/**
 * The layered device composition. The pointer tilts the whole stage a few
 * degrees and moves each layer by its depth; on touch, low-power or
 * reduced-motion devices it simply sits still.
 */
export function HeroStage({ layers }: { layers: { node: ReactNode; depth: number; className: string }[] }) {
  const calm = useCalmMotion();
  const fine = useFinePointer();
  const live = fine && !calm;
  const ref = useRef<HTMLDivElement>(null);
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 80, damping: 18, mass: 0.6 });
  const sy = useSpring(py, { stiffness: 80, damping: 18, mass: 0.6 });
  const rotateY = useTransform(sx, [-1, 1], [-7, 7]);
  const rotateX = useTransform(sy, [-1, 1], [5, -5]);

  useEffect(() => {
    if (!live) return;
    const onMove = (event: PointerEvent) => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      px.set((event.clientX / w) * 2 - 1);
      py.set((event.clientY / h) * 2 - 1);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [live, px, py]);

  return (
    <div ref={ref} className="relative h-full w-full [perspective:1600px]">
      <m.div
        className="relative h-full w-full [transform-style:preserve-3d]"
        style={live ? { rotateX, rotateY } : undefined}
        initial={calm ? false : { opacity: 0, y: 40, rotateX: 12 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 1.2, ease: EASE, delay: 0.25 }}
      >
        {layers.map((layer, index) => (
          <Layer key={index} depth={layer.depth} className={layer.className} sx={sx} sy={sy} live={live}>
            {layer.node}
          </Layer>
        ))}
      </m.div>
    </div>
  );
}

function Layer({
  depth,
  className,
  sx,
  sy,
  live,
  children,
}: {
  depth: number;
  className: string;
  sx: ReturnType<typeof useSpring>;
  sy: ReturnType<typeof useSpring>;
  live: boolean;
  children: ReactNode;
}) {
  const x = useTransform(sx, [-1, 1], [-depth * 14, depth * 14]);
  const y = useTransform(sy, [-1, 1], [-depth * 10, depth * 10]);
  return (
    <m.div className={cn("absolute", className)} style={live ? { x, y } : undefined}>
      {children}
    </m.div>
  );
}

/* ───────────────────────── Magnetic link ───────────────────────── */

type MagneticProps = {
  href: string;
  children: ReactNode;
  className?: string;
  external?: boolean;
  "aria-label"?: string;
};

/**
 * A call-to-action that leans a few pixels towards the pointer. A real link in
 * every case: keyboard, touch and screen readers get an ordinary anchor.
 */
export function MagneticLink({ href, children, className, external, ...rest }: MagneticProps) {
  const calm = useCalmMotion();
  const fine = useFinePointer();
  const live = fine && !calm;
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 15, mass: 0.3 });
  const sy = useSpring(y, { stiffness: 220, damping: 15, mass: 0.3 });

  const onMove = (event: React.PointerEvent<HTMLElement>) => {
    if (!live) return;
    const rect = event.currentTarget.getBoundingClientRect();
    x.set((event.clientX - rect.left - rect.width / 2) * 0.22);
    y.set((event.clientY - rect.top - rect.height / 2) * 0.32);
  };
  const reset = () => {
    x.set(0);
    y.set(0);
  };

  const inner = (
    <m.span className="inline-flex items-center gap-2" style={live ? { x: sx, y: sy } : undefined}>
      {children}
    </m.span>
  );

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className} onPointerMove={onMove} onPointerLeave={reset} data-cursor="magnetic" {...rest}>
        {inner}
      </a>
    );
  }
  return (
    <Link href={href} className={className} onPointerMove={onMove} onPointerLeave={reset} data-cursor="magnetic" {...rest}>
      {inner}
    </Link>
  );
}

/* ───────────────────────── Cursor halo ───────────────────────── */

/**
 * A soft ring that follows the pointer on desktop and grows, with a label,
 * over project cards. It never replaces the system cursor, takes no pointer
 * events and is hidden from assistive technology, so it cannot get in the way
 * of clicking, selecting text or navigating.
 */
export function CursorHalo() {
  const calm = useCalmMotion();
  const fine = useFinePointer();
  const live = fine && !calm;
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const sx = useSpring(x, { stiffness: 500, damping: 40, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 500, damping: 40, mass: 0.4 });
  const [label, setLabel] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!live) return;
    const onMove = (event: PointerEvent) => {
      x.set(event.clientX);
      y.set(event.clientY);
      setVisible(true);
      const target = (event.target as HTMLElement | null)?.closest<HTMLElement>("[data-cursor]");
      const text = target?.dataset.cursor;
      setLabel(text && text !== "magnetic" ? text : null);
    };
    const onLeave = () => setVisible(false);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, [live, x, y]);

  if (!live) return null;
  return (
    <m.div
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-[60] hidden lg:block"
      style={{ x: sx, y: sy }}
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="-translate-x-1/2 -translate-y-1/2">
        <m.div
          className="flex h-[88px] w-[88px] items-center justify-center rounded-full border border-[var(--dc-blue-bright)]/40 text-[11px] font-bold uppercase tracking-[0.14em] text-white"
          initial={false}
          animate={{ scale: label ? 1 : 0.34, backgroundColor: label ? "rgba(1,46,123,0.9)" : "rgba(255,255,255,0.08)" }}
          transition={{ type: "spring", stiffness: 300, damping: 26 }}
        >
          <m.span initial={false} animate={{ opacity: label ? 1 : 0 }} transition={{ duration: 0.15 }}>
            {label ?? ""}
          </m.span>
        </m.div>
      </div>
    </m.div>
  );
}
