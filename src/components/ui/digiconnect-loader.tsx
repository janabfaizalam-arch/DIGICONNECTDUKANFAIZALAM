/**
 * DigiConnect Dukan — five-square branded loader.
 * Size variants use dedicated CSS variables (not transform scale) to avoid blur.
 */

import { cn } from "@/lib/utils";
import styles from "./digiconnect-loader.module.css";

export type DigiConnectLoaderProps = {
  size?: "xs" | "sm" | "md" | "lg";
  variant?: "inline" | "section" | "fullscreen";
  label?: string;
  showLabel?: boolean;
  className?: string;
};

const SIZE_CLASS: Record<NonNullable<DigiConnectLoaderProps["size"]>, string> = {
  xs: styles.sizeXs,
  sm: styles.sizeSm,
  md: styles.sizeMd,
  lg: styles.sizeLg,
};

export function DigiConnectLoader({
  size = "md",
  variant = "section",
  label = "Loading DigiConnect Dukan...",
  showLabel = variant !== "inline",
  className,
}: DigiConnectLoaderProps) {
  const squares = (
    <span className={cn(styles.board, SIZE_CLASS[size])} aria-hidden="true">
      <span className={styles.square} />
      <span className={styles.square} />
      <span className={styles.square} />
      <span className={styles.square} />
      <span className={styles.square} />
    </span>
  );

  if (variant === "inline") {
    return (
      <span
        className={cn(styles.inline, className)}
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        {squares}
        <span className={styles.srOnly}>{label}</span>
      </span>
    );
  }

  if (variant === "fullscreen") {
    return (
      <div
        className={cn(styles.fullscreen, className)}
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <div className={styles.fullscreenInner}>
          {squares}
          {showLabel ? <p className={styles.label}>{label}</p> : <span className={styles.srOnly}>{label}</span>}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(styles.section, className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      {squares}
      {showLabel ? <p className={styles.label}>{label}</p> : <span className={styles.srOnly}>{label}</span>}
    </div>
  );
}
