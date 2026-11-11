import type { Constitution, SchemeArea, SchemeCategory, SchemeId, SchemeSector } from "@/lib/balance-sheets/engine";
import { mudraCategory, schemeTerms, type SchemeTerms } from "@/lib/balance-sheets/schemes";

import { schemeConfig } from "./scheme-catalog";

/**
 * Detailed Project Report (DPR) calculations — the single source of truth
 * for every figure in the form's summary and in the PDF.
 *
 * The model works forward from what the business will make and sell
 * (capacity, utilisation, losses, prices), what that consumes (raw material
 * linked to production, staff, running costs) and how it is financed
 * (promoter, term loan, cash credit, back-ended subsidy). From those it
 * builds, year by year:
 *
 *   operations → P&L (with stock adjustment and tax) → cash flow → balance sheet
 *
 * Cash in the balance sheet is the closing cash of the cash-flow statement;
 * it is never used to force the sheet to balance. The balance sheet is then
 * checked independently, as are the project cost, the means of finance, the
 * loan schedule and the cash flow (see `checks`). A report that fails a check
 * carries an error and cannot be made final.
 *
 * All amounts are rupees, kept to the paisa internally.
 */

/* ─────────────────────────────────────────────────────────────────────────
   Asset heads and depreciation bases
   ───────────────────────────────────────────────────────────────────────── */

/**
 * `itRate`: written-down-value rate under the Income-tax Act (Appendix I to
 * the IT Rules) — used for tax, and for books when WDV is chosen.
 * `life`: useful life under Schedule II to the Companies Act 2013 — used for
 * straight-line depreciation with a 5% residual value.
 */
export const ASSET_KINDS = [
  { value: "land", label: "Land", defaultRate: 0, itRate: 0, life: 0 },
  { value: "building", label: "Building / shed / civil work", defaultRate: 10, itRate: 10, life: 30 },
  { value: "machinery", label: "Plant & machinery", defaultRate: 15, itRate: 15, life: 15 },
  { value: "installation", label: "Transportation & installation", defaultRate: 15, itRate: 15, life: 15 },
  { value: "furniture", label: "Furniture & fixtures", defaultRate: 10, itRate: 10, life: 10 },
  { value: "electrical", label: "Electrical installation", defaultRate: 10, itRate: 10, life: 10 },
  { value: "vehicle", label: "Vehicle", defaultRate: 15, itRate: 15, life: 8 },
  { value: "computer", label: "Computer & IT equipment", defaultRate: 40, itRate: 40, life: 3 },
  { value: "other", label: "Other fixed assets", defaultRate: 15, itRate: 15, life: 15 },
  { value: "preliminary", label: "Preliminary & pre-operative expenses", defaultRate: 0, itRate: 0, life: 0 },
  { value: "licences", label: "Licences & registration", defaultRate: 0, itRate: 0, life: 0 },
  { value: "deposit", label: "Security deposits", defaultRate: 0, itRate: 0, life: 0 },
] as const;

export type AssetKind = (typeof ASSET_KINDS)[number]["value"];

/** Heads that are written off rather than depreciated. */
const WRITE_OFF_KINDS: AssetKind[] = ["preliminary", "licences"];
/** Heads that are neither depreciated nor written off. */
const NON_DEPRECIABLE: AssetKind[] = ["land", "deposit", ...WRITE_OFF_KINDS];
const SLM_RESIDUAL = 0.05;

export type CapitalItem = {
  kind: AssetKind;
  description: string;
  quantity: number;
  rate: number;
  /** Supplier and quotation reference; blank means the quotation is still pending. */
  supplier?: string;
  quotationRef?: string;
};
export type Product = {
  name: string;
  unit: string;
  /** Installed capacity per year at 100%. */
  capacity: number;
  price: number;
  /** Lost in processing (wastage), percent of production. */
  processLossPct?: number;
  /** Rejected / returned, percent of good production. */
  rejectionPct?: number;
};
export type RawMaterial = {
  name: string;
  unit: string;
  /** Quantity per year at 100% capacity; ignored when linked to a product. */
  quantity: number;
  rate: number;
  /** Linked to a product: consumption = that product's production × per-unit × (1 + loss). */
  productIndex?: number | null;
  perUnit?: number | null;
  lossPct?: number;
};
export type StaffRow = { role: string; count: number; monthlySalary: number; direct: boolean };
/** A monthly running cost. `variable` costs are entered at 100% capacity and scale with utilisation. */
export type Overhead = { name: string; monthly: number; variable: boolean; direct: boolean; estimated?: boolean };

export type Promoter = {
  name: string;
  fatherName: string;
  age: number | null;
  gender: string;
  qualification: string;
  experience: string;
  socialCategory: string;
  mobile: string;
  email: string;
  address: string;
};

export type DepreciationMethod = "auto" | "wdv" | "slm";
export type TaxRegime = "new" | "old" | "manual";
export type RepaymentMethod = "equal_principal" | "emi";
export type RepaymentFrequency = "monthly" | "quarterly";

export type DprInput = {
  /** The project template this DPR was started from, for its written sections. */
  templateId: string | null;
  businessName: string;
  constitution: Constitution;
  activity: string;
  sector: SchemeSector;
  area: SchemeArea;
  category: SchemeCategory;
  address: string;
  district: string;
  state: string;
  pincode: string;
  udyamNumber: string;
  gstin: string;
  pan: string;
  premises: "owned" | "rented" | "leased";
  bankName: string;
  bankBranch: string;
  promoters: Promoter[];

  /** Start year of the first year of operation: 2026 means FY 2026-27. */
  startFy: number;
  years: number;
  scheme: SchemeId;

  capitalItems: CapitalItem[];
  /** Contingency on fixed capital (excluding land and deposits), percent. */
  contingencyPct: number;
  /** Book depreciation: WDV (Income-tax rates), SLM (Companies Act lives) or auto by constitution. */
  depreciationMethod: DepreciationMethod;
  /** WDV rate override per asset kind, percent. */
  depreciationRates: Partial<Record<AssetKind, number>>;
  /** Years over which preliminary expenses and licences are written off. */
  preliminaryWriteOffYears: number;

  products: Product[];
  /** Capacity utilisation for each year, percent. */
  utilisationPct: number[];
  /** Yearly change in selling price; raw material rates follow it. */
  priceGrowthPct: number;
  rawMaterials: RawMaterial[];
  staff: StaffRow[];
  /** Employer's statutory contributions as % of salary; null works out EPF / ESI by headcount. */
  employerContributionPct: number | null;
  overheads: Overhead[];
  /** Yearly increase in salaries and overheads. */
  costGrowthPct: number;

  /** Holding periods for the working capital calculation, in days. */
  rawMaterialDays: number;
  workInProgressDays: number;
  finishedGoodsDays: number;
  debtorDays: number;
  creditorDays: number;
  /** Cash kept for running expenses, in days of cash operating cost. */
  minimumCashDays: number;

  /** Does the project cost include land? PMEGP and MYSY exclude it. */
  includeLand: boolean;
  /** Own contribution as a percent of project cost; null takes the scheme's rate. */
  ownContributionPct: number | null;
  /** Other funding (e.g. unsecured loan from family), not repaid in the projection period. */
  otherFunding: number;
  /** Typed loan amounts override the automatic split; null works them out. */
  termLoanOverride: number | null;
  ccLimitOverride: number | null;
  subsidyOverride: number | null;
  termLoanInterestPct: number;
  ccInterestPct: number;
  /** Total term loan tenure in years, including the moratorium. */
  tenureYears: number;
  moratoriumMonths: number;
  repaymentMethod: RepaymentMethod;
  repaymentFrequency: RepaymentFrequency;
  /** null takes the scheme's subvention. */
  interestSubventionPct: number | null;
  interestSubventionYears: number | null;
  /** Income tax regime; "manual" applies taxPct to profit before tax. */
  taxRegime: TaxRegime;
  taxPct: number;
  drawingsPerYear: number;

  narrative: Partial<Record<NarrativeKey, string>>;
};

export const NARRATIVE_KEYS = [
  "summary",
  "introduction",
  "promoters",
  "project",
  "market",
  "marketing",
  "process",
  "machinery",
  "rawMaterialSource",
  "licences",
  "risks",
  "employment",
  "swot",
  "implementation",
  "conclusion",
] as const;
export type NarrativeKey = (typeof NARRATIVE_KEYS)[number];

/* ─────────────────────────────────────────────────────────────────────────
   Output
   ───────────────────────────────────────────────────────────────────────── */

export type CostLine = { kind: AssetKind | "contingency"; label: string; amount: number };

export type ProjectCost = {
  lines: CostLine[];
  land: number;
  /** Fixed assets in the project cost, including contingency. */
  fixedCapital: number;
  contingency: number;
  /** Preliminary, pre-operative, licences and registration. */
  preliminary: number;
  deposits: number;
  workingCapital: number;
  /** What the scheme and the bank count as project cost: the sum of every head above. */
  total: number;
  /** Land bought outside the project cost (contributed by the promoter). */
  landOutside: number;
};

