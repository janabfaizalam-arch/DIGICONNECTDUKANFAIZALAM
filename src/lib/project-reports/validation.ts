import { buildDpr, type DprInput } from "./engine";

/**
 * Whether a report may be saved as final, and if not, why (Hinglish). A
 * report is final only when its means of finance equal the project cost,
 * it has sales, and every statement reconciles.
 */
export function finalBlockerFor(payload: { status: "draft" | "final"; input: DprInput }) {
  if (payload.status !== "final") return null;
  const report = buildDpr(payload.input);
  if (Math.abs(report.means.gap) > 1) {
    const detail = report.errors.find((e) => e.startsWith("Paisa project cost")) ?? "Means of finance project cost ke barabar nahi hai.";
    return `${detail} Isliye final nahi kar sakte; draft save karein.`;
  }
  if ((report.years[0]?.sales ?? 0) <= 0) return "Sales projection khaali hai. Products aur capacity bharein.";
  if (!payload.input.promoters.some((p) => p.name.trim())) return "Promoter ka naam bharein, tabhi final kar sakte hain.";
  // A report whose statements do not reconcile is never issued as final.
  if (report.errors.length) return `${report.errors[0]} Draft save karein aur theek karein.`;
  return null;
}
