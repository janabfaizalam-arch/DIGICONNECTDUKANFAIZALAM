import { type HTMLAttributes, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const alertVariants = cva("flex items-start gap-3 rounded-2xl border p-4 text-sm", {
  variants: {
    variant: {
      info: "border-blue-200 bg-[var(--info-soft)] text-blue-900",
      success: "border-emerald-200 bg-[var(--success-soft)] text-emerald-900",
      warning: "border-amber-200 bg-[var(--warning-soft)] text-amber-900",
      error: "border-red-200 bg-[var(--error-soft)] text-red-900",
    },
  },
  defaultVariants: {
    variant: "info",
  },
});

const alertIcons = {
  info: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
  error: AlertCircle,
} as const;

export interface AlertProps extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof alertVariants> {
  title?: string;
  children?: ReactNode;
}

export function Alert({ className, variant = "info", title, children, ...props }: AlertProps) {
  const Icon = alertIcons[variant ?? "info"];

  return (
    <div role={variant === "error" ? "alert" : "status"} className={cn(alertVariants({ variant }), className)} {...props}>
      <Icon className="mt-0.5 h-4.5 w-4.5 shrink-0" aria-hidden />
      <div className="min-w-0">
        {title ? <p className="font-bold">{title}</p> : null}
        {children ? <div className={cn(title && "mt-1", "leading-relaxed")}>{children}</div> : null}
      </div>
    </div>
  );
}