export type MeansOfFinance = {
  ownContribution: number;
  ownContributionPct: number;
  termLoan: number;
  ccLimit: number;
  otherFunding: number;
  bankLoan: number;
  total: number;
  /** Means minus cost; non-zero when typed loans do not add up. */
  gap: number;
  /** Back-ended subsidy: not a source of funds for the project. */
  subsidy: number;
  subsidyLockInYears: number;
  subsidyInterestFree: boolean;
};

export type WorkingCapital = {
  rawMaterialStock: number;
  workInProgress: number;
  finishedGoods: number;
  debtors: number;
  minimumCash: number;
  creditors: number;
  requirement: number;
};

export type ProductionRow = { name: string; unit: string; capacity: number; production: number; processLoss: number; rejected: number; saleable: number; price: number; grossSales: number; netSales: number };
export type MaterialRow = { name: string; unit: string; quantity: number; rate: number; value: number; basis: "linked" | "estimate"; linkedTo: string | null };
export type StaffCostRow = { role: string; count: number; monthlySalary: number; salary: number; statutory: number; total: number; direct: boolean };

export type YearRow = {
  fyStart: number;
  label: string;
  utilisationPct: number;
  production: ProductionRow[];
  materials: MaterialRow[];
  staffCost: StaffCostRow[];
  grossSales: number;
  returns: number;
  /** Net sales. */
  sales: number;
  rawMaterial: number;
  directWages: number;
  directOverheads: number;
  costOfProduction: number;
  /** Opening minus closing work in progress and finished goods. */
  stockAdjustment: number;
  costOfSales: number;
  grossProfit: number;
  indirectSalaries: number;
  indirectOverheads: number;
  ebitda: number;
  depreciation: number;
  preliminaryWrittenOff: number;
  termLoanInterest: number;
  ccInterest: number;
  interestSubvention: number;
  profitBeforeTax: number;
  /** Book profit + book depreciation − tax depreciation, before loss set-off. */
  taxableIncome: number;
  lossSetOff: number;
  tax: number;
  netProfit: number;
  cashAccrual: number;
  principalRepaid: number;
  subsidyAdjusted: number;
  dscr: number | null;
  // Balance sheet at year end
  capital: number;
  reserves: number;
  subsidyReserve: number;
  termLoanOutstanding: number;
  currentMaturities: number;
  ccLoan: number;
  otherFunding: number;
  creditors: number;
  totalLiabilities: number;
  grossBlock: number;
  accumulatedDepreciation: number;
  netFixedAssets: number;
  deposits: number;
  preliminaryUnamortised: number;
  rawMaterialStock: number;
  workInProgress: number;
  finishedGoods: number;
  /** All inventory. */
  stock: number;
  debtorsBalance: number;
  subsidyDeposit: number;
  cash: number;
  totalAssets: number;
  /** Total assets minus total liabilities: must be zero. */
  balanceDifference: number;
  currentAssets: number;
  currentLiabilities: number;
  currentRatio: number | null;
  tangibleNetWorth: number;
  debtEquity: number | null;
  grossMarginPct: number | null;
  netMarginPct: number | null;
  ebitdaMarginPct: number | null;
  rocePct: number | null;
};

export type RepaymentRow = { fyStart: number; label: string; opening: number; interest: number; principal: number; subsidyAdjusted: number; closing: number };
export type MonthlyRow = { month: number; opening: number; interest: number; principal: number; subsidyAdjusted: number; instalment: number; closing: number };

export type DepreciationRow = { kind: AssetKind | "contingency"; label: string; method: "WDV" | "SLM"; ratePct: number; basis: string; cost: number; perYear: number[]; closing: number };

export type BreakEven = {
  fyStart: number;
  label: string;
  fixedCosts: number;
  cashFixedCosts: number;
  variableCosts: number;
  contribution: number;
  bepSales: number;
  /** Break-even as a share of installed capacity, percent. */
  bepCapacityPct: number | null;
  /** Cash break-even (without depreciation and write-offs), percent of capacity. */
  cashBepCapacityPct: number | null;
  classification: { head: string; amount: number; nature: "variable" | "fixed" }[];
};

/** Cash flow for one period: operating, investing and financing activities. */
export type CashFlowRow = {
  label: string;
  openingCash: number;
  netProfit: number;
  depreciation: number;
  changeInInventory: number;
  changeInDebtors: number;
  changeInCreditors: number;
  operating: number;
  capitalExpenditure: number;
  subsidyPlacedInTdr: number;
  subsidyReleased: number;
  investing: number;
  promoterContribution: number;
  termLoanDisbursed: number;
  ccDrawn: number;
  otherFunding: number;
  subsidyReceived: number;
  principalRepaid: number;
  subsidyAdjustedAgainstLoan: number;
  drawings: number;
  financing: number;
  netChange: number;
  closingCash: number;
};

export type TaxBasis = { regime: TaxRegime; description: string };

export type Checks = {
  costReconciles: boolean;
  meansReconcile: boolean;
  loanReconciles: boolean;
  balanceSheetBalances: boolean;
  cashFlowReconciles: boolean;
  allFinite: boolean;
};

export type DprReport = {
  cost: ProjectCost;
  workingCapital: WorkingCapital;
  means: MeansOfFinance;
  years: YearRow[];
  /** The implementation period (before year one) followed by each year. */
  cashFlow: CashFlowRow[];
  implementation: CashFlowRow;
  repayment: RepaymentRow[];
  monthly: MonthlyRow[];
  depreciation: DepreciationRow[];
  depreciationMethod: "WDV" | "SLM";
  taxDepreciation: number[];
  taxBasis: TaxBasis;
  breakEven: BreakEven | null;
  averageDscr: number | null;
  minimumDscr: number | null;
  paybackYears: number | null;
  scheme: SchemeTerms | null;
  mudraCategory: string | null;
  installedCapacityValue: number;
  checks: Checks;
  /** Failed checks: the report cannot be made final. */
  errors: string[];
  /** Things the admin should fix or confirm, in Hinglish. */
  warnings: string[];
  /** Assumptions and gaps a bank should see, in English for the report. */
  dataGaps: string[];
};

/* ─────────────────────────────────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────────────────────────────────── */

const num = (value: number | null | undefined) => (typeof value === "number" && Number.isFinite(value) ? value : 0);
const pos = (value: number | null | undefined) => Math.max(0, num(value));
const round = (value: number) => Math.round(value * 100) / 100;
const ratio = (a: number, b: number) => (b > 0 && Number.isFinite(a / b) ? round(a / b) : null);
const pct = (a: number, b: number) => (b > 0 ? round((a / b) * 100) : null);
const DAYS = 365;

export function fyLabel(fyStart: number) {
  return `${fyStart}-${String((fyStart + 1) % 100).padStart(2, "0")}`;
}

export function assetLabel(kind: AssetKind | "contingency") {
  if (kind === "contingency") return "Contingencies";
  return ASSET_KINDS.find((entry) => entry.value === kind)?.label ?? "Other";
}

export function defaultDepreciationRate(kind: AssetKind) {
  return ASSET_KINDS.find((entry) => entry.value === kind)?.defaultRate ?? 15;
}

const assetInfo = (kind: AssetKind) => ASSET_KINDS.find((entry) => entry.value === kind) ?? ASSET_KINDS[2];

export function itemAmount(item: Pick<CapitalItem, "quantity" | "rate">) {
  return pos(item.quantity) * pos(item.rate);
}

/** Scheme terms for this project, or null for an ordinary bank loan. */
export function schemeFor(input: Pick<DprInput, "scheme" | "sector" | "area" | "category">) {
  return schemeTerms(input.scheme, { sector: input.sector, area: input.area, category: input.category });
}

export function utilisationFor(input: Pick<DprInput, "utilisationPct">, index: number) {
  const list = input.utilisationPct;
  if (!list.length) return 100;
  return Math.min(100, pos(list[Math.min(index, list.length - 1)]));
}

/** WDV for proprietors and firms (books follow tax), SLM for companies and LLPs. */
export function bookDepreciationMethod(input: Pick<DprInput, "depreciationMethod" | "constitution">): "WDV" | "SLM" {
  if (input.depreciationMethod === "wdv") return "WDV";
  if (input.depreciationMethod === "slm") return "SLM";
  return ["private_limited", "opc", "llp"].includes(input.constitution) ? "SLM" : "WDV";
}

/* ─────────────────────────────────────────────────────────────────────────
   Income tax
   ───────────────────────────────────────────────────────────────────────── */

type Slab = [upTo: number, ratePct: number];
const NEW_REGIME: Slab[] = [
  [400000, 0],
  [800000, 5],
  [1200000, 10],
  [1600000, 15],
  [2000000, 20],
  [2400000, 25],
  [Infinity, 30],
];
const OLD_REGIME: Slab[] = [
  [250000, 0],
  [500000, 5],
  [1000000, 20],
  [Infinity, 30],
];
const CESS = 0.04;

