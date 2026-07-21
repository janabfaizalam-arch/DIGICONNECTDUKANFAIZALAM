"use client";

import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

import { GlassPanel } from "@/components/ap/ui/glass-panel";
import { cn } from "@/lib/utils";

type MetricCardProps = {
  label: string;
  value: string;
  icon?: ReactNode;
  hint?: string;
  delta?: { label: string; tone: "up" | "down" | "flat" };
  className?: string;
};

export function MetricCard({ label, value, icon, hint, delta, className }: MetricCardProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
    >
      <GlassPanel className={cn("h-full", className)} padding="md">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
            <p className="truncate text-2xl font-extrabold tracking-tight text-slate-950 tabular-nums">{value}</p>
            {delta ? (
              <p
                className={cn(
                  "inline-flex items-center gap-0.5 text-[11px] font-bold",
                  delta.tone === "up" && "text-emerald-600",
                  delta.tone === "down" && "text-rose-600",
                  delta.tone === "flat" && "text-slate-400",
                )}
              >
                {delta.tone === "up" ? <ArrowUpRight className="h-3.5 w-3.5" /> : null}
                {delta.tone === "down" ? <ArrowDownRight className="h-3.5 w-3.5" /> : null}
                {delta.tone === "flat" ? <Minus className="h-3.5 w-3.5" /> : null}
                {delta.label}
                {hint ? <span className="ml-1 font-semibold text-slate-400">{hint}</span> : null}
              </p>
            ) : hint ? (
              <p className="text-[11px] font-semibold text-slate-400">{hint}</p>
            ) : null}
          </div>
          {icon ? (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950/[0.04] text-slate-700">
              {icon}
            </div>
          ) : null}
        </div>
      </GlassPanel>
    </motion.div>
  );
}
