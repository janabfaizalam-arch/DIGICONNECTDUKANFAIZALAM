import { type HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
  {
    variants: {
      variant: {
        neutral: "border-slate-200 bg-slate-50 text-slate-700",
        success: "border-emerald-200 bg-[var(--success-soft)] text-emerald-700",
        warning: "border-amber-200 bg-[var(--warning-soft)] text-amber-700",
        error: "border-red-200 bg-[var(--error-soft)] text-red-700",
        info: "border-blue-200 bg-[var(--info-soft)] text-blue-700",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
);

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
