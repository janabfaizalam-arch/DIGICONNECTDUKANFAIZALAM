import type { Verification } from "./scheme-catalog";
import { templateById } from "./templates";
import type { DprInput, DprReport } from "./engine";

/**
 * Statutory approvals a unit needs, sorted into what is mandatory, what
 * applies only above a threshold or in some cases (conditional), and what is
 * recommended. Built from the industry, the location, the size and the
 * headcount of the project — not a fixed list per template.
 *
 * Positions as checked in November 2026. Where a rule could only be found in
 * secondary sources it is marked "verification required"; the report prints
 * that status next to the item. This is guidance for the preparer, not legal
 * advice.
 */

export type ComplianceLevel = "mandatory" | "conditional" | "recommended";

export type ComplianceItem = {
  name: string;
  authority: string;
  /** When it applies / why, in English for the report. */
  basis: string;
  level: ComplianceLevel;
  status: Verification;
};

const item = (level: ComplianceLevel, name: string, authority: string, basis: string, status: Verification = "verified"): ComplianceItem => ({ name, authority, basis, level, status });

const LAKH = 100_000;
const CRORE = 100 * LAKH;

/** Industry rules keyed by template id; groups below cover the rest. */
const BY_TEMPLATE: Record<string, (ctx: Ctx) => ComplianceItem[]> = {
  "packaged-water": () => [
    item(
      "mandatory",
      "FSSAI licence for packaged drinking water (high-risk food category)",
      "Food Safety and Standards Authority of India",
      "BIS certification ceased to be a pre-condition for the FSSAI licence from 17 Oct 2024; the product is treated as a high-risk category with risk-based inspections.",
    ),
    item(
      "mandatory",
      "FSSAI Scheme of Testing for Packaged Drinking Water & Mineral Water",
      "FSSAI (order of 17 Dec 2025, effective 1 Jan 2026)",
      "Periodic testing of product, source water and packaging at FSSAI-notified / NABL-accredited laboratories. Testing frequencies to be confirmed against the FSSAI order.",
      "verification_required",
    ),
    item("mandatory", "Legal Metrology registration as packer of pre-packaged commodities", "Legal Metrology Department, UP", "Label declarations (net quantity, MRP, batch, best-before) under the Legal Metrology (Packaged Commodities) Rules, 2011."),
    item(
      "conditional",
      "Ground water registration / NOC for commercial extraction",
      "UP Ground Water Department (UP Ground Water (Management and Regulation) Act, 2019)",
      "Required for commercial / industrial abstraction of ground water; conditions depend on the block category of the location.",
      "verification_required",
    ),
    item("conditional", "Consent to Establish and Operate", "UP Pollution Control Board", "As per the category assigned to packaged drinking water units by UPPCB.", "verification_required"),
    item(
      "conditional",
      "BIS certification (IS 14543) — Uttar Pradesh",
      "Bureau of Indian Standards / UP Food Safety Commissioner",
      "Voluntary nationally after Oct 2024; a reported UP order of Oct 2026 may require it for units in the state — to be confirmed with the Food Safety department before setting up.",
      "verification_required",
    ),
    item("recommended", "In-house water testing laboratory", "-", "Batch-wise checks between the laboratory tests required by the FSSAI scheme."),
  ],
  "medical-store": () => [
    item("mandatory", "Retail drug licence (Form 20 / 21)", "Drugs Controller, UP", "Sale of drugs requires a licence and a registered pharmacist on the premises."),
  ],
  "agri-inputs": () => [
    item("mandatory", "Fertiliser dealer authorisation", "Agriculture Department (Fertiliser Control Order, 1985)", "Sale of fertilisers."),
    item("mandatory", "Seed dealer licence", "Agriculture Department (Seeds (Control) Order, 1983)", "Sale of seeds."),
    item("mandatory", "Insecticide sale licence", "Agriculture Department (Insecticides Rules, 1971)", "Sale of pesticides."),
  ],
  pathology: () => [
    item("mandatory", "Registration of clinical establishment", "UP Health Department", "Diagnostic laboratories are registered with the state health authority.", "verification_required"),
    item("mandatory", "Bio-medical waste authorisation and disposal agreement", "UPPCB (Bio-Medical Waste Management Rules, 2016)", "Any facility generating bio-medical waste."),
    item("mandatory", "Qualified pathologist for signing reports", "-", "Reports must be signed by a qualified pathologist (MD / DCP)."),
  ],
  "e-rickshaw": () => [
    item("mandatory", "Vehicle registration and fitness", "RTO", "Every e-rickshaw / e-cart must be registered."),
    item("mandatory", "Driving licence (e-rickshaw) and permit where required", "RTO", "For each driver and vehicle."),
    item("mandatory", "Third-party motor insurance", "Insurer (Motor Vehicles Act, 1988)", "Compulsory for every vehicle."),
  ],
  "led-assembly": () => [item("mandatory", "BIS registration under the Compulsory Registration Scheme (LED lamps)", "Bureau of Indian Standards", "LED lamps and luminaires are notified under CRS.")],
  restaurant: (ctx) => [item("conditional", "Fire NOC", "UP Fire and Emergency Services", "For eating places above the seating / area thresholds in the state rules.", "verification_required"), ...(ctx.employees >= 10 ? [] : [])],
  honey: () => [item("recommended", "Registration with the National Bee Board (Madhukranti portal)", "National Bee Board", "Traceability of honey; needed for some buyers and schemes.")],
  "cattle-feed": () => [item("recommended", "BIS standard IS 2052 for compound cattle feed", "Bureau of Indian Standards", "Quality standard for compound feed; voluntary unless notified.", "verification_required")],
};

