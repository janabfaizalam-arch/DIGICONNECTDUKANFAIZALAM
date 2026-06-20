// ============================================================
// Credit Module — Constants & Configuration
// DigiConnect Dukan — Powered by RNOS India Pvt. Ltd.
// ============================================================

import type { CreditPackage, ScoreCategory } from "./types";

/** Unifers API configuration */
export const UNIFERS_CONFIG = {
  baseUrl: process.env.UNIFERS_API_BASE_URL || "https://app.unifers.ai/api",
  timeoutMs: 15_000,
  maxRetries: 3,
  retryDelayMs: 1_000,
} as const;

/** Rate limit: max credit checks per user per hour */
export const CREDIT_RATE_LIMIT = {
  maxRequests: 5,
  windowMs: 60 * 60 * 1000, // 1 hour
} as const;

/** Credit score category thresholds */
export const SCORE_THRESHOLDS = {
  poor: { min: 300, max: 549, label: "Poor", color: "red" },
  fair: { min: 550, max: 649, label: "Fair", color: "orange" },
  good: { min: 650, max: 749, label: "Good", color: "blue" },
  excellent: { min: 750, max: 900, label: "Excellent", color: "emerald" },
} as const;

/** Get score category from numeric score */
export function getScoreCategoryFromScore(score: number): ScoreCategory {
  if (score >= SCORE_THRESHOLDS.excellent.min) return "excellent";
  if (score >= SCORE_THRESHOLDS.good.min) return "good";
  if (score >= SCORE_THRESHOLDS.fair.min) return "fair";
  return "poor";
}

/** Credit packages with pricing */
export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    type: "score_check",
    name: "Credit Score Check",
    description: "Instant credit score with bureau name and rating category",
    price: 99,
    features: [
      "Instant Credit Score",
      "Bureau Name & Report Date",
      "Score Category & Rating",
      "Credit Health Indicator",
      "Basic Credit Insights",
    ],
  },
  {
    type: "report_pdf",
    name: "Credit Report PDF",
    description: "Full credit report with downloadable PDF and account details",
    price: 149,
    features: [
      "Everything in Score Check",
      "Detailed Credit Report PDF",
      "Active & Closed Account Details",
      "Enquiry History",
      "Payment History Timeline",
      "Download & Share Report",
    ],
    recommended: true,
  },
  {
    type: "premium",
    name: "Premium Credit Package",
    description: "Complete credit intelligence with analytics and score insights",
    price: 199,
    features: [
      "Everything in Report PDF",
      "Credit Score Analytics",
      "Score Improvement Insights",
      "Debt-to-Income Analysis",
      "Credit Utilization Breakdown",
      "Stored in Your Dashboard",
      "Priority Support",
    ],
  },
];

/** Get package by type */
export function getCreditPackage(type: string): CreditPackage | undefined {
  return CREDIT_PACKAGES.find((pkg) => pkg.type === type);
}

/** Score color mapping for Tailwind classes */
export const SCORE_COLORS: Record<ScoreCategory, {
  text: string;
  bg: string;
  border: string;
  gradient: string;
  badge: string;
  ring: string;
}> = {
  poor: {
    text: "text-red-500",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    gradient: "from-red-500 to-red-600",
    badge: "bg-red-100 text-red-700",
    ring: "ring-red-500",
  },
  fair: {
    text: "text-orange-500",
    bg: "bg-orange-500/10",
    border: "border-orange-500/20",
    gradient: "from-orange-400 to-orange-600",
    badge: "bg-orange-100 text-orange-700",
    ring: "ring-orange-500",
  },
  good: {
    text: "text-blue-500",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    gradient: "from-blue-400 to-blue-600",
    badge: "bg-blue-100 text-blue-700",
    ring: "ring-blue-500",
  },
  excellent: {
    text: "text-emerald-500",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    gradient: "from-emerald-400 to-emerald-600",
    badge: "bg-emerald-100 text-emerald-700",
    ring: "ring-emerald-500",
  },
};

/** Masked PAN for display (e.g., ABCDE1234F → A****234F) */
export function maskPan(pan: string): string {
  if (pan.length !== 10) return "****";
  return `${pan[0]}****${pan.slice(6)}`;
}

/** Format date for display */
export function formatCreditDate(dateStr: string): string {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

/** Score as percentage (300-900 range → 0-100%) */
export function scoreToPercent(score: number): number {
  const min = 300;
  const max = 900;
  return Math.max(0, Math.min(100, ((score - min) / (max - min)) * 100));
}