function slabTax(income: number, slabs: Slab[]) {
  let tax = 0;
  let lower = 0;
  for (const [upTo, rate] of slabs) {
    if (income <= lower) break;
    tax += ((Math.min(income, upTo) - lower) * rate) / 100;
    lower = upTo;
  }
  return tax;
}

function surchargeRate(income: number, regime: "new" | "old") {
  if (income > 50000000) return regime === "new" ? 0.25 : 0.37;
  if (income > 20000000) return 0.25;
  if (income > 10000000) return 0.15;
  if (income > 5000000) return 0.1;
  return 0;
}

/**
 * Income tax on a year's taxable business income.
 *
 * Proprietorship (and "other"): the proprietor's individual slabs — new
 * regime (FY 2025-26 rates: nil to Rs. 4 lakh … 30% above Rs. 24 lakh, §87A
 * rebate making income up to Rs. 12 lakh tax-free, with marginal relief) or
 * the old regime (rebate up to Rs. 5 lakh), surcharge and 4% cess. The
 * proprietor's other income and deductions are not known to the report and
 * are not considered. Partnership firm and LLP: 30% (+12% surcharge above
 * Rs. 1 crore) + cess. Company / OPC: 22% under §115BAA + 10% surcharge +
 * cess. Rates for later years are assumed unchanged.
 */
export function incomeTax(constitution: Constitution, regime: "new" | "old", taxable: number) {
  const income = Math.max(0, taxable);
  if (income <= 0) return 0;
  if (constitution === "partnership" || constitution === "llp") {
    const base = income * 0.3;
    return base * (1 + (income > 10000000 ? 0.12 : 0)) * (1 + CESS);
  }
  if (constitution === "private_limited" || constitution === "opc") return income * 0.22 * 1.1 * (1 + CESS);
  const slabs = regime === "new" ? NEW_REGIME : OLD_REGIME;
  let tax = slabTax(income, slabs);
  const rebateLimit = regime === "new" ? 1200000 : 500000;
  if (income <= rebateLimit) tax = 0;
  else if (regime === "new") tax = Math.min(tax, income - rebateLimit); // marginal relief over the rebate limit
  tax *= 1 + surchargeRate(income, regime);
  return tax * (1 + CESS);
}

function taxBasisFor(input: DprInput): TaxBasis {
  if (input.taxRegime === "manual") return { regime: "manual", description: `Income tax at ${pos(input.taxPct)}% of profit before tax, as entered by the preparer.` };
  const c = input.constitution;
  if (c === "partnership" || c === "llp") return { regime: input.taxRegime, description: "Partnership firm / LLP: 30% (plus 12% surcharge above Rs. 1 crore) and 4% health & education cess on taxable income." };
  if (c === "private_limited" || c === "opc") return { regime: input.taxRegime, description: "Company: 22% under section 115BAA plus 10% surcharge and 4% cess (effective 25.17%) on taxable income." };
  return input.taxRegime === "old"
    ? { regime: "old", description: "Proprietor taxed at individual slab rates under the old regime (rebate u/s 87A up to Rs. 5 lakh) plus 4% cess; the proprietor's other income and deductions are not considered." }
    : { regime: "new", description: "Proprietor taxed at individual slab rates under the new regime u/s 115BAC (FY 2025-26 slabs; rebate u/s 87A up to Rs. 12 lakh with marginal relief) plus 4% cess; the proprietor's other income is not considered." };
}

/* ─────────────────────────────────────────────────────────────────────────
   Operations
   ───────────────────────────────────────────────────────────────────────── */

const RENT = /\brent|kiraya|lease\b/i;

/** Employer's EPF (12% of wages up to Rs. 15,000) from 20 employees and ESI (3.25% for wages up to Rs. 21,000) from 10. */
export function statutoryCost(input: Pick<DprInput, "staff" | "employerContributionPct">, row: StaffRow) {
  const salary = pos(row.monthlySalary);
  if (input.employerContributionPct !== null && input.employerContributionPct !== undefined) return (salary * pos(input.employerContributionPct)) / 100;
  const headcount = input.staff.reduce((sum, s) => sum + pos(s.count), 0);
  const epf = headcount >= 20 ? 0.12 * Math.min(salary, 15000) : 0;
  const esi = headcount >= 10 && salary <= 21000 ? 0.0325 * salary : 0;
  return epf + esi;
}

/** Annual operating figures for one year, before stock adjustment and finance costs. */
function operations(input: DprInput, index: number) {
  const util = utilisationFor(input, index) / 100;
  const priceFactor = Math.pow(1 + num(input.priceGrowthPct) / 100, index);
  const costFactor = Math.pow(1 + num(input.costGrowthPct) / 100, index);

  const production: ProductionRow[] = input.products.map((p) => {
    const produced = pos(p.capacity) * util;
    const processLoss = (produced * Math.min(100, pos(p.processLossPct))) / 100;
    const good = produced - processLoss;
    const rejected = (good * Math.min(100, pos(p.rejectionPct))) / 100;
    const saleable = good - rejected;
    const price = pos(p.price) * priceFactor;
    return {
      name: p.name,
      unit: p.unit,
      capacity: pos(p.capacity),
      production: round(produced),
      processLoss: round(processLoss),
      rejected: round(rejected),
      saleable: round(saleable),
      price: round(price),
      grossSales: round(good * price),
      netSales: round(saleable * price),
    };
  });
  const grossSales = production.reduce((sum, p) => sum + p.grossSales, 0);
  const sales = production.reduce((sum, p) => sum + p.netSales, 0);

  // Raw material prices move with the selling price, so the margin on each
  // unit holds; the cost growth applies to wages and overheads.
  const materials: MaterialRow[] = input.rawMaterials.map((m) => {
    const linked = m.productIndex !== null && m.productIndex !== undefined && input.products[m.productIndex] && pos(m.perUnit) > 0;
    const product = linked ? input.products[m.productIndex as number] : null;
    const quantity = linked ? pos(product!.capacity) * util * pos(m.perUnit) * (1 + pos(m.lossPct) / 100) : pos(m.quantity) * util;
    const rate = pos(m.rate) * priceFactor;
    return { name: m.name, unit: m.unit, quantity: round(quantity), rate: round(rate), value: round(quantity * rate), basis: linked ? "linked" : "estimate", linkedTo: product?.name ?? null };
  });
  const rawMaterial = materials.reduce((sum, m) => sum + m.value, 0);

  const staffCost: StaffCostRow[] = input.staff.map((s) => {
    const salary = pos(s.count) * pos(s.monthlySalary) * 12 * costFactor;
    const statutory = pos(s.count) * statutoryCost(input, s) * 12 * costFactor;
    return { role: s.role, count: pos(s.count), monthlySalary: round(pos(s.monthlySalary) * costFactor), salary: round(salary), statutory: round(statutory), total: round(salary + statutory), direct: s.direct };
  });
  const wages = (direct: boolean) => staffCost.filter((s) => s.direct === direct).reduce((sum, s) => sum + s.total, 0);
  const overheads = (direct: boolean) =>
    input.overheads.filter((o) => o.direct === direct).reduce((sum, o) => sum + pos(o.monthly) * 12 * (o.variable ? util : 1), 0) * costFactor;
  const variableOverheads = input.overheads.filter((o) => o.variable).reduce((sum, o) => sum + pos(o.monthly) * 12 * util, 0) * costFactor;

  return {
    util,
    production,
    materials,
    staffCost,
    grossSales,
    sales,
    rawMaterial,
    directWages: wages(true),
    indirectSalaries: wages(false),
    directOverheads: overheads(true),
    indirectOverheads: overheads(false),
    variableOverheads,
  };
}

type Operations = ReturnType<typeof operations>;

function balancesOf(input: DprInput, op: Operations) {
  const costOfProduction = op.rawMaterial + op.directWages + op.directOverheads;
  const cashExpenses = costOfProduction + op.indirectSalaries + op.indirectOverheads;
  return {
    costOfProduction,
    rawMaterialStock: (op.rawMaterial * pos(input.rawMaterialDays)) / DAYS,
    workInProgress: (costOfProduction * pos(input.workInProgressDays)) / DAYS,
    finishedGoods: (costOfProduction * pos(input.finishedGoodsDays)) / DAYS,
    debtors: (op.sales * pos(input.debtorDays)) / DAYS,
    creditors: (op.rawMaterial * pos(input.creditorDays)) / DAYS,
    minimumCash: (cashExpenses * pos(input.minimumCashDays)) / DAYS,
  };
}

