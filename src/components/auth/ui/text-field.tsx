"use client";

import { Eye, EyeOff } from "lucide-react";
import { forwardRef, useEffect, useId, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type BaseProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "className"> & {
  label: string;
  icon?: React.ReactNode;
  error?: string | null;
  success?: boolean;
  hint?: string;
  /** Renders a show/hide toggle and manages type between password/text. */
  secure?: boolean;
  /** Content pinned to the left before the input (e.g. "+91"). Takes priority over icon. */
  prefix?: React.ReactNode;
  inputClassName?: string;
  containerClassName?: string;
};

/**
 * Premium floating-label input with icon, live validation ring, shake-on-error,
 * and optional secure (password) visibility toggle. Fully keyboard/SR friendly.
 */
export const TextField = forwardRef<HTMLInputElement, BaseProps>(function TextField(
  { label, icon, error, success, hint, secure, prefix, type = "text", id, inputClassName, containerClassName, ...props },
  ref,
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const [revealed, setRevealed] = useState(false);
  const [shake, setShake] = useState(false);
  const prevError = useRef<string | null | undefined>(error);

  useEffect(() => {
    if (error && error !== prevError.current) {
      setShake(true);
      const timer = window.setTimeout(() => setShake(false), 480);
      prevError.current = error;
      return () => window.clearTimeout(timer);
    }
    prevError.current = error;
  }, [error]);

  const resolvedType = secure ? (revealed ? "text" : "password") : type;
  const describedBy = error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined;
  const showIcon = Boolean(icon) && !prefix;

  const stateRing = error
    ? "border-rose-300 focus-within:border-rose-500 focus-within:shadow-[0_0_0_4px_rgba(244,63,94,0.12)]"
    : success
      ? "border-emerald-300 focus-within:border-emerald-500 focus-within:shadow-[0_0_0_4px_rgba(16,185,129,0.12)]"
      : "border-slate-200/90 focus-within:border-blue-500 focus-within:shadow-[0_0_0_4px_rgba(37,99,235,0.12)]";

  return (
    <div className={cn("w-full", containerClassName)}>
      <div
        className={cn(
          "relative flex items-center rounded-2xl border bg-white/85 transition-[border-color,box-shadow] duration-200",
          stateRing,
          shake && "auth-shake",
        )}
      >
        {showIcon ? (
          <span className="pointer-events-none absolute left-4 top-1/2 z-[1] -translate-y-1/2 text-slate-400" aria-hidden>
            {icon}
          </span>
        ) : null}

        {prefix ? <span className="select-none pl-4 pr-1 text-[15px] font-semibold text-slate-500">{prefix}</span> : null}

        {/* Inner wrapper keeps the floating label anchored to the input, not the adornments. */}
        <div className="relative flex-1">
          <input
            ref={ref}
            id={fieldId}
            type={resolvedType}
            placeholder=" "
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={cn(
              "auth-field-caret peer h-[58px] w-full rounded-2xl bg-transparent pb-[8px] pt-[22px] text-[15px] text-slate-900 outline-none placeholder:text-transparent",
              showIcon ? "pl-11" : prefix ? "pl-1" : "pl-4",
              secure ? "pr-11" : "pr-4",
              inputClassName,
            )}
            {...props}
          />
          <label
            htmlFor={fieldId}
            className={cn(
              "pointer-events-none absolute top-1/2 -translate-y-1/2 select-none text-[15px] font-medium text-slate-400 transition-all duration-150",
              "peer-focus:top-[15px] peer-focus:-translate-y-0 peer-focus:text-[11px] peer-focus:font-semibold",
              "peer-[:not(:placeholder-shown)]:top-[15px] peer-[:not(:placeholder-shown)]:-translate-y-0 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:font-semibold",
              showIcon ? "left-11" : prefix ? "left-1" : "left-4",
              error ? "peer-focus:text-rose-500" : success ? "peer-focus:text-emerald-600" : "peer-focus:text-blue-600",
            )}
          >
            {label}
          </label>
        </div>

        {secure ? (
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            aria-label={revealed ? "Hide" : "Show"}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 outline-none transition hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        ) : null}
      </div>

      {error ? (
        <p id={`${fieldId}-error`} className="mt-1.5 pl-1 text-xs font-semibold text-rose-600">
          {error}
        </p>
      ) : hint ? (
        <p id={`${fieldId}-hint`} className="mt-1.5 pl-1 text-xs font-medium text-slate-400">
          {hint}
        </p>
      ) : null}
    </div>
  );
});

/** +91-prefixed Indian mobile field built on TextField. */
export const PhoneField = forwardRef<HTMLInputElement, Omit<BaseProps, "prefix" | "type">>(function PhoneField(
  { icon: _icon, ...props },
  ref,
) {
  void _icon; // phone fields use the +91 prefix as the sole left adornment
  return <TextField ref={ref} type="tel" inputMode="numeric" prefix="+91" {...props} />;
});
