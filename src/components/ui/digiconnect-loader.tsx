/**
 * DigiConnect Dukan — branded "connect" loader.
 *
 * Echoes the DigiConnect mark: a blue node and an orange node converge and the
 * gradient link draws between them. Size variants use dedicated CSS variables
 * (not transform scale) to avoid blur.
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
  const mark = (
    <span className={cn(styles.mark, SIZE_CLASS[size])} aria-hidden="true">
      <span className={styles.link} />
      <span className={cn(styles.node, styles.nodeLeft)} />
      <span className={cn(styles.node, styles.nodeRight)} />
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
        {mark}
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
          {mark}
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
      {mark}
      {showLabel ? <p className={styles.label}>{label}</p> : <span className={styles.srOnly}>{label}</span>}
    </div>
  );
}
