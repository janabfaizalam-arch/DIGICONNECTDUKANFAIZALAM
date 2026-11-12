import { CONSTITUTIONS } from "@/lib/balance-sheets/engine";
import { SCHEME_OPTIONS } from "@/lib/balance-sheets/schemes";

import { buildDpr, fyLabel, type DprInput, type DprReport, type NarrativeKey } from "./engine";
import { templateById } from "./templates";

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
    templateId: null,
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
    contingencyPct: 0,
    depreciationMethod: "auto",
    depreciationRates: {},
    preliminaryWriteOffYears: 5,
    products: [],
    utilisationPct: [60, 70, 80, 85, 90],
    priceGrowthPct: 0,
    rawMaterials: [],
    staff: [],
    employerContributionPct: null,
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
    workInProgressDays: 0,
    finishedGoodsDays: 15,
    debtorDays: 30,
    creditorDays: 15,
    minimumCashDays: 7,
    includeLand: false,
    ownContributionPct: null,
    otherFunding: 0,
    termLoanOverride: null,
    ccLimitOverride: null,
    workingCapitalOverride: null,
    subsidyOverride: null,
    termLoanInterestPct: 10.5,
    ccInterestPct: 11,
    tenureYears: 5,
    moratoriumMonths: 6,
    repaymentMethod: "equal_principal",
    repaymentFrequency: "monthly",
    interestSubventionPct: null,
    interestSubventionYears: null,
    taxRegime: "new",
    taxPct: 0,
    drawingsPerYear: 0,
    narrative: {},
  };
}

const inr = (value: number) => `Rs. ${Math.round(value).toLocaleString("en-IN")}`;
const lakh = (value: number) => `Rs. ${(value / 100000).toLocaleString("en-IN", { maximumFractionDigits: 2 })} lakh`;

export const NARRATIVE_TITLES: Record<NarrativeKey, string> = {
  summary: "Executive Summary",
  introduction: "Introduction",
  promoters: "Promoter Profile",
  project: "Project Description",
  market: "Market Potential",
  marketing: "Marketing Strategy",
  process: "Manufacturing / Service Process",
  machinery: "Machinery and Technology",
  rawMaterialSource: "Raw Material and Its Availability",
  licences: "Statutory Approvals and Licences",
  risks: "Risk Analysis and Mitigation",
  employment: "Employment and Social Benefit",
  swot: "SWOT Analysis",
  implementation: "Implementation Schedule",
  conclusion: "Conclusion",
};

const bullets = (items: string[]) => items.map((item) => `• ${item}`).join("\n");

/**
 * A complete first draft of every written section, from the figures and —
 * when the DPR was started from a template — that trade's own text. The
 * admin can replace any section; whatever they type wins.
 */