/** Working capital for one operating cycle in the first year. */
export function workingCapitalOf(input: DprInput): WorkingCapital {
  const b = balancesOf(input, operations(input, 0));
  return {
    rawMaterialStock: round(b.rawMaterialStock),
    workInProgress: round(b.workInProgress),
    finishedGoods: round(b.finishedGoods),
    debtors: round(b.debtors),
    minimumCash: round(b.minimumCash),
    creditors: round(b.creditors),
    // Whole rupees, as a bank sanctions it, so typed loans can add up to the project cost exactly.
    requirement: Math.round(Math.max(0, b.rawMaterialStock + b.workInProgress + b.finishedGoods + b.debtors + b.minimumCash - b.creditors)),
  };
}

/* ─────────────────────────────────────────────────────────────────────────
   Project cost and means of finance
   ───────────────────────────────────────────────────────────────────────── */

export function projectCostOf(input: DprInput, workingCapital = workingCapitalOf(input)): ProjectCost {
  const byKind = new Map<AssetKind, number>();
  for (const item of input.capitalItems) byKind.set(item.kind, (byKind.get(item.kind) ?? 0) + itemAmount(item));
  const get = (kind: AssetKind) => byKind.get(kind) ?? 0;
  const land = get("land");
  const includedLand = input.includeLand ? land : 0;
  const depreciable = ASSET_KINDS.filter((k) => !NON_DEPRECIABLE.includes(k.value)).reduce((sum, k) => sum + get(k.value), 0);
  const contingency = (depreciable * pos(input.contingencyPct)) / 100;
  const preliminary = get("preliminary") + get("licences");
  const deposits = get("deposit");

  const lines: CostLine[] = ASSET_KINDS.filter((k) => get(k.value) > 0 && (k.value !== "land" || input.includeLand)).map((k) => ({ kind: k.value, label: k.label, amount: round(get(k.value)) }));
  if (contingency > 0) {
    const at = lines.findIndex((l) => l.kind === "preliminary" || l.kind === "licences" || l.kind === "deposit");
    lines.splice(at < 0 ? lines.length : at, 0, { kind: "contingency", label: `Contingencies (${pos(input.contingencyPct)}% of fixed assets)`, amount: round(contingency) });
  }
  const fixedCapital = round(includedLand + depreciable + contingency);
  const total = round(fixedCapital + round(preliminary) + round(deposits) + workingCapital.requirement);
  return {
    lines,
    land: round(land),
    fixedCapital,
    contingency: round(contingency),
    preliminary: round(preliminary),
    deposits: round(deposits),
    workingCapital: workingCapital.requirement,
    total,
    landOutside: round(input.includeLand ? 0 : land),
  };
}

/**
 * Who pays for the project. The promoter's share is the scheme's (or the
 * typed) percent; the rest is bank finance, split between term loan and cash
 * credit in proportion to fixed assets and working capital.
 *
 * When the admin types the loans the bank has sanctioned, the other figures
 * adjust so the total still equals the project cost:
 * - term loan and CC both typed: the promoter brings in whatever is left;
 * - only one typed: the other loan takes up the balance.
 * Only if the typed loans alone exceed the project cost is there a gap.
 */
export function meansOf(input: DprInput, cost: ProjectCost, scheme: SchemeTerms | null): MeansOfFinance {
  const ownPctTarget = pos(input.ownContributionPct ?? scheme?.ownContributionPct ?? 25);
  const other = round(pos(input.otherFunding));
  const typedTl = input.termLoanOverride === null || input.termLoanOverride === undefined ? null : round(pos(input.termLoanOverride));
  const typedCc = input.ccLimitOverride === null || input.ccLimitOverride === undefined ? null : round(pos(input.ccLimitOverride));

  let ownContribution = round((cost.total * ownPctTarget) / 100);
  let termLoan: number;
  let ccLimit: number;
  if (typedTl !== null && typedCc !== null) {
    termLoan = typedTl;
    ccLimit = typedCc;
    ownContribution = round(Math.max(0, cost.total - other - termLoan - ccLimit));
  } else if (typedTl !== null) {
    termLoan = typedTl;
    ccLimit = round(Math.max(0, cost.total - ownContribution - other - termLoan));
  } else if (typedCc !== null) {
    ccLimit = typedCc;
    termLoan = round(Math.max(0, cost.total - ownContribution - other - ccLimit));
  } else {
    const bankNeed = Math.max(0, cost.total - ownContribution - other);
    const wcShare = cost.total > 0 ? cost.workingCapital / cost.total : 0;
    ccLimit = round(bankNeed * wcShare);
    termLoan = round(bankNeed - ccLimit);
  }

  const rawSubsidy = scheme ? (cost.total * scheme.subsidyPct) / 100 : 0;
  const autoSubsidy = scheme ? round(scheme.subsidyCap === null ? rawSubsidy : Math.min(rawSubsidy, scheme.subsidyCap)) : 0;
  const subsidy = round(pos(input.subsidyOverride ?? autoSubsidy));

  const total = round(ownContribution + other + termLoan + ccLimit);
  return {
    ownContribution,
    ownContributionPct: cost.total > 0 ? round((ownContribution / cost.total) * 100) : ownPctTarget,
    termLoan,
    ccLimit,
    otherFunding: other,
    bankLoan: round(termLoan + ccLimit),
    total,
    gap: round(total - cost.total),
    subsidy,
    subsidyLockInYears: subsidy > 0 ? (scheme?.lockInYears ?? 0) : 0,
    subsidyInterestFree: subsidy > 0 && Boolean(scheme?.interestFreeOnSubsidy),
  };
}

/* ─────────────────────────────────────────────────────────────────────────
   Term loan
   ───────────────────────────────────────────────────────────────────────── */

/**
 * The month-by-month term loan schedule, from which the yearly figures are
 * summed. The loan is taken as disbursed at the start of year one. Interest
 * is charged monthly on the reducing balance — on the balance less the
 * subsidy while the subsidy sits in a TDR, where the scheme says so. After
 * the moratorium the principal is repaid every month or quarter, in equal
 * principal amounts or as an EMI. At the end of the lock-in the subsidy is
 * adjusted against the loan and the remaining instalments are recomputed.
 * The last instalment clears the balance exactly.
 */
export function loanSchedule(
  input: Pick<DprInput, "tenureYears" | "moratoriumMonths" | "termLoanInterestPct" | "repaymentMethod" | "repaymentFrequency">,
  loan: number,
  subsidy = 0,
  lockInYears = 0,
  interestFreeOnSubsidy = false,
): MonthlyRow[] {
  const months = Math.max(1, Math.round(pos(input.tenureYears) * 12));
  const moratorium = Math.min(months - 1, Math.max(0, Math.round(pos(input.moratoriumMonths))));
  const step = input.repaymentFrequency === "quarterly" ? 3 : 1;
  const rate = pos(input.termLoanInterestPct) / 100 / 12;
  const dueMonths: number[] = [];
  for (let m = moratorium + step; m <= months; m += step) dueMonths.push(m);
  if (!dueMonths.length || dueMonths[dueMonths.length - 1] !== months) dueMonths.push(months);
  const due = new Set(dueMonths);
  const lockMonth = subsidy > 0 && lockInYears > 0 ? lockInYears * 12 : null;

  const rows: MonthlyRow[] = [];
  let balance = round(loan);
  let adjusted = false;
  let instalment = 0; // principal per period (equal principal) or EMI
  let accruedInterest = 0;
  const reprice = (fromMonth: number) => {
    const remaining = dueMonths.filter((m) => m > fromMonth).length;
    if (remaining <= 0) return;
    if (input.repaymentMethod === "emi" && rate > 0) {
      const i = rate * step;
      instalment = (balance * i) / (1 - Math.pow(1 + i, -remaining));
    } else instalment = balance / remaining;
  };
  reprice(0);

  for (let month = 1; month <= months; month += 1) {
    const opening = balance;
    // Worked in paise throughout, so the printed rows add up exactly.
    const interestFree = interestFreeOnSubsidy && !adjusted && lockMonth !== null ? Math.min(subsidy, balance) : 0;
    const interest = round(Math.max(0, balance - interestFree) * rate);
    accruedInterest += interest;
    let principal = 0;
    if (due.has(month) && balance > 0) {
      if (month === months) principal = balance;
      else if (input.repaymentMethod === "emi") principal = Math.min(balance, Math.max(0, round(instalment - accruedInterest)));
      else principal = Math.min(balance, round(instalment));
      accruedInterest = 0;
    }
    balance = round(balance - principal);
    let subsidyAdjusted = 0;
    if (lockMonth !== null && month === lockMonth && !adjusted) {
      subsidyAdjusted = round(Math.min(subsidy, balance));
      balance = round(balance - subsidyAdjusted);
      adjusted = true;
      reprice(month);
    }
    rows.push({ month, opening, interest, principal, subsidyAdjusted, instalment: round(interest + principal), closing: balance });
    if (balance <= 0 && month >= (lockMonth ?? 0)) break;
  }
  return rows;
}

