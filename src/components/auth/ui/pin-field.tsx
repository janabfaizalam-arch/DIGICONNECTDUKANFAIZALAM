"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useId, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type PinFieldProps = {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  label?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  error?: string | null;
  onComplete?: (value: string) => void;
};

/**
 * Secure PIN entry rendered as animated circles, backed by a single numeric
 * input so mobile keypad, paste and screen readers all work. Filled circles
 * pop in; the strength bar reflects completion.
 */
export function PinField({
  value,
  onChange,
  length = 6,
  label = "6-digit PIN",
  disabled,
  autoFocus,
  error,
  onComplete,
}: PinFieldProps) {
  const reduceMotion = useReducedMotion();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const [shake, setShake] = useState(false);
  const prevError = useRef<string | null | undefined>(error);
  const completedRef = useRef(false);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    if (error && error !== prevError.current) {
      setShake(true);
      const timer = window.setTimeout(() => setShake(false), 480);
      prevError.current = error;
      return () => window.clearTimeout(timer);
    }
    prevError.current = error;
  }, [error]);

  useEffect(() => {
    if (value.length === length && !completedRef.current) {
      completedRef.current = true;
      onComplete?.(value);
    }
    if (value.length < length) completedRef.current = false;
  }, [value, length, onComplete]);

  const activeIndex = Math.min(value.length, length - 1);

  return (
    <div className="w-full">
      {label ? (
        <label htmlFor={inputId} className="mb-2 block pl-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </label>
      ) : null}

      <div
        role="button"
        tabIndex={-1}
        onClick={() => inputRef.current?.focus()}
        className={cn("relative flex items-center justify-between gap-2", shake && "auth-shake")}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="password"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d*"
          maxLength={length}
          disabled={disabled}
          value={value}
          aria-label={label}
          aria-invalid={error ? true : undefined}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, length))}
          className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
        />
        {Array.from({ length }).map((_, index) => {
          const filled = index < value.length;
          const isActive = focused && index === activeIndex && !disabled;
          return (
            <div
              key={index}
              className={cn(
                "flex h-13 flex-1 items-center justify-center rounded-2xl border bg-white/85 transition-[border-color,box-shadow,background-color] duration-200",
                "h-[52px]",
                error
                  ? "border-rose-300"
                  : isActive
                    ? "border-blue-500 shadow-[0_0_0_4px_rgba(37,99,235,0.12)]"
                    : filled
                      ? "border-slate-300"
                      : "border-slate-200/90",
              )}
            >
              {filled ? (
                <motion.span
                  initial={reduceMotion ? false : { scale: 0.2, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 26 }}
                  className={cn("h-2.5 w-2.5 rounded-full", error ? "bg-rose-500" : "bg-slate-800")}
                />
              ) : (
                <span className={cn("h-2.5 w-2.5 rounded-full", isActive ? "bg-blue-200" : "bg-slate-200")} />
              )}
            </div>
          );
        })}
      </div>

      {/* Completion strength bar */}
      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-slate-100">
        <motion.div
          initial={false}
          animate={{ width: `${(value.length / length) * 100}%` }}
          transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 30 }}
          className={cn("h-full rounded-full", error ? "bg-rose-400" : value.length === length ? "bg-emerald-500" : "bg-blue-500")}
        />
      </div>

      {error ? <p className="mt-1.5 pl-1 text-xs font-semibold text-rose-600">{error}</p> : null}
    </div>
  );
}
