"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type OtpFieldProps = {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
  autoFocus?: boolean;
  error?: string | null;
  onComplete?: (value: string) => void;
};

/**
 * Premium OTP entry: individual boxes with auto-advance, backspace-back,
 * arrow navigation, full paste support, and auto-submit via `onComplete`.
 */
export function OtpField({
  value,
  onChange,
  length = 6,
  disabled,
  autoFocus = true,
  error,
  onComplete,
}: OtpFieldProps) {
  const reduceMotion = useReducedMotion();
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const [shake, setShake] = useState(false);
  const prevError = useRef<string | null | undefined>(error);
  const completedRef = useRef(false);
  const digits = value.padEnd(length, " ").slice(0, length).split("");

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
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

  function setDigit(index: number, char: string) {
    const next = value.split("");
    while (next.length < length) next.push("");
    next[index] = char;
    const joined = next.join("").replace(/\D/g, "").slice(0, length);
    onChange(joined);
    if (char && index < length - 1) refs.current[index + 1]?.focus();
  }

  return (
    <div className="w-full">
      <div
        className={cn("flex justify-between gap-2", shake && "auth-shake")}
        onPaste={(event) => {
          const text = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
          if (!text) return;
          event.preventDefault();
          onChange(text);
          refs.current[Math.min(text.length, length - 1)]?.focus();
        }}
      >
        {Array.from({ length }).map((_, index) => {
          const filled = digits[index] !== " " && digits[index] !== "";
          return (
            <motion.input
              key={index}
              ref={(el) => {
                refs.current[index] = el;
              }}
              inputMode="numeric"
              autoComplete={index === 0 ? "one-time-code" : "off"}
              maxLength={1}
              disabled={disabled}
              aria-label={`Digit ${index + 1}`}
              aria-invalid={error ? true : undefined}
              value={filled ? digits[index] : ""}
              whileFocus={reduceMotion ? undefined : { scale: 1.05 }}
              transition={{ type: "spring", stiffness: 500, damping: 28 }}
              onChange={(event) => setDigit(index, event.target.value.replace(/\D/g, "").slice(-1))}
              onKeyDown={(event) => {
                if (event.key === "Backspace" && !digits[index].trim() && index > 0) {
                  refs.current[index - 1]?.focus();
                } else if (event.key === "ArrowLeft" && index > 0) {
                  refs.current[index - 1]?.focus();
                } else if (event.key === "ArrowRight" && index < length - 1) {
                  refs.current[index + 1]?.focus();
                }
              }}
              className={cn(
                "h-14 w-full min-w-0 rounded-2xl border bg-white/85 text-center text-xl font-bold text-slate-900 outline-none transition-[border-color,box-shadow] duration-200",
                error
                  ? "border-rose-300 focus:border-rose-500 focus:shadow-[0_0_0_4px_rgba(244,63,94,0.12)]"
                  : filled
                    ? "border-blue-300 focus:border-blue-500 focus:shadow-[0_0_0_4px_rgba(37,99,235,0.12)]"
                    : "border-slate-200/90 focus:border-blue-500 focus:shadow-[0_0_0_4px_rgba(37,99,235,0.12)]",
              )}
            />
          );
        })}
      </div>
      {error ? <p className="mt-2 pl-1 text-xs font-semibold text-rose-600">{error}</p> : null}
    </div>
  );
}

/** Circular countdown ring used for OTP resend timers. */
export function CountdownRing({ seconds, total }: { seconds: number; total: number }) {
  const radius = 9;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? seconds / total : 0;
  return (
    <span className="relative inline-flex h-6 w-6 items-center justify-center" aria-hidden>
      <svg className="h-6 w-6 -rotate-90" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r={radius} fill="none" stroke="rgba(148,163,184,0.25)" strokeWidth="2.5" />
        <circle
          cx="12"
          cy="12"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          className="text-blue-500 transition-[stroke-dashoffset] duration-1000 ease-linear"
        />
      </svg>
      <span className="absolute text-[9px] font-bold text-slate-500">{seconds}</span>
    </span>
  );
}
