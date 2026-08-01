import type { ReactNode } from "react";
import Image from "next/image";

import { DigiConnectLoader } from "@/components/ui/digiconnect-loader";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ButtonSpinnerProps = {
  className?: string;
  label?: string;
  size?: "xs" | "sm";
};

/** Compact DigiConnect loader for buttons and inline controls. */
export function ButtonSpinner({ className, label = "Loading...", size = "sm" }: ButtonSpinnerProps) {
  return (
    <span className={cn("inline-flex shrink-0 items-center justify-center", className)}>
      <DigiConnectLoader variant="inline" size={size} label={label} showLabel={false} />
    </span>
  );
}

export function PageLoader({ label = "Loading DigiConnect Dukan..." }: { label?: string }) {
  return (
    <div
      className="container-shell flex min-h-[60vh] items-center justify-center py-14"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
    >
      <div className="glass-panel flex w-full max-w-sm flex-col items-center rounded-[1.75rem] border border-white/20 px-6 py-8 text-center">
        <Image
          src="/logo-navbar.png"
          alt="DigiConnect Dukan Logo"
          width={220}
          height={94}
          priority
          className="h-auto w-44 object-contain md:w-52"
        />
        <div className="mt-6">
          <DigiConnectLoader variant="section" size="md" label={label} showLabel={false} className="!min-h-0 !p-0" />
        </div>
        <p className="mt-4 text-sm font-bold text-slate-700">{label}</p>
      </div>
    </div>
  );
}

export function LoadingOverlay({
  show,
  label = "Please wait...",
  children,
}: {
  show: boolean;
  label?: string;
  children?: ReactNode;
}) {
  return (
    <div className="relative">
      {children}
      {show ? (
        <div
          className="absolute inset-0 z-20 flex items-center justify-center rounded-[inherit] bg-white/72 backdrop-blur-sm"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="glass-panel flex items-center gap-3 rounded-2xl border border-white/25 px-4 py-3 text-sm font-bold text-slate-800 shadow-soft">
            <DigiConnectLoader variant="inline" size="sm" label={label} showLabel={false} />
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
  isLoading,
  loadingText = "Please wait...",
  icon,
  children,
  disabled,
  ...props
}: FormSubmitButtonProps) {
  const busy = Boolean(loading || isLoading);
  return (
    <Button
      type="submit"
      disabled={disabled || busy}
      isLoading={busy}
      loadingText={loadingText}
      aria-busy={busy}
      {...props}
    >
      {!busy && icon ? (
        <>
          {icon}
          {children}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