/** Yearly totals of the monthly schedule, for the loan's whole tenure or the projection, whichever is longer. */
function yearlyRepayment(input: DprInput, monthly: MonthlyRow[], loan: number): RepaymentRow[] {
  const tenureYears = Math.ceil(Math.max(1, Math.round(pos(input.tenureYears) * 12)) / 12);
  const years = Math.max(tenureYears, Math.round(pos(input.years)) || 1);
  const rows: RepaymentRow[] = [];
  let opening = loan;
  for (let y = 0; y < years; y += 1) {
    const block = monthly.filter((r) => r.month > y * 12 && r.month <= (y + 1) * 12);
    const interest = block.reduce((s, r) => s + r.interest, 0);
    const principal = block.reduce((s, r) => s + r.principal, 0);
    const adj = block.reduce((s, r) => s + r.subsidyAdjusted, 0);
    const closing = block.length ? block[block.length - 1].closing : y === 0 ? loan : 0;
    rows.push({ fyStart: input.startFy + y, label: fyLabel(input.startFy + y), opening: round(opening), interest: round(interest), principal: round(principal), subsidyAdjusted: round(adj), closing: round(closing) });
    opening = closing;
  }
  return rows;
}

/** Kept for callers that only need the month-wise table. */
export function monthlySchedule(input: DprInput, loan: number): MonthlyRow[] {
  return loanSchedule(input, loan);
}

/* ─────────────────────────────────────────────────────────────────────────
   Depreciation
   ───────────────────────────────────────────────────────────────────────── */

type AssetPool = { kind: AssetKind | "contingency"; cost: number; info: (typeof ASSET_KINDS)[number] };

function assetPools(input: DprInput, cost: ProjectCost): AssetPool[] {
  const byKind = new Map<AssetKind, number>();
  for (const item of input.capitalItems) {
    if (NON_DEPRECIABLE.includes(item.kind)) continue;
    byKind.set(item.kind, (byKind.get(item.kind) ?? 0) + itemAmount(item));
  }
  const pools: AssetPool[] = [...byKind.entries()].filter(([, c]) => c > 0).map(([kind, c]) => ({ kind, cost: c, info: assetInfo(kind) }));
  // Contingency is capitalised with plant and machinery.
  if (cost.contingency > 0) pools.push({ kind: "contingency", cost: cost.contingency, info: assetInfo("machinery") });
  return pools;
}

function bookDepreciation(input: DprInput, pools: AssetPool[], years: number, method: "WDV" | "SLM"): DepreciationRow[] {
  return pools.map(({ kind, cost, info }) => {
    const perYear: number[] = [];
    let nbv = cost;
    let ratePct: number;
    let basis: string;
    if (method === "SLM") {
      ratePct = info.life > 0 ? round(((1 - SLM_RESIDUAL) / info.life) * 100) : 0;
      basis = `SLM over ${info.life} years (Companies Act 2013, Sch. II), 5% residual`;
      const floor = cost * SLM_RESIDUAL;
      for (let y = 0; y < years; y += 1) {
        const dep = Math.min((cost * ratePct) / 100, Math.max(0, nbv - floor));
        perYear.push(round(dep));
        nbv -= dep;
      }
    } else {
      const override = kind !== "contingency" ? input.depreciationRates[kind as AssetKind] : undefined;
      ratePct = pos(override ?? info.itRate);
      basis = override !== undefined ? "WDV at the rate entered by the preparer" : "WDV at Income-tax Act rates (Appendix I, IT Rules)";
      for (let y = 0; y < years; y += 1) {
        const dep = (nbv * ratePct) / 100;
        perYear.push(round(dep));
        nbv -= dep;
      }
    }
    return { kind, label: assetLabel(kind), method, ratePct, basis, cost: round(cost), perYear, closing: round(nbv) };
  });
}

/** Depreciation allowed for tax: WDV at Income-tax rates, full year (asset put to use for 180 days or more). */
function taxDepreciationOf(pools: AssetPool[], years: number) {
  const out = Array.from({ length: years }, () => 0);
  for (const { cost, info } of pools) {
    let wdv = cost;
    for (let y = 0; y < years; y += 1) {
      const dep = (wdv * info.itRate) / 100;
      out[y] += dep;
      wdv -= dep;
    }
  }
  return out;
}

/** Kept for callers that only need the book schedule. */
export function depreciationSchedule(input: DprInput, years: number): DepreciationRow[] {
  const cost = projectCostOf(input);
  return bookDepreciation(input, assetPools(input, cost), years, bookDepreciationMethod(input));
}

/* ─────────────────────────────────────────────────────────────────────────
   The whole report
   ───────────────────────────────────────────────────────────────────────── */

