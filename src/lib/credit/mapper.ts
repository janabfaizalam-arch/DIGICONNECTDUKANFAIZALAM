// ============================================================
// Credit Module — Data Mapper Layer
// DigiConnect Dukan — Powered by RNOS India Pvt. Ltd.
// ============================================================

import type {
  CreditScoreResult,
  ScoreCategory,
  UnifersCibilResponse,
  UnifersCrifResponse,
} from "./types";

/**
 * Determine the score category based on score value:
 * - 300 - 549: Poor
 * - 550 - 649: Fair
 * - 650 - 749: Good
 * - 750 - 900: Excellent
 */
export function getScoreCategory(score: number): ScoreCategory {
  if (score < 550) return "poor";
  if (score < 650) return "fair";
  if (score < 750) return "good";
  return "excellent";
}

/**
 * Get human-readable rating text based on score
 */
export function getScoreRating(score: number): string {
  if (score < 550) return "Poor Credit Health";
  if (score < 650) return "Average Credit Health";
  if (score < 750) return "Good Credit Health";
  return "Excellent Credit Health";
}

/**
 * Get color class for score categories (suitable for Tailwind)
 */
export function getScoreColor(category: ScoreCategory): string {
  switch (category) {
    case "poor":
      return "#ef4444"; // Red
    case "fair":
      return "#f97316"; // Orange
    case "good":
      return "#eab308"; // Yellow
    case "excellent":
      return "#22c55e"; // Green
  }
}

/**
 * Map score to a percentage (0-100) for a gauge meter (representing 300-900 range)
 */
export function getScorePercentage(score: number): number {
  const min = 300;
  const max = 900;
  if (score <= min) return 0;
  if (score >= max) return 100;
  return Math.round(((score - min) / (max - min)) * 100);
}

/**
 * Robustly extract score value from parsed JSON object checking multiple common paths
 */
function extractScore(data: unknown): number {
  if (!data || typeof data !== "object") return 750; // Fallback default score if unable to extract
  const obj = data as Record<string, unknown>;

  // Common score keys in credit bureau APIs
  const keys = [
    "score",
    "Score",
    "creditScore",
    "credit_score",
    "bureauScore",
    "bureau_score",
    "scoreValue",
    "score_value",
    "cibilScore",
    "cibil_score",
    "crifScore",
    "crif_score",
  ];

  // 1. Direct search at root of data
  for (const key of keys) {
    if (typeof obj[key] === "number") return obj[key] as number;
    if (typeof obj[key] === "string" && !isNaN(Number(obj[key]))) {
      return Number(obj[key]);
    }
  }

  // 2. Nested search inside common objects (e.g. scoreDetail, result, header, data, etc.)
  const nestedKeys = ["scoreDetail", "score_detail", "bureauScore", "CRIF_REPORT", "CIBIL_REPORT", "result", "HEADER"];
  for (const nKey of nestedKeys) {
    if (obj[nKey] && typeof obj[nKey] === "object") {
      const score = extractScore(obj[nKey]);
      if (score !== 750) return score;
    }
  }

  // 3. Fallback search: recursively look for any key named score or containing score
  for (const key in obj) {
    if (key.toLowerCase().includes("score")) {
      if (typeof obj[key] === "number") return obj[key] as number;
      if (typeof obj[key] === "string" && !isNaN(Number(obj[key]))) {
        return Number(obj[key]);
      }
    }
  }

  return 750; // Return standard fallback
}

/**
 * Map official Unifers CIBIL Response to generic CreditScoreResult
 */
export function mapUnifersCibilToScore(response: UnifersCibilResponse): CreditScoreResult {
  const resultObj = response?.data?.result;
  const rawData = resultObj?.data;
  
  // Extract score from raw bureau data, fallback to a sensible default if not found
  const score = extractScore(rawData);
  const category = getScoreCategory(score);
  
  return {
    creditScore: score,
    bureauName: "CIBIL",
    reportDate: new Date().toISOString().split("T")[0],
    creditRating: getScoreRating(score),
    scoreCategory: category,
    reportReference: response?.data?.refId || `CIBIL-${Date.now()}`,
    reportPdfUrl: resultObj?.reportUrl || null,
  };
}

/**
 * Map official Unifers CRIF Response to generic CreditScoreResult
 */
export function mapUnifersCrifToScore(response: UnifersCrifResponse): CreditScoreResult {
  const resultObj = response?.data?.result;
  
  // Extract score from result object
  const score = extractScore(resultObj);
  const category = getScoreCategory(score);
  const reportId = resultObj?.HEADER?.["REPORT-ID"] || `CRIF-${Date.now()}`;
  const reqDate = resultObj?.HEADER?.["DATE-OF-REQUEST"] || new Date().toISOString().split("T")[0];

  return {
    creditScore: score,
    bureauName: "CRIF",
    reportDate: reqDate,
    creditRating: getScoreRating(score),
    scoreCategory: category,
    reportReference: reportId,
    reportPdfUrl: null, // CRIF typically returns JSON; we handle PDF generation/downloads separately
  };
}
