"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

type QuickActionCardProps = {
  href: string;
  label: string;
  description?: string;
  icon: ReactNode;
  className?: string;
};

export function QuickActionCard({ href, label, description, icon, className }: QuickActionCardProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div whileTap={reduceMotion ? undefined : { scale: 0.98 }} transition={{ duration: 0.15 }}>
      <Link
        href={href}
        className={cn(
          "group flex h-full min-h-[88px] flex-col justify-between rounded-[20px] border border-white/70 bg-white/65 p-3.5 shadow-[0_10px_30px_rgba(15,23,42,0.05)] backdrop-blur-xl ring-1 ring-slate-900/[0.03] transition duration-200",
          "hover:border-indigo-200/80 hover:bg-white hover:shadow-[0_14px_36px_rgba(79,70,229,0.10)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2",
          className,
        )}
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 transition group-hover:bg-indigo-600 group-hover:text-white">
          {icon}
        </div>
        <div className="mt-3 space-y-0.5">
          <p className="text-sm font-bold text-slate-900">{label}</p>
          {description ? <p className="text-[11px] font-medium leading-snug text-slate-500">{description}</p> : null}
        </div>
      </Link>
    </motion.div>
  );
}