export function buildDpr(input: DprInput): DprReport {
  const years = Math.max(1, Math.min(10, Math.round(pos(input.years)) || 5));
  const scheme = input.scheme === "none" ? null : schemeFor(input);
  const workingCapital = workingCapitalOf(input);
  const cost = projectCostOf(input, workingCapital);
  const means = meansOf(input, cost, scheme);
  const subsidy = means.subsidy;
  const monthly = loanSchedule(input, means.termLoan, subsidy, means.subsidyLockInYears, means.subsidyInterestFree);
  const repayment = yearlyRepayment(input, monthly, means.termLoan);
  const pools = assetPools(input, cost);
  const method = bookDepreciationMethod(input);
  const depreciation = bookDepreciation(input, pools, years, method);
  const taxDep = taxDepreciationOf(pools, years);
  const writeOffYears = Math.max(1, Math.round(pos(input.preliminaryWriteOffYears)) || 5);
  const taxBasis = taxBasisFor(input);

  const subventionPct = Math.min(100, pos(input.interestSubventionPct ?? scheme?.interestSubventionPct ?? 0));
  const subventionYears = Math.round(pos(input.interestSubventionYears ?? scheme?.interestSubventionYears ?? 0));
  const ccRate = pos(input.ccInterestPct) / 100;

  // Lock-in ends at the end of this year (index); the subsidy leaves the TDR then.
  const lockInIndex = subsidy > 0 && means.subsidyLockInYears > 0 ? means.subsidyLockInYears - 1 : null;

  const grossBlock = cost.fixedCapital + cost.landOutside;
  const contributed = means.ownContribution + cost.landOutside;

  // ── Implementation period: funds raised and spent before year one. ──
  const capex = cost.fixedCapital + cost.preliminary + cost.deposits;
  const implementation: CashFlowRow = {
    label: "Implementation",
    openingCash: 0,
    netProfit: 0,
    depreciation: 0,
    changeInInventory: 0,
    changeInDebtors: 0,
    changeInCreditors: 0,
    operating: 0,
    capitalExpenditure: round(-capex),
    subsidyPlacedInTdr: round(-subsidy),
    subsidyReleased: 0,
    investing: round(-capex - subsidy),
    promoterContribution: means.ownContribution,
    termLoanDisbursed: means.termLoan,
    ccDrawn: means.ccLimit,
    otherFunding: means.otherFunding,
    subsidyReceived: subsidy,
    principalRepaid: 0,
    subsidyAdjustedAgainstLoan: 0,
    drawings: 0,
    financing: round(means.ownContribution + means.termLoan + means.ccLimit + means.otherFunding + subsidy),
    netChange: 0,
    closingCash: 0,
  };
  implementation.netChange = round(implementation.investing + implementation.financing);
  implementation.closingCash = implementation.netChange;

  const rows: YearRow[] = [];
  const flows: CashFlowRow[] = [];
  let cash = implementation.closingCash;
  let reserves = 0;
  let accDep = 0;
  let prelimLeft = cost.preliminary;
  let lossCarried = 0;
  let prev = { rm: 0, wip: 0, fg: 0, debtors: 0, creditors: 0 };
  let subsidyInTdr = subsidy;
  let dscrNumerator = 0;
  let dscrDenominator = 0;

  for (let index = 0; index < years; index += 1) {
    const fyStart = input.startFy + index;
    const op = operations(input, index);
    const b = balancesOf(input, op);
    const dep = depreciation.reduce((sum, d) => sum + (d.perYear[index] ?? 0), 0);
    const prelimWo = index < writeOffYears ? Math.min(prelimLeft, cost.preliminary / writeOffYears) : 0;
    const loan = repayment[index] ?? { interest: 0, principal: 0, closing: 0, subsidyAdjusted: 0 };
    const ccInterest = means.ccLimit * ccRate;
    const subvention = index < subventionYears ? ((loan.interest + ccInterest) * subventionPct) / 100 : 0;
    const tlInterestNet = loan.interest * (index < subventionYears ? 1 - subventionPct / 100 : 1);

    const costOfProduction = b.costOfProduction;
    const stockAdjustment = prev.wip + prev.fg - (b.workInProgress + b.finishedGoods);
    const costOfSales = costOfProduction + stockAdjustment;
    const grossProfit = op.sales - costOfSales;
    const ebitda = grossProfit - op.indirectSalaries - op.indirectOverheads;
    const pbt = ebitda - dep - prelimWo - loan.interest - ccInterest + subvention;

    // Tax: taxable income uses tax depreciation; losses are carried forward.
    const taxWo = prelimWo; // §35D: same five-year write-off
    const taxable = pbt + dep + prelimWo - taxDep[index] - taxWo;
    let setOff = 0;
    let assessable = taxable;
    if (taxable < 0) {
      lossCarried += -taxable;
      assessable = 0;
    } else if (lossCarried > 0) {
      setOff = Math.min(lossCarried, taxable);
      lossCarried -= setOff;
      assessable = taxable - setOff;
    }
    const tax = input.taxRegime === "manual" ? (Math.max(0, pbt) * pos(input.taxPct)) / 100 : incomeTax(input.constitution, input.taxRegime === "old" ? "old" : "new", assessable);
    const pat = pbt - tax;
    const cashAccrual = pat + dep + prelimWo;

    // ── Cash flow ──
    const changeInInventory = -(b.rawMaterialStock + b.workInProgress + b.finishedGoods - prev.rm - prev.wip - prev.fg);
    const changeInDebtors = -(b.debtors - prev.debtors);
    const changeInCreditors = b.creditors - prev.creditors;
    const operating = pat + dep + prelimWo + changeInInventory + changeInDebtors + changeInCreditors;
    const subsidyReleased = lockInIndex === index ? subsidyInTdr : 0;
    const investing = subsidyReleased;
    const drawings = pos(input.drawingsPerYear);
    const financing = -loan.principal - loan.subsidyAdjusted - drawings;
    const opening = cash;
    cash = opening + operating + investing + financing;
    if (lockInIndex === index) subsidyInTdr = 0;

    flows.push({
      label: fyLabel(fyStart),
      openingCash: round(opening),
      netProfit: round(pat),
      depreciation: round(dep + prelimWo),
      changeInInventory: round(changeInInventory),
      changeInDebtors: round(changeInDebtors),
      changeInCreditors: round(changeInCreditors),
      operating: round(operating),
      capitalExpenditure: 0,
      subsidyPlacedInTdr: 0,
      subsidyReleased: round(subsidyReleased),
      investing: round(investing),
      promoterContribution: 0,
      termLoanDisbursed: 0,
      ccDrawn: 0,
      otherFunding: 0,
      subsidyReceived: 0,
      principalRepaid: round(-loan.principal),
      subsidyAdjustedAgainstLoan: round(-loan.subsidyAdjusted),
      drawings: round(-drawings),
      financing: round(financing),
      netChange: round(operating + investing + financing),
      closingCash: round(cash),
    });

    // ── Balance sheet ──
    reserves += pat - drawings;
    accDep += dep;
    prelimLeft -= prelimWo;
    const nextYearPrincipal = monthly.filter((r) => r.month > (index + 1) * 12 && r.month <= (index + 2) * 12).reduce((s, r) => s + r.principal, 0);
    const stock = b.rawMaterialStock + b.workInProgress + b.finishedGoods;

    const liabilities = contributed + reserves + subsidy + loan.closing + means.ccLimit + means.otherFunding + b.creditors;
    const netBlock = grossBlock - accDep;
    const assets = netBlock + cost.deposits + prelimLeft + subsidyInTdr + stock + b.debtors + cash;
    const currentAssets = stock + b.debtors + Math.max(0, cash);
    const currentLiabilities = b.creditors + means.ccLimit + nextYearPrincipal + Math.max(0, -cash);
    const tnw = contributed + reserves + subsidy - prelimLeft;
    const debtService = tlInterestNet + loan.principal;
    const dscr = debtService > 0 ? (cashAccrual + tlInterestNet) / debtService : null;
    if (debtService > 0) {
      dscrNumerator += cashAccrual + tlInterestNet;
      dscrDenominator += debtService;
    }
    const capitalEmployed = tnw + loan.closing + means.ccLimit + means.otherFunding;

    rows.push({
      fyStart,
      label: fyLabel(fyStart),
      utilisationPct: round(op.util * 100),
      production: op.production,
      materials: op.materials,
      staffCost: op.staffCost,
      grossSales: round(op.grossSales),
      returns: round(op.grossSales - op.sales),
      sales: round(op.sales),
      rawMaterial: round(op.rawMaterial),
      directWages: round(op.directWages),
      directOverheads: round(op.directOverheads),
      costOfProduction: round(costOfProduction),
      stockAdjustment: round(stockAdjustment),
      costOfSales: round(costOfSales),
      grossProfit: round(grossProfit),
      indirectSalaries: round(op.indirectSalaries),
      indirectOverheads: round(op.indirectOverheads),
      ebitda: round(ebitda),
      depreciation: round(dep),
      preliminaryWrittenOff: round(prelimWo),
      termLoanInterest: round(loan.interest),
      ccInterest: round(ccInterest),
      interestSubvention: round(subvention),
      profitBeforeTax: round(pbt),
      taxableIncome: round(taxable),
      lossSetOff: round(setOff),
      tax: round(tax),
      netProfit: round(pat),
      cashAccrual: round(cashAccrual),
      principalRepaid: round(loan.principal),
      subsidyAdjusted: round(loan.subsidyAdjusted),
      dscr: dscr === null ? null : round(dscr),
      capital: round(contributed),
      reserves: round(reserves),
      subsidyReserve: round(subsidy),
      termLoanOutstanding: round(loan.closing),
      currentMaturities: round(nextYearPrincipal),
      ccLoan: round(means.ccLimit),
      otherFunding: round(means.otherFunding),
      creditors: round(b.creditors),
      totalLiabilities: round(liabilities),
      grossBlock: round(grossBlock),
      accumulatedDepreciation: round(accDep),
      netFixedAssets: round(netBlock),
      deposits: round(cost.deposits),
      preliminaryUnamortised: round(prelimLeft),
      rawMaterialStock: round(b.rawMaterialStock),
      workInProgress: round(b.workInProgress),
      finishedGoods: round(b.finishedGoods),
      stock: round(stock),
      debtorsBalance: round(b.debtors),
      subsidyDeposit: round(subsidyInTdr),
      cash: round(cash),
      totalAssets: round(assets),
      balanceDifference: round(assets - liabilities),
      currentAssets: round(currentAssets),
      currentLiabilities: round(currentLiabilities),
      currentRatio: ratio(currentAssets, currentLiabilities),
      tangibleNetWorth: round(tnw),
      debtEquity: tnw > 0 ? round((loan.closing + means.otherFunding) / tnw) : null,
      grossMarginPct: pct(grossProfit, op.sales),
      netMarginPct: pct(pat, op.sales),
      ebitdaMarginPct: pct(ebitda, op.sales),
      rocePct: pct(pbt + loan.interest + ccInterest - subvention, capitalEmployed),
    });
    prev = { rm: b.rawMaterialStock, wip: b.workInProgress, fg: b.finishedGoods, debtors: b.debtors, creditors: b.creditors };
  }

  // Bank method: total cash available for debt service over total debt service.
  const serviced = rows.filter((r) => r.dscr !== null);
  const averageDscr = dscrDenominator > 0 ? round(dscrNumerator / dscrDenominator) : null;
  const minimumDscr = serviced.length ? Math.min(...serviced.map((r) => r.dscr!)) : null;
  const breakEven = breakEvenOf(input, rows, subventionPct, subventionYears);
  const paybackYears = paybackOf(cost.total, rows);
  const installedCapacityValue = round(input.products.reduce((sum, p) => sum + pos(p.capacity) * pos(p.price), 0));
  const mudra = input.scheme === "mudra" ? (mudraCategory(means.bankLoan)?.name ?? null) : null;

  const checks = checksFor(input, cost, means, monthly, rows, flows, implementation);
  const report: DprReport = {
    cost,
    workingCapital,
    means,
    years: rows,
    cashFlow: flows,
    implementation,
    repayment,
    monthly,
    depreciation,
    depreciationMethod: method,
    taxDepreciation: taxDep.map(round),
    taxBasis,
    breakEven,
    averageDscr,
    minimumDscr,
    paybackYears,
    scheme,
    mudraCategory: mudra,
    installedCapacityValue,
    checks,
    errors: [],
    warnings: [],
    dataGaps: [],
  };
  report.checks.allFinite = allFinite(report);
  report.errors = errorsFor(report);
  report.warnings = [...report.errors, ...warningsFor(input, report)];
  report.dataGaps = dataGapsFor(input, report);
  return report;
}

/** Years until cumulative cash accruals repay the project cost, interpolated; null if not within the projection. */
function paybackOf(projectCost: number, rows: YearRow[]) {
  let cumulative = 0;
  for (let i = 0; i < rows.length; i += 1) {
    const accrual = rows[i].cashAccrual;
    if (accrual > 0 && cumulative + accrual >= projectCost) return round(i + (projectCost - cumulative) / accrual);
    cumulative += accrual;
  }
  return null;
}

