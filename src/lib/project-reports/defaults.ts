import { CONSTITUTIONS } from "@/lib/balance-sheets/engine";
import { SCHEME_OPTIONS } from "@/lib/balance-sheets/schemes";

import { buildDpr, fyLabel, type DprInput, type DprReport, type NarrativeKey } from "./engine";

/** The financial year that starts next April, or this one if it is still early in the year. */
export function nextStartFy(now = new Date()) {
  return now.getMonth() >= 3 ? now.getFullYear() + 1 : now.getFullYear();
}

export function emptyPromoter() {
  return { name: "", fatherName: "", age: null, gender: "", qualification: "", experience: "", socialCategory: "General", mobile: "", email: "", address: "" };
}

/** A new, blank DPR with the defaults most bank DPRs use. */
export function emptyDpr(now = new Date()): DprInput {
  return {
    businessName: "",
    constitution: "proprietorship",
    activity: "",
    sector: "manufacturing",
    area: "urban",
    category: "general",
    address: "",
    district: "",
    state: "Uttar Pradesh",
    pincode: "",
    udyamNumber: "",
    gstin: "",
    pan: "",
    premises: "rented",
    bankName: "",
    bankBranch: "",
    promoters: [emptyPromoter()],
    startFy: nextStartFy(now),
    years: 5,
    scheme: "pmegp",
    capitalItems: [],
    depreciationRates: {},
    preliminaryWriteOffYears: 5,
    products: [],
    utilisationPct: [60, 70, 80, 85, 90],
    priceGrowthPct: 0,
    rawMaterials: [],
    staff: [],
    overheads: [
      { name: "Electricity / power", monthly: 0, variable: true, direct: true },
      { name: "Rent", monthly: 0, variable: false, direct: false },
      { name: "Repairs & maintenance", monthly: 0, variable: false, direct: true },
      { name: "Insurance", monthly: 0, variable: false, direct: false },
      { name: "Office, telephone & stationery", monthly: 0, variable: false, direct: false },
      { name: "Marketing & transport", monthly: 0, variable: true, direct: false },
    ],
    costGrowthPct: 5,
    rawMaterialDays: 30,
    finishedGoodsDays: 15,
    debtorDays: 30,
    creditorDays: 15,
    includeLand: false,
    ownContributionPct: null,
    termLoanOverride: null,
    ccLimitOverride: null,
    subsidyOverride: null,
    termLoanInterestPct: 10.5,
    ccInterestPct: 11,
    tenureYears: 5,
    moratoriumMonths: 6,
    interestSubventionPct: null,
    interestSubventionYears: null,
    taxPct: 0,
    drawingsPerYear: 0,
    narrative: {},
  };
}

const inr = (value: number) => `Rs. ${Math.round(value).toLocaleString("en-IN")}`;
const lakh = (value: number) => `Rs. ${(value / 100000).toLocaleString("en-IN", { maximumFractionDigits: 2 })} lakh`;

export const NARRATIVE_TITLES: Record<NarrativeKey, string> = {
  introduction: "Introduction",
  promoters: "Promoter Profile",
  project: "Project Description",
  market: "Market Potential",
  process: "Manufacturing / Service Process",
  swot: "SWOT Analysis",
  implementation: "Implementation Schedule",
  conclusion: "Conclusion",
};

/**
 * A sensible first draft of each written section, from the figures. The
 * admin edits these; whatever they type replaces the draft for that section.
 */