export function draftNarrative(input: DprInput, report: DprReport = buildDpr(input)): Record<NarrativeKey, string> {
  const template = templateById(input.templateId);
  const t = template?.text;
  const name = input.businessName || "The proposed unit";
  const activity = input.activity || template?.activity || "the proposed activity";
  const constitution = CONSTITUTIONS.find((c) => c.value === input.constitution)?.label ?? "Proprietorship";
  const scheme = SCHEME_OPTIONS.find((s) => s.value === input.scheme);
  const schemeText = input.scheme === "none" || !scheme ? "a term loan and working capital facility from the bank" : `finance under ${scheme.label}`;
  const place = [input.district, input.state].filter(Boolean).join(", ");
  const promoters = input.promoters.filter((p) => p.name.trim());
  const lead = promoters[0];
  const y1 = report.years[0];
  const last = report.years.at(-1);
  const products = input.products.map((p) => p.name).filter(Boolean);
  const materials = input.rawMaterials.map((m) => m.name).filter(Boolean);
  const staffCount = input.staff.reduce((sum, s) => sum + Math.max(0, s.count || 0), 0);
  const machines = input.capitalItems.filter((i) => !["land", "preliminary", "building"].includes(i.kind)).map((i) => i.description).filter(Boolean);
  const bep = report.breakEven?.bepCapacityPct;
  const kind = input.sector === "manufacturing" ? "manufacturing" : input.sector === "trading" ? "trading" : "service";

  return {
    summary: [
      `${name} proposes to set up a ${kind} unit for ${activity}${place ? ` at ${place}` : ""}. The total cost of the project is ${lakh(report.cost.total)}, of which ${lakh(report.means.ownContribution)} (${report.means.ownContributionPct}%) will be brought in by the promoter and ${lakh(report.means.bankLoan)} is sought as ${schemeText}${report.means.subsidy > 0 ? `, with an eligible subsidy of ${lakh(report.means.subsidy)}` : ""}.`,
      `At ${y1?.utilisationPct ?? 0}% capacity utilisation in the first year the unit is projected to achieve sales of ${lakh(y1?.sales ?? 0)} and a net profit of ${lakh(y1?.netProfit ?? 0)}, rising to sales of ${lakh(last?.sales ?? 0)} by year ${report.years.length}. The average debt service coverage ratio is ${report.averageDscr?.toFixed(2) ?? "-"}${bep != null ? ` and the break-even point is ${bep.toFixed(1)}% of installed capacity` : ""}. The loan can be repaid comfortably within ${input.tenureYears} years.`,
      `The project will provide employment to ${staffCount || "several"} persons and is recommended for financial assistance.`,
    ].join("\n"),
    introduction: `${name} is a proposed ${constitution.toLowerCase()} enterprise for ${activity}${place ? ` at ${place}` : ""}. The total cost of the project is ${lakh(report.cost.total)}, to be financed by the promoter's contribution of ${lakh(report.means.ownContribution)} and ${schemeText} of ${lakh(report.means.bankLoan)}${report.means.subsidy > 0 ? `, with an eligible margin money subsidy of ${lakh(report.means.subsidy)}` : ""}. Commercial operations are planned from financial year ${fyLabel(input.startFy)}.`,
    promoters: promoters.length
      ? promoters
          .map((p) => `${p.name}${p.fatherName ? `, S/o / D/o / W/o ${p.fatherName}` : ""}${p.age ? `, aged ${p.age} years` : ""}${p.address ? `, resident of ${p.address}` : ""}${p.qualification ? `, has completed ${p.qualification}` : ""}${p.experience ? ` and has ${p.experience}` : ""}.`)
          .join(" ") + ` ${lead?.name ?? "The promoter"} will devote full time to the unit and manage production, purchase, sales and accounts personally, which keeps overheads low and decisions quick.`
      : "Promoter details to be added.",
    project: `The unit will undertake ${activity}${products.length ? `, with ${products.join(", ")} as its main ${kind === "manufacturing" ? "products" : kind === "trading" ? "lines" : "services"}` : ""}. The installed capacity at full utilisation is valued at ${inr(report.installedCapacityValue)} a year. Capacity utilisation is taken at ${input.utilisationPct.slice(0, report.years.length).join("%, ")}% over the projection period, giving first-year sales of ${inr(y1?.sales ?? 0)}. The unit will operate from ${input.premises} premises${input.district ? ` in ${input.district}` : ""}, which has road connectivity, power supply and access to markets.`,
    market:
      t?.market ??
      `There is steady demand for ${products.length ? products.join(", ") : activity} in ${input.district || "the area"} and nearby markets from households, retailers and institutional buyers. The sales projections assume a gradual increase in capacity utilisation as the unit establishes itself.`,
    marketing:
      t?.marketing ??
      "The promoter will sell directly to customers and through local dealers and retailers, competing on quality, timely supply and service. Social media and word of mouth will be used to build a regular customer base.",
    process:
      t?.process ??
      `The process involves procurement of ${materials.length ? materials.join(", ") : "inputs"} from local suppliers, ${kind === "manufacturing" ? "processing on the machinery listed in the project cost, quality checking and packing" : "delivery of the service using the equipment listed in the project cost"}, followed by sale to customers.`,
    machinery: `${t?.machinery ?? "The machinery and equipment required are standard and available from reputed suppliers."}${machines.length ? ` The main items are: ${machines.join("; ")}.` : ""} Quotations from suppliers will be submitted to the bank, and payment will be made directly to the suppliers from the loan account.`,
    rawMaterialSource:
      t?.rawMaterialSource ?? (materials.length ? `${materials.join(", ")} are readily available from local markets and wholesalers.` : "The unit does not depend on any scarce raw material."),
    licences: bullets(
      t?.licences ?? ["Udyam Registration (MSME)", "GST registration", "Trade licence / shop registration from the local body", "Any licence specific to the activity"],
    ),
    risks: (t?.risks ?? [
      ["Market competition", "Quality, service and competitive pricing."],
      ["Rise in input costs", "Periodic price revision and careful purchasing."],
    ])
      .concat([["Repayment risk", `Average DSCR of ${report.averageDscr?.toFixed(2) ?? "-"} gives a sufficient margin for loan servicing.`]])
      .map(([risk, mitigation]) => `• ${risk}: ${mitigation}`)
      .join("\n"),
    employment: `The project will directly employ ${staffCount || "several"} persons${staffCount ? ` (${input.staff.map((s) => `${s.count} ${s.role.toLowerCase()}`).join(", ")})` : ""} besides the promoter, and will create indirect employment for suppliers, transporters and retailers. It supports local entrepreneurship${input.scheme !== "none" && scheme ? ` in line with the objectives of ${scheme.label.split(" (")[0]}` : ""}.`,
    swot: t
      ? [`Strengths: ${t.swot.strengths.join("; ")}.`, `Weaknesses: ${t.swot.weaknesses.join("; ")}.`, `Opportunities: ${t.swot.opportunities.join("; ")}.`, `Threats: ${t.swot.threats.join("; ")}.`].join("\n")
      : "Strengths: promoter's experience and direct involvement; low overheads.\nWeaknesses: new unit with limited initial brand recognition.\nOpportunities: growing local demand and scope to add related products.\nThreats: competition from established units and price fluctuation in inputs.",
    implementation: [
      "Registration, licences and bank formalities — Month 1",
      "Loan sanction and disbursement — Month 1–2",
      "Premises preparation and electrical work — Month 2",
      "Purchase, delivery and installation of machinery / equipment — Month 2–3",
      "Recruitment and training of staff; trial run — Month 3",
      "Commencement of commercial operations — Month 4",
    ].join("\n"),
    conclusion: `The project is technically feasible, commercially viable and financially sound. It shows an average DSCR of ${report.averageDscr?.toFixed(2) ?? "-"}${bep != null ? `, a break-even at ${bep.toFixed(1)}% of installed capacity` : ""} and a payback period of about ${report.paybackYears?.toFixed(1) ?? "-"} years, and generates sufficient cash to repay the term loan within ${input.tenureYears} years. The promoter is committed and experienced, and the project will create local employment. It is recommended for financial assistance.`,
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