/**
 * Break-even in the year operations settle (the third year, or the last if
 * the report is shorter). Variable: raw material and running costs that move
 * with output. Fixed: wages and salaries (with statutory costs), fixed
 * overheads, depreciation, write-offs and interest (net of subvention). Cash
 * break-even leaves out depreciation and write-offs.
 */
function breakEvenOf(input: DprInput, rows: YearRow[], subventionPct: number, subventionYears: number): BreakEven | null {
  if (!rows.length) return null;
  const index = Math.min(2, rows.length - 1);
  const row = rows[index];
  const op = operations(input, index);
  const variable = op.rawMaterial + op.variableOverheads;
  const subvention = index < subventionYears ? subventionPct / 100 : 0;
  const fixedOverheads = row.directOverheads + row.indirectOverheads - op.variableOverheads;
  const interest = (row.termLoanInterest + row.ccInterest) * (1 - subvention);
  const fixedCash = row.directWages + row.indirectSalaries + fixedOverheads + interest;
  const fixed = fixedCash + row.depreciation + row.preliminaryWrittenOff;
  const contribution = row.sales - variable;
  const classification: BreakEven["classification"] = [
    { head: "Raw material and consumables", amount: round(op.rawMaterial), nature: "variable" },
    { head: "Running costs that vary with output", amount: round(op.variableOverheads), nature: "variable" },
    { head: "Wages and salaries (incl. statutory)", amount: round(row.directWages + row.indirectSalaries), nature: "fixed" },
    { head: "Fixed running costs", amount: round(fixedOverheads), nature: "fixed" },
    { head: "Interest (net of subvention)", amount: round(interest), nature: "fixed" },
    { head: "Depreciation and write-offs", amount: round(row.depreciation + row.preliminaryWrittenOff), nature: "fixed" },
  ];
  const base = { fyStart: row.fyStart, label: row.label, fixedCosts: round(fixed), cashFixedCosts: round(fixedCash), variableCosts: round(variable), contribution: round(contribution), classification };
  if (row.sales <= 0 || contribution <= 0) return { ...base, bepSales: 0, bepCapacityPct: null, cashBepCapacityPct: null };
  const pvRatio = contribution / row.sales;
  return {
    ...base,
    bepSales: round(fixed / pvRatio),
    bepCapacityPct: round((fixed / contribution) * row.utilisationPct),
    cashBepCapacityPct: round((fixedCash / contribution) * row.utilisationPct),
  };
}

/* ─────────────────────────────────────────────────────────────────────────
   Checks, warnings and data gaps
   ───────────────────────────────────────────────────────────────────────── */

const TOLERANCE = 1; // rupee

function checksFor(input: DprInput, cost: ProjectCost, means: MeansOfFinance, monthly: MonthlyRow[], rows: YearRow[], flows: CashFlowRow[], implementation: CashFlowRow): Checks {
  const headsTotal = cost.lines.reduce((s, l) => s + l.amount, 0) + cost.workingCapital;
  const costReconciles = Math.abs(headsTotal - cost.total) <= TOLERANCE;
  const meansReconcile = Math.abs(means.gap) <= TOLERANCE;
  let loanOk = true;
  let expectedOpening = means.termLoan;
  for (const r of monthly) {
    if (Math.abs(r.opening - expectedOpening) > 0.05 || Math.abs(r.opening - r.principal - r.subsidyAdjusted - r.closing) > 0.05) loanOk = false;
    expectedOpening = r.closing;
  }
  const last = monthly[monthly.length - 1];
  const tenureMonths = Math.max(1, Math.round(pos(input.tenureYears) * 12));
  if (means.termLoan > 0 && (!last || last.closing !== 0 || last.month > tenureMonths)) loanOk = false;
  const repaid = monthly.reduce((s, r) => s + r.principal + r.subsidyAdjusted, 0);
  if (Math.abs(repaid - means.termLoan) > 1) loanOk = false;
  const balanceSheetBalances = rows.every((r) => Math.abs(r.balanceDifference) <= TOLERANCE);
  let cfOk = Math.abs(implementation.openingCash + implementation.netChange - implementation.closingCash) <= TOLERANCE;
  let opening = implementation.closingCash;
  for (const [i, f] of flows.entries()) {
    if (Math.abs(f.openingCash - opening) > TOLERANCE || Math.abs(f.openingCash + f.netChange - f.closingCash) > TOLERANCE || Math.abs(f.closingCash - rows[i].cash) > TOLERANCE) cfOk = false;
    opening = f.closingCash;
  }
  return { costReconciles, meansReconcile, loanReconciles: loanOk, balanceSheetBalances, cashFlowReconciles: cfOk, allFinite: true };
}

function allFinite(value: unknown): boolean {
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(allFinite);
  if (value && typeof value === "object") return Object.values(value).every((v) => v === null || v === undefined || typeof v === "string" || typeof v === "boolean" || allFinite(v));
  return true;
}

function errorsFor(report: DprReport): string[] {
  const out: string[] = [];
  const c = report.checks;
  if (!c.costReconciles) out.push("Galti: project cost ke heads ka jod total se nahi milta.");
  if (!c.meansReconcile) {
    const m = report.means;
    const cost = report.cost;
    const lakh = (v: number) => `Rs. ${(v / 100000).toLocaleString("en-IN", { maximumFractionDigits: 2 })} lakh`;
    const minOwnPct = report.scheme?.ownContributionPct ?? 0;
    const maxLoan = Math.max(0, cost.total - m.otherFunding - (cost.total * minOwnPct) / 100);
    out.push(
      m.gap > 0
        ? `Loan project cost se ${lakh(m.gap)} zyada hai. Is DPR ka project cost ${lakh(cost.total)} hai (machinery / saaman ${lakh(cost.fixedCapital + cost.preliminary + cost.deposits)} + working capital ${lakh(cost.workingCapital)}), lekin term loan ${lakh(m.termLoan)} + CC ${lakh(m.ccLimit)}${m.otherFunding ? ` + dusra ${lakh(m.otherFunding)}` : ""} = ${lakh(m.total - m.ownContribution)}. ` +
            `${minOwnPct ? `${minOwnPct}% apna paisa rakh kar ` : ""}term loan + CC zyada se zyada ${lakh(maxLoan)} ho sakta hai. "Loan apne aap theek karein" dabayein, ya machinery / saaman badhayein.`
        : `Paisa project cost se ${lakh(-m.gap)} kam hai: project cost ${lakh(cost.total)}, lekin apna ${lakh(m.ownContribution)} + term loan ${lakh(m.termLoan)} + CC ${lakh(m.ccLimit)}${m.otherFunding ? ` + dusra ${lakh(m.otherFunding)}` : ""} = ${lakh(m.total)}. Term loan ya CC badhayein, ya khaali chhodein taaki apne aap barabar ho jaaye.`,
    );
  }
  if (!c.loanReconciles) out.push("Galti: loan schedule avadhi ke ant tak zero par khatam nahi hota. Loan avadhi / moratorium check karein.");
  if (!c.balanceSheetBalances) out.push("Galti: projected balance sheet tally nahi ho rahi. Report final nahi ho sakti.");
  if (!c.cashFlowReconciles) out.push("Galti: cash flow aur balance sheet ka cash nahi milta.");
  if (!c.allFinite) out.push("Galti: kuch figures gin nahi paaye (khaali ya galat number). Inputs check karein.");
  return out;
}

const COST_CHECKS: { label: string; english: string; match: RegExp; when: (input: DprInput) => boolean }[] = [
  { label: "Rent (premises kiraye / lease par hai)", english: "rent for rented / leased premises", match: RENT, when: (i) => i.premises !== "owned" },
  { label: "Bijli / power", english: "electricity / power", match: /electric|power|bijli/i, when: (i) => i.sector === "manufacturing" },
  { label: "Repairs aur maintenance", english: "repairs and maintenance", match: /repair|maintenance|marammat/i, when: () => true },
  { label: "Insurance (bima)", english: "insurance", match: /insur|bima/i, when: () => true },
  { label: "Marketing / transport", english: "marketing and selling", match: /market|advert|selling|transport|delivery/i, when: () => true },
  { label: "Office, telephone aur admin", english: "office and administration", match: /office|telephone|admin|stationery/i, when: () => true },
  { label: "Professional / CA / compliance fees", english: "professional and compliance fees", match: /professional|audit|account|\bca\b|compliance|legal|licen/i, when: () => true },
];

/** Running-cost heads the project needs but has no amount for. */
export function missingCostHeads(input: DprInput) {
  return COST_CHECKS.filter((c) => c.when(input) && !input.overheads.some((o) => c.match.test(o.name) && pos(o.monthly) > 0));
}

