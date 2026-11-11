import { buildDpr, itemAmount, missingCostHeads, type DprInput, type Overhead } from "./engine";

/**
 * Clearly marked estimates for running costs the admin has not entered.
 *
 * The engine never invents a cost: a missing head is a warning and a data
 * gap. This is the explicit step the admin takes — the "Missing kharche
 * estimate se bharein" button, and the quick DPR — to fill those heads with
 * conservative small-unit norms. Every line added carries `estimated: true`,
 * prints as "(estimate)" in the report, and is listed in the assumptions
 * annexure until the admin replaces it with the actual figure.
 */

const round100 = (v: number) => Math.max(100, Math.round(v / 100) * 100);

type Norm = { key: string; make: (ctx: { fixed: number; machinery: number; sales: number; stock: number }) => Omit<Overhead, "estimated"> };

const NORMS: Record<string, Norm> = {
  "rent for rented / leased premises": {
    key: "rent",
    // Small-town industrial / commercial space: a base plus a share of the set-up size.
    make: ({ fixed }) => ({ name: "Rent of premises", monthly: round100(2500 + fixed * 0.0025), variable: false, direct: false }),
  },
  "electricity / power": { key: "power", make: ({ sales }) => ({ name: "Electricity / power", monthly: round100((sales * 0.03) / 12), variable: true, direct: true }) },
  "repairs and maintenance": { key: "repairs", make: ({ machinery }) => ({ name: "Repairs and maintenance", monthly: round100((machinery * 0.02) / 12), variable: false, direct: true }) },
  insurance: { key: "insurance", make: ({ fixed, stock }) => ({ name: "Insurance of assets and stock", monthly: round100(((fixed + stock) * 0.005) / 12), variable: false, direct: false }) },
  "marketing and selling": { key: "marketing", make: ({ sales }) => ({ name: "Marketing and selling expenses", monthly: round100((sales * 0.01) / 12), variable: true, direct: false }) },
  "office and administration": { key: "admin", make: () => ({ name: "Office, telephone and stationery", monthly: 1500, variable: false, direct: false }) },
  "professional and compliance fees": { key: "professional", make: () => ({ name: "Professional, audit and compliance fees", monthly: 2000, variable: false, direct: false }) },
};

/** The input with an estimated line for every missing running-cost head. Unchanged if nothing is missing. */
export function withEstimatedCosts(input: DprInput): DprInput {
  const missing = missingCostHeads(input);
  if (!missing.length) return input;
  const report = buildDpr(input);
  const machinery = input.capitalItems.filter((i) => ["machinery", "installation"].includes(i.kind)).reduce((s, i) => s + itemAmount(i), 0);
  // Variable costs are entered at 100% capacity, so size them on full-capacity sales.
  const fullSales = report.years[0] && report.years[0].utilisationPct > 0 ? (report.years[0].sales * 100) / report.years[0].utilisationPct : 0;
  const ctx = { fixed: report.cost.fixedCapital, machinery, sales: fullSales, stock: report.years[0]?.stock ?? 0 };
  const added = missing.map((head) => NORMS[head.english]).filter(Boolean).map((norm) => ({ ...norm.make(ctx), estimated: true }));
  return { ...input, overheads: [...input.overheads.filter((o) => o.monthly > 0 || !added.some((a) => a.name === o.name)), ...added] };
}