type Ctx = { input: DprInput; firstYearSales: number; employees: number; manufacturing: boolean; food: boolean; powerUser: boolean };

function fssaiFor(ctx: Ctx): ComplianceItem {
  if (ctx.firstYearSales <= 12 * LAKH) return item("mandatory", "FSSAI basic registration", "FSSAI", "Food business with turnover up to Rs. 12 lakh.");
  if (ctx.firstYearSales <= 50 * CRORE) return item("mandatory", "FSSAI state licence", "Food Safety Department, UP", "Food business with turnover above Rs. 12 lakh.");
  return item("mandatory", "FSSAI central licence", "FSSAI", "Large food business.");
}

/** The approvals this project needs, sorted mandatory → conditional → recommended. */
export function complianceFor(input: DprInput, report: Pick<DprReport, "years">): ComplianceItem[] {
  const template = templateById(input.templateId);
  const employees = input.staff.reduce((sum, s) => sum + Math.max(0, s.count || 0), 0);
  const ctx: Ctx = {
    input,
    firstYearSales: report.years[0]?.sales ?? 0,
    employees,
    manufacturing: input.sector === "manufacturing",
    food: template?.group === "food" || template?.group === "hospitality" && /restaurant|catering|sweets/.test(template.id),
    powerUser: input.sector === "manufacturing" || input.overheads.some((o) => /electric|power/i.test(o.name) && o.monthly > 0),
  };
  const gstThreshold = input.sector === "service" ? 20 * LAKH : 40 * LAKH;
  const items: ComplianceItem[] = [
    item("mandatory", "PAN of the proprietor / firm", "Income Tax Department", "Required for the bank account, loan and tax."),
    input.scheme === "none"
      ? item("recommended", "Udyam Registration (MSME)", "Ministry of MSME (udyamregistration.gov.in)", "Free, Aadhaar-based; gives access to MSME benefits.")
      : item("mandatory", "Udyam Registration (MSME)", "Ministry of MSME (udyamregistration.gov.in)", "Required for the scheme benefit and priority-sector lending."),
    (report.years.some((y) => y.sales > gstThreshold)
      ? item("mandatory", "GST registration", "GST Department", `Projected turnover exceeds Rs. ${gstThreshold / LAKH} lakh (threshold for ${input.sector === "service" ? "services" : "goods"} in Uttar Pradesh).`)
      : item("conditional", "GST registration", "GST Department", `Required once turnover crosses Rs. ${gstThreshold / LAKH} lakh, or for inter-state supply / e-commerce sales.`)),
    item("conditional", "Shop and establishment registration / trade licence", "Labour Department / local body", "For shops and commercial establishments as per the UP Shops and Commercial Establishments Act and local bye-laws.", "verification_required"),
    ...(ctx.powerUser ? [item("mandatory", "Electricity connection of the required load", "UPPCL / DISCOM", "Commercial or industrial connection for the connected load of the machinery.")] : []),
    ...(ctx.food ? [fssaiFor(ctx)] : []),
    ...(ctx.manufacturing
      ? [
          item(
            employees >= 10 ? "mandatory" : "conditional",
            "Factory licence",
            "Directorate of Factories, UP",
            employees >= 10 ? `${employees} workers with power: the Factories Act threshold (10 with power / 20 without) is met.` : "Needed only at 10 workers with power (20 without).",
          ),
          item("conditional", "Consent to Establish / Operate", "UP Pollution Control Board", "Depends on the pollution category (white category units are exempt).", "verification_required"),
        ]
      : []),
    item(
      employees >= 20 ? "mandatory" : "conditional",
      "EPF registration",
      "EPFO",
      employees >= 20 ? `${employees} employees: EPF applies (20 or more).` : "Applies from 20 employees.",
    ),
    item(
      employees >= 10 ? "mandatory" : "conditional",
      "ESI registration",
      "ESIC",
      employees >= 10 ? `${employees} employees: ESI applies (10 or more).` : "Applies from 10 employees in notified areas.",
    ),
    ...(BY_TEMPLATE[input.templateId ?? ""]?.(ctx) ?? []),
    item("recommended", "Current account with the financing bank", "Lending bank", "All business receipts and payments routed through it; banks monitor the loan through it."),
    item("recommended", "Insurance of stock and assets", "Insurer", "Usually a condition of the loan sanction."),
  ];
  const order: Record<ComplianceLevel, number> = { mandatory: 0, conditional: 1, recommended: 2 };
  return items.sort((a, b) => order[a.level] - order[b.level]);
}
