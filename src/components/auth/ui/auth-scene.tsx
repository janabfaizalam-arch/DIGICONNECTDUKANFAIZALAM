"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, type ReactNode } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";

import { cardReveal, revealItem, staggerContainer, staticVariants } from "@/components/auth/ui/motion";
import { cn } from "@/lib/utils";

const TAGLINE = "Connecting People. Empowering Digital India.";

type AuthSceneProps = {
  children: ReactNode;
  /** Small uppercase label shown above the card, e.g. "Secure Access". */
  eyebrow?: string;
  /** Max width of the card column. */
  className?: string;
};

/**
 * Full-viewport Apple-style liquid-glass backdrop with a floating brand bar.
 * The animated layers are decorative (aria-hidden) and fully disabled under
 * `prefers-reduced-motion`. Children are expected to be a `GlassCard`.
 */
export function AuthScene({ children, eyebrow, className }: AuthSceneProps) {
  const reduceMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);

  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const px = useSpring(pointerX, { stiffness: 120, damping: 24 });
  const py = useSpring(pointerY, { stiffness: 120, damping: 24 });

  const blobAX = useTransform(px, [-1, 1], [-26, 26]);
  const blobAY = useTransform(py, [-1, 1], [-20, 20]);
  const blobBX = useTransform(px, [-1, 1], [22, -22]);
  const blobBY = useTransform(py, [-1, 1], [18, -18]);
  const cardTiltX = useTransform(py, [-1, 1], [1.5, -1.5]);
  const cardTiltY = useTransform(px, [-1, 1], [-1.5, 1.5]);

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (reduceMotion || event.pointerType === "touch") return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    pointerX.set(((event.clientX - rect.left) / rect.width) * 2 - 1);
    pointerY.set(((event.clientY - rect.top) / rect.height) * 2 - 1);
  }

  const variants = reduceMotion ? staticVariants : staggerContainer;

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      className="relative flex min-h-[100dvh] w-full flex-col overflow-hidden bg-[#f6f8fc]"
    >
      {/* Base radial wash */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(120% 90% at 50% -10%, rgba(37,99,235,0.10), transparent 55%)," +
            "radial-gradient(90% 70% at 100% 110%, rgba(249,115,22,0.08), transparent 55%)," +
            "#f6f8fc",
        }}
      />

      {/* Drifting aurora mesh */}
      <div
        aria-hidden
        className="auth-aurora pointer-events-none absolute -inset-[20%] z-0 opacity-70"
        style={{
          background:
            "radial-gradient(28% 32% at 22% 28%, rgba(59,130,246,0.28), transparent 60%)," +
            "radial-gradient(26% 30% at 78% 24%, rgba(168,85,247,0.20), transparent 60%)," +
            "radial-gradient(30% 34% at 68% 82%, rgba(16,185,129,0.16), transparent 60%)",
          filter: "blur(60px)",
        }}
      />

      {/* Floating glass blobs with mouse parallax */}
      <motion.div
        aria-hidden
        style={{ x: blobAX, y: blobAY }}
        className="pointer-events-none absolute left-[8%] top-[14%] z-0 h-72 w-72 rounded-full"
      >
        <div className="auth-blob h-full w-full rounded-full bg-blue-400/20 blur-3xl" />
      </motion.div>
      <motion.div
        aria-hidden
        style={{ x: blobBX, y: blobBY }}
        className="pointer-events-none absolute bottom-[10%] right-[10%] z-0 h-80 w-80 rounded-full"
      >
        <div className="auth-blob auth-blob-delay h-full w-full rounded-full bg-orange-300/20 blur-3xl" />
      </motion.div>

      {/* Ambient rising particles */}
      {!reduceMotion ? (
        <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
          {PARTICLES.map((p, i) => (
            <span
              key={i}
              className="auth-particle absolute rounded-full bg-white/70 shadow-[0_0_8px_rgba(255,255,255,0.6)]"
              style={{
                left: p.left,
                bottom: "-6px",
                width: p.size,
                height: p.size,
                animationDelay: p.delay,
                animationDuration: p.duration,
              }}
            />
          ))}
        </div>
      ) : null}

      {/* Fine grain noise */}
      <div aria-hidden className="noise-bg pointer-events-none absolute inset-0 z-0" />

      {/* Brand bar */}
      <motion.header
        initial={reduceMotion ? false : { opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex items-center justify-between px-5 py-5 sm:px-8"
      >
        <Link href="/" className="group flex items-center gap-2.5" aria-label="DigiConnect Dukan home">
          <Image
            src="/logo-navbar.png"
            alt=""
            width={128}
            height={40}
            priority
            className="h-7 w-auto object-contain transition-transform duration-300 group-hover:scale-[1.03] sm:h-8"
          />
        </Link>
        <span className="hidden text-right text-[11px] font-semibold leading-tight text-slate-500 sm:block">
          {TAGLINE}
        </span>
      </motion.header>

      {/* Centered card column */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-2 sm:pt-4">
        <motion.div
          variants={variants}
          initial="hidden"
          animate="visible"
          style={reduceMotion ? undefined : { rotateX: cardTiltX, rotateY: cardTiltY, transformPerspective: 1200 }}
          className={cn("w-full max-w-[420px]", className)}
        >
          {eyebrow ? (
            <motion.p
              variants={reduceMotion ? staticVariants : revealItem}
              className="mb-3 text-center text-[11px] font-bold uppercase tracking-[0.22em] text-blue-600/80"
            >
              {eyebrow}
            </motion.p>
          ) : null}

          <motion.div variants={reduceMotion ? staticVariants : cardReveal}>{children}</motion.div>

          <motion.p
            variants={reduceMotion ? staticVariants : revealItem}
            className="mt-6 text-center text-[11px] font-medium text-slate-400"
          >
            Powered by <span className="font-semibold text-slate-500">RNoS India Pvt. Ltd.</span>
          </motion.p>
        </motion.div>
      </main>
    </div>
  );
}

const PARTICLES = [
  { left: "12%", size: "5px", delay: "0s", duration: "9s" },
  { left: "26%", size: "3px", delay: "2.5s", duration: "11s" },
  { left: "43%", size: "4px", delay: "1.2s", duration: "8.5s" },
  { left: "61%", size: "3px", delay: "3.4s", duration: "12s" },
  { left: "74%", size: "5px", delay: "0.8s", duration: "10s" },
  { left: "88%", size: "3px", delay: "2s", duration: "9.5s" },
];
