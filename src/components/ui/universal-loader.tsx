import React from "react";

export function UniversalLoader({ label = "Loading DigiConnect Dukan", fullPage = false }: { label?: string; fullPage?: boolean }) {
  const containerClass = fullPage
    ? "fixed inset-0 z-[100] bg-white/80 backdrop-blur-xl flex flex-col items-center justify-center"
    : "w-full min-h-[50vh] flex flex-col items-center justify-center p-6";

  return (
    <div className={containerClass} role="status" aria-live="polite" aria-label={label}>
      <div className="flex flex-col items-center gap-3">
        <div className="relative flex items-center justify-center p-5 rounded-3xl bg-white border border-slate-200/40 shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
          {/* Smooth spinning border ring */}
          <div className="absolute inset-0 rounded-3xl border-2 border-slate-100 border-t-blue-600 border-r-blue-600/30 animate-spin" style={{ animationDuration: '0.8s' }} />
          {/* Small inner pulse spot */}
          <span className="h-3 w-3 rounded-full bg-blue-600 animate-pulse" />
        </div>
        <span className="mt-3.5 text-[10px] font-extrabold uppercase tracking-[0.25em] text-slate-400">
          Please wait
        </span>
      </div>
    </div>
  );
}