function warningsFor(input: DprInput, report: DprReport): string[] {
  const out: string[] = [];
  const { cost, means, years: rows, averageDscr, scheme } = report;
  if (!input.products.length || (rows[0]?.sales ?? 0) <= 0) out.push("Products / services aur unki capacity aur rate bharein, tabhi sales banegi.");
  if (cost.fixedCapital + cost.preliminary <= 0) out.push("Project ki machinery / capital items bharein.");
  if (averageDscr !== null && averageDscr < 1.25) out.push(`Average DSCR ${averageDscr.toFixed(2)} hai. Zyaadatar bank kam se kam 1.25 dekhte hain.`);
  const losses = rows.filter((r) => r.netProfit < 0).map((r) => r.label);
  if (losses.length) out.push(`${losses.join(", ")} mein net loss dikh raha hai.`);
  const shortCash = rows.filter((r) => r.cash < 0).map((r) => r.label);
  if (shortCash.length) out.push(`${shortCash.join(", ")} mein cash kam pad raha hai. Capital ya working capital limit badhayein.`);
  if (scheme?.maxProjectCost && cost.total > scheme.maxProjectCost) {
    out.push(`${scheme.label} mein project cost Rs. ${scheme.maxProjectCost.toLocaleString("en-IN")} tak hi hota hai; ye project Rs. ${cost.total.toLocaleString("en-IN")} ka hai.`);
  }
  if (scheme?.maxLoan && means.bankLoan > scheme.maxLoan) out.push(`${scheme.label} mein loan Rs. ${scheme.maxLoan.toLocaleString("en-IN")} tak milta hai; yahan Rs. ${means.bankLoan.toLocaleString("en-IN")} hai.`);
  if (scheme?.needsComposite && (means.termLoan <= 0 || means.ccLimit <= 0)) out.push(`${scheme.label} mein loan composite hota hai: term loan aur CC dono chahiye.`);
  if ((input.scheme === "pmegp" || input.scheme === "mysy") && input.includeLand && cost.land > 0) out.push("PMEGP / MYSY mein zameen project cost mein nahi gini jaati. 'Zameen project cost mein' ka tick hatayein.");
  const minOwn = input.ownContributionPct ?? scheme?.ownContributionPct ?? null;
  if (minOwn !== null && cost.total > 0 && means.ownContributionPct + 0.01 < minOwn) {
    out.push(
      `Apna hissa (margin) sirf ${means.ownContributionPct.toFixed(1)}% (Rs. ${means.ownContribution.toLocaleString("en-IN")}) bach raha hai, jabki ${scheme?.label ?? "bank"} mein kam se kam ${minOwn}% (Rs. ${Math.round((cost.total * minOwn) / 100).toLocaleString("en-IN")}) chahiye. Term loan + CC ka jod utna kam karein.`,
    );
  }
  if (means.ccLimit > cost.workingCapital + 1 && cost.workingCapital > 0) {
    out.push(`CC limit (Rs. ${means.ccLimit.toLocaleString("en-IN")}) working capital zaroorat (Rs. ${cost.workingCapital.toLocaleString("en-IN")}) se zyada hai. Bank aam taur par CC zaroorat tak hi deta hai.`);
  }
  if (!input.promoters.some((p) => p.name.trim())) out.push("Promoter ka naam bharein.");
  if (cost.total > 0 && cost.preliminary > cost.total * 0.1) {
    out.push(
      `Preliminary / pre-operative kharcha Rs. ${cost.preliminary.toLocaleString("en-IN")} project cost ka ${Math.round((cost.preliminary / cost.total) * 100)}% hai. Ye aam taur par 2–5% hota hai; machine ho to item ka head "Plant & machinery" chuniye (isse depreciation sahi lagega).`,
    );
  }
  const lead = input.promoters.find((p) => p.name.trim());
  if (lead && !lead.qualification.trim()) out.push("Promoter ki qualification khaali hai. Bank aur yojana dono dekhte hain.");
  if (lead && !lead.experience.trim()) out.push("Promoter ka anubhav (experience) khaali hai. Promoter profile kamzor dikhegi.");
  for (const head of missingCostHeads(input)) out.push(`Kharcha nahi bhara: ${head.label}. Asli figure bharein ya "Missing kharche estimate se bharein" dabayein.`);
  const pending = input.capitalItems.filter((i) => !NON_DEPRECIABLE.includes(i.kind) && itemAmount(i) > 0 && !(i.supplier ?? "").trim());
  if (pending.length) out.push(`${pending.length} machine / item ka supplier aur quotation nahi bhara; report mein "Quotation pending" chhapega.`);
  const tenureYears = Math.ceil(pos(input.tenureYears));
  if (tenureYears > rows.length) out.push(`Loan ${tenureYears} saal ka hai lekin projection ${rows.length} saal ka. Projection ke saal badhayein.`);
  if (input.taxRegime === "manual" && pos(input.taxPct) === 0 && rows.some((r) => r.profitBeforeTax > 0)) out.push("Tax 0% haath se rakha hai. Constitution ke hisaab se tax ke liye 'New regime' chunein.");
  if (input.repaymentMethod === "emi" && input.repaymentFrequency === "quarterly") out.push("Quarterly EMI chuna hai: byaaj har mahine, kisht har teen mahine. Bank se confirm karein.");
  return out;
}

function dataGapsFor(input: DprInput, report: DprReport): string[] {
  const out: string[] = [];
  const estimates = input.overheads.filter((o) => o.estimated && pos(o.monthly) > 0);
  if (estimates.length) out.push(`Estimated running costs (to be replaced with actual figures): ${estimates.map((o) => o.name).join(", ")}.`);
  for (const head of missingCostHeads(input)) out.push(`No amount entered for ${head.english}; the projections exclude it.`);
  const pending = input.capitalItems.filter((i) => !NON_DEPRECIABLE.includes(i.kind) && itemAmount(i) > 0 && !(i.supplier ?? "").trim());
  if (pending.length) out.push(`Supplier quotations pending for ${pending.length} item(s): ${pending.map((i) => i.description).join("; ")}. Rates are indicative market rates.`);
  const lead = input.promoters.find((p) => p.name.trim());
  if (lead && !lead.qualification.trim()) out.push("Promoter's educational qualification not furnished.");
  if (lead && !lead.experience.trim()) out.push("Promoter's experience not furnished.");
  if (input.sector === "manufacturing" && input.rawMaterials.length && input.rawMaterials.every((m) => m.productIndex === null || m.productIndex === undefined || !pos(m.perUnit))) {
    out.push("Raw material quantities are estimates for the year and are not derived from a per-unit consumption norm.");
  }
  const scheme = schemeConfig(input.scheme);
  const unverified = [...scheme.terms.filter((t) => t.status === "verification_required").map((t) => t.rule), ...(scheme.age.status === "verification_required" ? ["Age limit"] : []), ...(scheme.education?.status === "verification_required" ? ["Educational qualification"] : [])];
  if (input.scheme !== "none" && unverified.length) out.push(`${scheme.short}: ${unverified.join(", ")} — verification required with the implementing agency / bank.`);
  if (report.means.subsidy > 0) out.push(`Subsidy of Rs. ${(report.means.subsidy / 100000).toFixed(2)} lakh is back-ended and subject to sanction by the implementing agency; it is not a source of funds for setting up the project.`);
  return out;
}

/* ─────────────────────────────────────────────────────────────────────────
   Sensitivity
   ───────────────────────────────────────────────────────────────────────── */

export type SensitivityCase = { label: string; averageDscr: number | null; minimumDscr: number | null; firstYearProfit: number; breakEvenPct: number | null };

/** The stresses banks usually ask for: lower volumes, dearer running costs, a rate rise, and two together. */
export function sensitivityOf(input: DprInput): SensitivityCase[] {
  const run = (label: string, change: (i: DprInput) => DprInput): SensitivityCase => {
    const r = buildDpr(change(input));
    return { label, averageDscr: r.averageDscr, minimumDscr: r.minimumDscr, firstYearProfit: r.years[0]?.netProfit ?? 0, breakEvenPct: r.breakEven?.bepCapacityPct ?? null };
  };
  const lowerVolume = (i: DprInput) => ({ ...i, utilisationPct: i.utilisationPct.map((u) => u * 0.9) });
  const dearerCosts = (i: DprInput) => ({
    ...i,
    staff: i.staff.map((s) => ({ ...s, monthlySalary: s.monthlySalary * 1.1 })),
    overheads: i.overheads.map((o) => ({ ...o, monthly: o.monthly * 1.1 })),
  });
  const higherRate = (i: DprInput) => ({ ...i, termLoanInterestPct: i.termLoanInterestPct + 1, ccInterestPct: i.ccInterestPct + 1 });
  return [
    run("Base case (as projected)", (i) => i),
    run("Sales volume 10% lower", lowerVolume),
    run("Wages and overheads 10% higher", dearerCosts),
    run("Interest rate 1% higher", higherRate),
    run("Lower volume and higher costs together", (i) => dearerCosts(lowerVolume(i))),
  ];
}
