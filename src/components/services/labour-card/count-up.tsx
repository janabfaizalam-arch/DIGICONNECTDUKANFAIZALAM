"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";

/**
 * A number that counts up the first time it is seen.
 *
 * It renders the final value on the server and on the first client paint, and
 * only then starts from zero. That ordering matters: a figure that arrives as
 * "0" in the HTML is what a search engine indexes and what a reader with
 * JavaScript off is left with.
 *
 * Under `prefers-reduced-motion` it never animates at all.
 */
export function CountUp({
  value,
  suffix = "",
  duration = 1100,
}: {
  value: number;
  suffix?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const seen = useInView(ref, { once: true, margin: "-10% 0px" });
  const still = useReducedMotion();
  const [shown, setShown] = useState(value);

  useEffect(() => {
    if (still || !seen) return;

    let frame = 0;
    const started = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - started) / duration);
      // Ease-out: the count slows into its final value rather than stopping dead.
      setShown(Math.round(value * (1 - (1 - progress) ** 3)));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    setShown(0);
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [seen, still, value, duration]);

  return (
    <span ref={ref} className="tabular-nums">
      {shown}
      {suffix}
    </span>
  );
}
