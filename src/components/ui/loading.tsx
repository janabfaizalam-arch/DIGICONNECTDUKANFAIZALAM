import type { ReactNode } from "react";
import Image from "next/image";
import { LoaderCircle } from "lucide-react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ButtonSpinnerProps = {
  className?: string;
};

export function ButtonSpinner({ className }: ButtonSpinnerProps) {
  return (
    <span className={cn("relative inline-flex h-5 w-5 shrink-0 items-center justify-center", className)} aria-hidden="true">
      <span className="absolute h-full w-full rounded-full bg-gradient-to-r from-blue-600 via-sky-500 to-orange-500 opacity-35 motion-safe:animate-ping motion-reduce:animate-none" />
      <LoaderCircle className="relative h-full w-full animate-spin text-current motion-reduce:animate-none" />
    </span>
  );
}

export function PageLoader({ label = "Loading DigiConnect Dukan" }: { label?: string }) {
  return (
    <div className="container-shell flex min-h-[60vh] items-center justify-center py-14" role="status" aria-live="polite" aria-label={label}>
      <div className="glass-panel flex w-full max-w-sm flex-col items-center rounded-[1.75rem] border border-white/20 px-6 py-8 text-center">
        <Image
          src="/logo-navbar.png"
          alt="DigiConnect Dukan Logo"
          width={220}
          height={94}
          priority
          className="h-auto w-44 object-contain motion-safe:animate-logo-load md:w-52"
        />
        <div className="mt-5 h-1.5 w-40 overflow-hidden rounded-full bg-blue-100">
          <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-blue-700 to-orange-500 motion-safe:animate-[loading-slide_1.15s_ease-in-out_infinite] motion-reduce:animate-none" />
        </div>
        <p className="mt-4 text-sm font-bold text-slate-700">{label}</p>
      </div>
    </div>
  );
}

export function LoadingOverlay({ show, label = "Please wait...", children }: { show: boolean; label?: string; children?: ReactNode }) {
  return (
    <div className="relative">
      {children}
      {show ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-[inherit] bg-white/72 backdrop-blur-sm" role="status" aria-live="polite">
          <div className="glass-panel flex items-center gap-3 rounded-2xl border border-white/25 px-4 py-3 text-sm font-bold text-slate-800 shadow-soft">
            <ButtonSpinner className="text-blue-700" />
            {label}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function SkeletonCard({ className, rows = 3 }: { className?: string; rows?: number }) {
  return (
    <div className={cn("rounded-2xl border border-white/25 bg-white/60 p-4 shadow-soft", className)} aria-hidden="true">
      <div className="h-10 w-10 rounded-2xl bg-slate-200 motion-safe:animate-pulse" />
      <div className="mt-4 h-4 w-2/3 rounded-full bg-slate-200 motion-safe:animate-pulse" />
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className={cn("mt-3 h-3 rounded-full bg-slate-200 motion-safe:animate-pulse", index === rows - 1 ? "w-1/2" : "w-full")}
        />
      ))}
    </div>
  );
}

type FormSubmitButtonProps = ButtonProps & {
  loading?: boolean;
  loadingText?: string;
  icon?: ReactNode;
};

export function FormSubmitButton({
  loading = false,
  loadingText = "Please wait...",
  icon,
  children,
  disabled,
  ...props
}: FormSubmitButtonProps) {
  return (
    <Button type="submit" disabled={disabled || loading} aria-busy={loading} {...props}>
      {loading ? <ButtonSpinner /> : icon}
      {loading ? loadingText : children}
    </Button>
  );
}
