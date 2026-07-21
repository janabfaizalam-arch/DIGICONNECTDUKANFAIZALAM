import type { Transition, Variants } from "framer-motion";

/**
 * Shared, GPU-friendly motion vocabulary for the auth experience.
 * Everything animates transform/opacity only. Consumers should pair these
 * with framer-motion's `useReducedMotion()` and fall back to `staticVariants`.
 */

export const easeOutExpo: Transition["ease"] = [0.16, 1, 0.3, 1];
export const springSoft: Transition = { type: "spring", stiffness: 380, damping: 30 };
export const springSnappy: Transition = { type: "spring", stiffness: 500, damping: 32 };

/** Container that staggers its children on mount. */
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.05 },
  },
};

/** Individual item: fade + subtle rise + de-blur. */
export const revealItem: Variants = {
  hidden: { opacity: 0, y: 14, filter: "blur(6px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.5, ease: easeOutExpo },
  },
};

/** Floating glass card entrance. */
export const cardReveal: Variants = {
  hidden: { opacity: 0, y: 26, scale: 0.97, filter: "blur(10px)" },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: { duration: 0.6, ease: easeOutExpo },
  },
};

/** Step/panel crossfade for multi-step flows. */
export const stepTransition: Variants = {
  hidden: { opacity: 0, x: 24 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.32, ease: easeOutExpo } },
  exit: { opacity: 0, x: -24, transition: { duration: 0.22, ease: easeOutExpo } },
};

/** Static fallbacks used when the user prefers reduced motion. */
export const staticVariants: Variants = {
  hidden: { opacity: 1 },
  visible: { opacity: 1, transition: { staggerChildren: 0 } },
  exit: { opacity: 1 },
};