export function draftNarrative(input: DprInput, report: DprReport = buildDpr(input)): Record<NarrativeKey, string> {
  const name = input.businessName || "The proposed unit";
  const activity = input.activity || "the proposed activity";
  const constitution = CONSTITUTIONS.find((c) => c.value === input.constitution)?.label ?? "Proprietorship";
  const scheme = SCHEME_OPTIONS.find((s) => s.value === input.scheme);
  const schemeText = input.scheme === "none" || !scheme ? "a term loan and working capital facility" : `finance under ${scheme.label}`;
  const place = [input.district, input.state].filter(Boolean).join(", ");
  const promoters = input.promoters.filter((p) => p.name.trim());
  const y1 = report.years[0];
  const products = input.products.map((p) => p.name).filter(Boolean);
  const staffCount = input.staff.reduce((sum, s) => sum + Math.max(0, s.count || 0), 0);

  return {
    introduction: `${name} is a proposed ${constitution.toLowerCase()} enterprise for ${activity}${place ? ` at ${place}` : ""}. The total cost of the project is ${lakh(report.cost.total)}, to be financed by the promoter's contribution of ${lakh(report.means.ownContribution)} and ${schemeText} of ${lakh(report.means.bankLoan)}${report.means.subsidy > 0 ? `, with an eligible margin money subsidy of ${lakh(report.means.subsidy)}` : ""}. Commercial operations are planned from financial year ${fyLabel(input.startFy)}.`,
    promoters: promoters.length
      ? promoters
          .map((p) => `${p.name}${p.fatherName ? `, S/o / D/o / W/o ${p.fatherName}` : ""}${p.age ? `, aged ${p.age} years` : ""}${p.qualification ? `, has completed ${p.qualification}` : ""}${p.experience ? ` and has ${p.experience}` : ""}.`)
          .join(" ") + " The promoter is fully involved in the day-to-day management of the unit."
      : "Promoter details to be added.",
    project: `The unit will undertake ${activity}${products.length ? `, with ${products.join(", ")} as its main ${input.sector === "manufacturing" ? "products" : "services"}` : ""}. The installed capacity at full utilisation is valued at ${inr(report.installedCapacityValue)} a year. Capacity utilisation is taken at ${input.utilisationPct.slice(0, report.years.length).join("%, ")}% over the projection period, giving first-year sales of ${inr(y1?.sales ?? 0)}. The unit will employ ${staffCount || "the required number of"} persons and operate from ${input.premises} premises.`,
    market: `There is steady local demand for ${products.length ? products.join(", ") : activity} in ${input.district || "the area"} and nearby markets from households, retailers and institutional buyers. The promoter plans to sell directly to customers and through local dealers, and to compete on quality, timely supply and service. The sales projections assume a gradual increase in capacity utilisation as the unit establishes itself.`,
    process: `The process involves procurement of raw material${input.rawMaterials.length ? ` (${input.rawMaterials.map((m) => m.name).filter(Boolean).join(", ")})` : ""} from local suppliers, ${input.sector === "manufacturing" ? "processing on the machinery listed in the project cost, quality checking and packing" : "delivery of the service using the equipment listed in the project cost"}, followed by sale and dispatch to customers. Raw material and skilled manpower are readily available locally.`,
    swot: "Strengths: promoter's experience and direct involvement; low overheads.\nWeaknesses: new unit with limited initial brand recognition.\nOpportunities: growing local demand and scope to add related products.\nThreats: competition from established units and price fluctuation in raw material.",
    implementation: "Loan sanction and disbursement: Month 1-2\nPurchase and installation of machinery / equipment: Month 2-3\nRecruitment and trial run: Month 3-4\nCommencement of commercial operations: Month 4",
    conclusion: `The project is technically feasible and financially viable. It shows an average DSCR of ${report.averageDscr?.toFixed(2) ?? "-"}${report.breakEven?.bepCapacityPct != null ? `, a break-even at ${report.breakEven.bepCapacityPct.toFixed(1)}% of installed capacity` : ""}, and generates sufficient cash to repay the term loan within ${input.tenureYears} years. The project also creates local employment. It is recommended for financial assistance.`,
  };
}

/** The text a section will print with: the admin's own if written, else the draft. */
export function narrativeFor(input: DprInput, report: DprReport): Record<NarrativeKey, string> {
  const draft = draftNarrative(input, report);
  const out = { ...draft };
  for (const key of Object.keys(draft) as NarrativeKey[]) {
    const own = input.narrative[key]?.trim();
    if (own) out[key] = own;
  }
  return out;
}
