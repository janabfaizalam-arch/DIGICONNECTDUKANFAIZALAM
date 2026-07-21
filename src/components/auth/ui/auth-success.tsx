"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

/**
 * Rewarding success state: animated glass check, message, minimal confetti,
 * and a redirect countdown. Purely presentational — the caller performs the
 * actual navigation via `onDone` / its own redirect.
 */
export function AuthSuccess({
  title = "Success",
  message,
  redirectSeconds = 2,
}: {
  title?: string;
  message?: string;
  redirectSeconds?: number;
}) {
  const reduceMotion = useReducedMotion();
  const [remaining, setRemaining] = useState(redirectSeconds);

  useEffect(() => {
    if (remaining <= 0) return;
    const timer = window.setTimeout(() => setRemaining((s) => s - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [remaining]);

  return (
    <div className="flex flex-col items-center gap-4 py-6 text-center" role="status" aria-live="polite">
      <div className="relative">
        {!reduceMotion
          ? CONFETTI.map((c, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 0, x: 0, scale: 0.5 }}
                animate={{ opacity: [0, 1, 0], y: c.y, x: c.x, scale: 1 }}
                transition={{ duration: 0.9, delay: 0.15, ease: "easeOut" }}
                className="absolute left-1/2 top-1/2 h-2 w-2 rounded-[2px]"
                style={{ backgroundColor: c.color }}
              />
            ))
          : null}
        <motion.div
          initial={reduceMotion ? false : { scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 320, damping: 20 }}
          className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 ring-1 ring-emerald-200"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 shadow-[0_10px_30px_rgba(16,185,129,0.4)]">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                className="auth-check-path"
                d="M5 13l4 4L19 7"
                stroke="white"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </motion.div>
      </div>

      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold text-slate-900">{title}</h2>
        {message ? <p className="text-sm font-medium text-slate-500">{message}</p> : null}
      </div>

      {remaining > 0 ? (
        <p className="text-xs font-semibold text-slate-400">Redirecting in {remaining}s…</p>
      ) : null}
    </div>
  );
}

const CONFETTI = [
  { x: -46, y: -40, color: "#2563EB" },
  { x: 44, y: -36, color: "#F97316" },
  { x: -30, y: -56, color: "#10B981" },
  { x: 32, y: -54, color: "#A855F7" },
  { x: 0, y: -62, color: "#3B82F6" },
];
