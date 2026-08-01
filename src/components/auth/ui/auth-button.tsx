"use client";

import { Check } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";

import { DigiConnectLoader } from "@/components/ui/digiconnect-loader";
import { cn } from "@/lib/utils";

type Ripple = { id: number; x: number; y: number; size: number };
type Status = "idle" | "success" | "error";

type AuthButtonProps = {
  children: ReactNode;
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  loadingText?: string;
  /** Morph the button into a success/error state momentarily. */
  status?: Status;
  variant?: "primary" | "neutral" | "ghost";
  className?: string;
};

/**
 * Large premium button: magnetic press, ripple on tap, spinner morph while
 * loading, and success/error morph. Transform/opacity animations only.
 */
export function AuthButton({
  children,
  type = "button",
  onClick,
  disabled,
  loading = false,
  loadingText,
  status = "idle",
  variant = "primary",
  className,
}: AuthButtonProps) {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const seed = useRef(0);

  function spawnRipple(event: React.PointerEvent<HTMLButtonElement>) {
    if (disabled || loading) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const id = seed.current++;
    setRipples((current) => [
      ...current,
      { id, x: event.clientX - rect.left - size / 2, y: event.clientY - rect.top - size / 2, size },
    ]);
    window.setTimeout(() => {
      setRipples((current) => current.filter((r) => r.id !== id));
    }, 600);
  }

  const isBusy = loading || status !== "idle";

  const base =
    "group relative inline-flex h-[54px] w-full items-center justify-center gap-2 overflow-hidden rounded-2xl px-5 text-sm font-bold tracking-wide outline-none transition-[transform,box-shadow,background-color] duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 motion-safe:active:scale-[0.98] md:motion-safe:hover:-translate-y-0.5";

  const variantClass =
    status === "success"
      ? "bg-emerald-600 text-white shadow-[0_10px_30px_rgba(16,185,129,0.35)]"
      : status === "error"
        ? "bg-rose-600 text-white shadow-[0_10px_30px_rgba(244,63,94,0.30)]"
        : variant === "primary"
          ? "bg-gradient-to-br from-[#2563EB] to-[#4F46E5] text-white shadow-[0_10px_30px_rgba(37,99,235,0.28)] md:hover:shadow-[0_16px_40px_rgba(37,99,235,0.36)]"
          : variant === "neutral"
            ? "border border-slate-200 bg-white/80 text-slate-900 shadow-sm md:hover:bg-white"
            : "text-blue-700 hover:bg-blue-50/70";

  return (
    <button
      type={type}
      onClick={onClick}
      onPointerDown={spawnRipple}
      disabled={disabled || isBusy}
      aria-busy={loading}
      className={cn(base, variantClass, className)}
    >
      {ripples.map((r) => (
        <span
          key={r.id}
          aria-hidden
          className="auth-ripple-dot pointer-events-none absolute rounded-full bg-white/40"
          style={{ left: r.x, top: r.y, width: r.size, height: r.size }}
        />
      ))}

      {status === "success" ? (
        <Check className="auth-pop-in h-5 w-5" strokeWidth={3} />
      ) : loading ? (
        <DigiConnectLoader
          variant="inline"
          size="sm"
          label={loadingText || "Loading..."}
          showLabel={false}
        />
      ) : null}
      <span className="relative">{loading && loadingText ? loadingText : children}</span>
    </button>
  );
}
