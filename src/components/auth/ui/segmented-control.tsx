"use client";

import { motion, useReducedMotion } from "framer-motion";

import { springSnappy } from "@/components/auth/ui/motion";
import { cn } from "@/lib/utils";

export type SegmentedOption<T extends string> = {
  value: T;
  label: string;
  icon?: React.ReactNode;
};

type SegmentedControlProps<T extends string> = {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  "aria-label"?: string;
};

/** Animated pill segmented control (Customer / Partner / Admin, or sub-modes). */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  disabled,
  "aria-label": ariaLabel,
}: SegmentedControlProps<T>) {
  const reduceMotion = useReducedMotion();

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="grid gap-1 rounded-2xl border border-white/60 bg-slate-100/70 p-1 backdrop-blur-sm"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative flex min-h-10 items-center justify-center gap-1.5 rounded-xl px-2.5 py-2 text-[13px] font-semibold outline-none transition-colors duration-200",
              "focus-visible:ring-2 focus-visible:ring-blue-500/60 disabled:cursor-not-allowed disabled:opacity-60",
              active ? "text-blue-700" : "text-slate-500 hover:text-slate-800",
            )}
          >
            {active ? (
              <motion.span
                layoutId="segmented-active-pill"
                transition={reduceMotion ? { duration: 0 } : springSnappy}
                className="absolute inset-0 -z-10 rounded-xl border border-white bg-white shadow-[0_2px_10px_rgba(15,23,42,0.08)]"
              />
            ) : null}
            {option.icon ? <span className="shrink-0">{option.icon}</span> : null}
            <span className="truncate">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
