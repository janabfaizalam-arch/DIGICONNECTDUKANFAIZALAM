import type { Constitution, SchemeArea, SchemeCategory, SchemeId, SchemeSector } from "@/lib/balance-sheets/engine";
import { mudraCategory, schemeTerms, type SchemeTerms } from "@/lib/balance-sheets/schemes";

/**
 * Detailed Project Report (DPR) calculations.
 *
 * A DPR answers one question for a bank: can this new project repay its
 * loan? It works forward from what the business will make and sell —
 * capacity, utilisation, prices, raw material, staff and overheads — to
 * a projected profit and loss, balance sheet, repayment schedule, DSCR and
 * break-even point. Every figure is in rupees.
 *
 * Scheme presets (PMEGP, CM-YUVA, MYSY, Mudra) come from the balance sheet
 * module so the two never disagree on a subsidy or own-contribution rate.
 */

export const ASSET_KINDS = [
  { value: "land", label: "Land", defaultRate: 0 },
  { value: "building", label: "Building / shed / civil work", defaultRate: 10 },
  { value: "machinery", label: "Plant & machinery", defaultRate: 15 },
  { value: "furniture", label: "Furniture & fixtures", defaultRate: 10 },
  { value: "electrical", label: "Electrical installation", defaultRate: 10 },
  { value: "vehicle", label: "Vehicle", defaultRate: 15 },
  { value: "computer", label: "Computer & IT equipment", defaultRate: 40 },
  { value: "preliminary", label: "Preliminary & pre-operative expenses", defaultRate: 0 },
  { value: "other", label: "Other fixed assets", defaultRate: 15 },
] as const;

export type AssetKind = (typeof ASSET_KINDS)[number]["value"];

export type CapitalItem = { kind: AssetKind; description: string; quantity: number; rate: number };
export type Product = { name: string; unit: string; capacity: number; price: number };
export type RawMaterial = { name: string; unit: string; quantity: number; rate: number };
export type StaffRow = { role: string; count: number; monthlySalary: number; direct: boolean };
/** A monthly running cost. `variable` costs are entered at 100% capacity and scale with utilisation. */
export type Overhead = { name: string; monthly: number; variable: boolean; direct: boolean };

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

export type DprInput = {
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
  /** WDV depreciation rate per asset kind, percent. Missing kinds use the default. */
  depreciationRates: Partial<Record<AssetKind, number>>;
  /** Years over which preliminary expenses are written off. */
  preliminaryWriteOffYears: number;

  products: Product[];
  /** Capacity utilisation for each year, percent. */
  utilisationPct: number[];
  /** Yearly change in selling price; raw material rates follow it. */
  priceGrowthPct: number;
  rawMaterials: RawMaterial[];
  staff: StaffRow[];
  overheads: Overhead[];
  /** Yearly increase in salaries and overheads. */
  costGrowthPct: number;

  /** Holding periods for the working capital calculation, in days. */
  rawMaterialDays: number;
  finishedGoodsDays: number;
  debtorDays: number;
  creditorDays: number;

  /** Does the project cost include land? PMEGP and MYSY exclude it. */
  includeLand: boolean;
  /** Own contribution as a percent of project cost; null takes the scheme's rate. */
  ownContributionPct: number | null;
  /** Typed loan amounts override the automatic split; null works them out. */
  termLoanOverride: number | null;
  ccLimitOverride: number | null;
  subsidyOverride: number | null;
  termLoanInterestPct: number;
  ccInterestPct: number;
  /** Total term loan tenure in years, including the moratorium. */
  tenureYears: number;
  moratoriumMonths: number;
  /** null takes the scheme's subvention. */
  interestSubventionPct: number | null;
  interestSubventionYears: number | null;
  taxPct: number;
  drawingsPerYear: number;

  narrative: Partial<Record<NarrativeKey, string>>;
};

export const NARRATIVE_KEYS = [
  "introduction",
  "promoters",
  "project",
  "market",
  "process",
  "swot",
  "implementation",
  "conclusion",
] as const;
export type NarrativeKey = (typeof NARRATIVE_KEYS)[number];

/* ─────────────────────────────────────────────────────────────────────────
   Output
   ───────────────────────────────────────────────────────────────────────── */

export type CostLine = { kind: AssetKind; label: string; amount: number };

export type ProjectCost = {
  lines: CostLine[];
  land: number;
  fixedCapital: number;
  preliminary: number;
  workingCapital: number;
  /** What the scheme and the bank count as project cost. */
  total: number;
  /** Land bought outside the project cost (paid by the promoter). */
  landOutside: number;
};

export type MeansOfFinance = {
  ownContribution: number;
  ownContributionPct: number;
  termLoan: number;
  ccLimit: number;
  bankLoan: number;
  total: number;
  /** Means minus cost; non-zero when typed loans do not add up. */
  gap: number;
  subsidy: number;
};

export type WorkingCapital = {
  rawMaterialStock: number;
  finishedGoods: number;
  debtors: number;
  creditors: number;
  requirement: number;
};

export type YearRow = {
  fyStart: number;
  label: string;
  utilisationPct: number;
  sales: number;
  rawMaterial: number;
  directWages: number;
  directOverheads: number;
  costOfProduction: number;
  grossProfit: number;
  indirectSalaries: number;
  indirectOverheads: number;
  depreciation: number;
  preliminaryWrittenOff: number;
  termLoanInterest: number;
  ccInterest: number;
  interestSubvention: number;
  profitBeforeTax: number;
  tax: number;
  netProfit: number;
  cashAccrual: number;
  principalRepaid: number;
  dscr: number | null;
  // Balance sheet at year end
  capital: number;
  subsidyReserve: number;
  termLoanOutstanding: number;
  ccLoan: number;
  creditors: number;
  totalLiabilities: number;
  netFixedAssets: number;
  preliminaryUnamortised: number;
  stock: number;
  debtorsBalance: number;
  subsidyDeposit: number;
  cash: number;
  totalAssets: number;
  currentRatio: number | null;
};

export type RepaymentRow = { fyStart: number; label: string; opening: number; interest: number; principal: number; closing: number };

export type DepreciationRow = { kind: AssetKind; label: string; ratePct: number; cost: number; perYear: number[]; closing: number };

export type BreakEven = {
  fyStart: number;
  label: string;
  fixedCosts: number;
  variableCosts: number;
  contribution: number;
  bepSales: number;
  /** Break-even as a share of installed capacity, percent. */
  bepCapacityPct: number | null;
  /** Cash break-even (without depreciation and write-offs), percent of capacity. */
  cashBepCapacityPct: number | null;
};

export type DprReport = {
  cost: ProjectCost;
  workingCapital: WorkingCapital;
  means: MeansOfFinance;
  years: YearRow[];
  repayment: RepaymentRow[];
  depreciation: DepreciationRow[];
  breakEven: BreakEven | null;
  averageDscr: number | null;
  minimumDscr: number | null;
  paybackYears: number | null;
  scheme: SchemeTerms | null;
  mudraCategory: string | null;
  installedCapacityValue: number;
  warnings: string[];
};

/* ─────────────────────────────────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────────────────────────────────── */

const num = (value: number | null | undefined) => (typeof value === "number" && Number.isFinite(value) ? value : 0);
const pos = (value: number | null | undefined) => Math.max(0, num(value));
const round = (value: number) => Math.round(value * 100) / 100;
const DAYS = 365;

export function fyLabel(fyStart: number) {
  return `${fyStart}-${String((fyStart + 1) % 100).padStart(2, "0")}`;
}

export function assetLabel(kind: AssetKind) {
  return ASSET_KINDS.find((entry) => entry.value === kind)?.label ?? "Other";
}

export function defaultDepreciationRate(kind: AssetKind) {
  return ASSET_KINDS.find((entry) => entry.value === kind)?.defaultRate ?? 15;
}

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

/** Annual operating figures before finance costs, for one year. */
function operations(input: DprInput, index: number) {
  const util = utilisationFor(input, index) / 100;
  const priceFactor = Math.pow(1 + num(input.priceGrowthPct) / 100, index);
  const costFactor = Math.pow(1 + num(input.costGrowthPct) / 100, index);

  const sales = input.products.reduce((sum, p) => sum + pos(p.capacity) * util * pos(p.price), 0) * priceFactor;
  // Raw material prices move with the selling price, so the margin on each
  // unit holds; the cost growth applies to wages and overheads.
  const rawMaterial = input.rawMaterials.reduce((sum, m) => sum + pos(m.quantity) * util * pos(m.rate), 0) * priceFactor;
  const wages = (direct: boolean) =>
    input.staff.filter((s) => s.direct === direct).reduce((sum, s) => sum + pos(s.count) * pos(s.monthlySalary) * 12, 0) * costFactor;
  const overheads = (direct: boolean) =>
    input.overheads
      .filter((o) => o.direct === direct)
      .reduce((sum, o) => sum + pos(o.monthly) * 12 * (o.variable ? util : 1), 0) * costFactor;
  const variableOverheads =
    input.overheads.filter((o) => o.variable).reduce((sum, o) => sum + pos(o.monthly) * 12 * util, 0) * costFactor;

  return {
    util,
    sales,
    rawMaterial,
    directWages: wages(true),
    indirectSalaries: wages(false),
    directOverheads: overheads(true),
    indirectOverheads: overheads(false),
    variableOverheads,
  };
}

/** Working capital for one operating cycle in the first year. */
export function workingCapitalOf(input: DprInput): WorkingCapital {
  const year1 = operations(input, 0);
  const costOfProduction = year1.rawMaterial + year1.directWages + year1.directOverheads;
  const rawMaterialStock = (year1.rawMaterial * pos(input.rawMaterialDays)) / DAYS;
  const finishedGoods = (costOfProduction * pos(input.finishedGoodsDays)) / DAYS;
  const debtors = (year1.sales * pos(input.debtorDays)) / DAYS;
  const creditors = (year1.rawMaterial * pos(input.creditorDays)) / DAYS;
  return {
    rawMaterialStock: round(rawMaterialStock),
    finishedGoods: round(finishedGoods),
    debtors: round(debtors),
    creditors: round(creditors),
    requirement: round(Math.max(0, rawMaterialStock + finishedGoods + debtors - creditors)),
  };
}

export function projectCostOf(input: DprInput, workingCapital = workingCapitalOf(input)): ProjectCost {
  const byKind = new Map<AssetKind, number>();
  for (const item of input.capitalItems) byKind.set(item.kind, (byKind.get(item.kind) ?? 0) + itemAmount(item));
  const lines: CostLine[] = ASSET_KINDS.filter((k) => (byKind.get(k.value) ?? 0) > 0).map((k) => ({
    kind: k.value,
    label: k.label,
    amount: round(byKind.get(k.value) ?? 0),
  }));
  const land = byKind.get("land") ?? 0;
  const preliminary = byKind.get("preliminary") ?? 0;
  const capital = [...byKind.entries()].filter(([kind]) => kind !== "land" && kind !== "preliminary").reduce((sum, [, v]) => sum + v, 0);
  const includedLand = input.includeLand ? land : 0;
  return {
    lines,
    land: round(land),
    fixedCapital: round(capital + includedLand),
    preliminary: round(preliminary),
    workingCapital: workingCapital.requirement,
    total: round(capital + includedLand + preliminary + workingCapital.requirement),
    landOutside: round(input.includeLand ? 0 : land),
  };
}

export function meansOf(input: DprInput, cost: ProjectCost, scheme: SchemeTerms | null): MeansOfFinance {
  const ownPct = input.ownContributionPct ?? scheme?.ownContributionPct ?? 25;
  const ownContribution = round((cost.total * pos(ownPct)) / 100);
  const bankNeed = Math.max(0, cost.total - ownContribution);
  const wcShare = cost.total > 0 ? cost.workingCapital / cost.total : 0;
  const autoCc = round(bankNeed * wcShare);
  const ccLimit = input.ccLimitOverride ?? autoCc;
  const termLoan = input.termLoanOverride ?? round(bankNeed - autoCc);

  const rawSubsidy = scheme ? (cost.total * scheme.subsidyPct) / 100 : 0;
  const autoSubsidy = scheme ? round(scheme.subsidyCap === null ? rawSubsidy : Math.min(rawSubsidy, scheme.subsidyCap)) : 0;
  const subsidy = input.subsidyOverride ?? autoSubsidy;

  const total = round(ownContribution + pos(termLoan) + pos(ccLimit));
  return {
    ownContribution,
    ownContributionPct: pos(ownPct),
    termLoan: round(pos(termLoan)),
    ccLimit: round(pos(ccLimit)),
    bankLoan: round(pos(termLoan) + pos(ccLimit)),
    total,
    gap: round(total - cost.total),
    subsidy: round(pos(subsidy)),
  };
}

/**
 * Term loan schedule by financial year: interest only during the
 * moratorium, then equal monthly principal until the tenure ends. Interest
 * is worked out month by month on the balance outstanding.
 */
export function repaymentSchedule(input: DprInput, loan: number): RepaymentRow[] {
  const months = Math.max(1, Math.round(pos(input.tenureYears) * 12));
  const moratorium = Math.min(months - 1, Math.max(0, Math.round(pos(input.moratoriumMonths))));
  const repayingMonths = months - moratorium;
  const instalment = loan / repayingMonths;
  const rate = pos(input.termLoanInterestPct) / 100 / 12;
  const totalYears = Math.max(Math.ceil(months / 12), Math.round(pos(input.years)) || 1);

  const rows: RepaymentRow[] = [];
  let balance = loan;
  for (let year = 0; year < totalYears; year += 1) {
    const opening = balance;
    let interest = 0;
    let principal = 0;
    for (let m = 0; m < 12; m += 1) {
      const month = year * 12 + m;
      if (month >= months || balance <= 0.004) break;
      interest += balance * rate;
      if (month >= moratorium) {
        const pay = Math.min(balance, instalment);
        principal += pay;
        balance -= pay;
      }
    }
    rows.push({ fyStart: input.startFy + year, label: fyLabel(input.startFy + year), opening: round(opening), interest: round(interest), principal: round(principal), closing: round(Math.max(0, balance)) });
  }
  return rows;
}

/** Written-down-value depreciation by asset kind, full year from year one. */
export function depreciationSchedule(input: DprInput, years: number): DepreciationRow[] {
  const byKind = new Map<AssetKind, number>();
  for (const item of input.capitalItems) {
    if (item.kind === "land" || item.kind === "preliminary") continue;
    byKind.set(item.kind, (byKind.get(item.kind) ?? 0) + itemAmount(item));
  }
  return [...byKind.entries()]
    .filter(([, cost]) => cost > 0)
    .map(([kind, cost]) => {
      const ratePct = pos(input.depreciationRates[kind] ?? defaultDepreciationRate(kind));
      let wdv = cost;
      const perYear: number[] = [];
      for (let y = 0; y < years; y += 1) {
        const dep = (wdv * ratePct) / 100;
        perYear.push(round(dep));
        wdv -= dep;
      }
      return { kind, label: assetLabel(kind), ratePct, cost: round(cost), perYear, closing: round(wdv) };
    });
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
  const repayment = repaymentSchedule(input, means.termLoan);
  const depreciation = depreciationSchedule(input, years);
  const writeOffYears = Math.max(1, Math.round(pos(input.preliminaryWriteOffYears)) || 5);

  const subventionPct = Math.min(100, pos(input.interestSubventionPct ?? scheme?.interestSubventionPct ?? 0));
  const subventionYears = Math.round(pos(input.interestSubventionYears ?? scheme?.interestSubventionYears ?? 0));

  const fixedAssetsCost = cost.lines.filter((l) => l.kind !== "preliminary").reduce((sum, l) => sum + l.amount, 0);
  const promoterLand = cost.landOutside;

  const rows: YearRow[] = [];
  let capital = means.ownContribution + promoterLand;
  let netFixed = fixedAssetsCost;
  let prelimLeft = cost.preliminary;

  for (let index = 0; index < years; index += 1) {
    const fyStart = input.startFy + index;
    const op = operations(input, index);
    const dep = depreciation.reduce((sum, d) => sum + (d.perYear[index] ?? 0), 0);
    const prelimWo = index < writeOffYears ? Math.min(prelimLeft, cost.preliminary / writeOffYears) : 0;
    const loan = repayment[index] ?? { interest: 0, principal: 0, closing: 0 };
    const ccInterest = (means.ccLimit * pos(input.ccInterestPct)) / 100;
    const subvention = index < subventionYears ? ((loan.interest + ccInterest) * subventionPct) / 100 : 0;

    const costOfProduction = op.rawMaterial + op.directWages + op.directOverheads;
    const grossProfit = op.sales - costOfProduction;
    const pbt = grossProfit - op.indirectSalaries - op.indirectOverheads - dep - prelimWo - loan.interest - ccInterest + subvention;
    const tax = (Math.max(0, pbt) * pos(input.taxPct)) / 100;
    const pat = pbt - tax;
    const cashAccrual = pat + dep + prelimWo;
    const service = loan.interest + loan.principal;
    const dscr = service > 0 ? (cashAccrual + loan.interest) / service : null;

    capital = capital + pat - pos(input.drawingsPerYear);
    netFixed -= dep;
    prelimLeft -= prelimWo;

    const stock = (op.rawMaterial * pos(input.rawMaterialDays)) / DAYS + (costOfProduction * pos(input.finishedGoodsDays)) / DAYS;
    const debtors = (op.sales * pos(input.debtorDays)) / DAYS;
    const creditors = (op.rawMaterial * pos(input.creditorDays)) / DAYS;
    const subsidy = means.subsidy;

    const liabilitiesExCash = capital + subsidy + loan.closing + means.ccLimit + creditors;
    const assetsExCash = netFixed + prelimLeft + stock + debtors + subsidy;
    const cash = liabilitiesExCash - assetsExCash;
    const currentAssets = stock + debtors + Math.max(0, cash);
    const currentLiabilities = creditors + means.ccLimit;

    rows.push({
      fyStart,
      label: fyLabel(fyStart),
      utilisationPct: round(op.util * 100),
      sales: round(op.sales),
      rawMaterial: round(op.rawMaterial),
      directWages: round(op.directWages),
      directOverheads: round(op.directOverheads),
      costOfProduction: round(costOfProduction),
      grossProfit: round(grossProfit),
      indirectSalaries: round(op.indirectSalaries),
      indirectOverheads: round(op.indirectOverheads),
      depreciation: round(dep),
      preliminaryWrittenOff: round(prelimWo),
      termLoanInterest: round(loan.interest),
      ccInterest: round(ccInterest),
      interestSubvention: round(subvention),
      profitBeforeTax: round(pbt),
      tax: round(tax),
      netProfit: round(pat),
      cashAccrual: round(cashAccrual),
      principalRepaid: round(loan.principal),
      dscr: dscr === null ? null : round(dscr),
      capital: round(capital),
      subsidyReserve: round(subsidy),
      termLoanOutstanding: round(loan.closing),
      ccLoan: round(means.ccLimit),
      creditors: round(creditors),
      totalLiabilities: round(liabilitiesExCash),
      netFixedAssets: round(netFixed),
      preliminaryUnamortised: round(prelimLeft),
      stock: round(stock),
      debtorsBalance: round(debtors),
      subsidyDeposit: round(subsidy),
      cash: round(cash),
      totalAssets: round(assetsExCash + cash),
      currentRatio: currentLiabilities > 0 ? round(currentAssets / currentLiabilities) : null,
    });
  }

  const dscrs = rows.map((r) => r.dscr).filter((v): v is number => v !== null);
  const averageDscr = dscrs.length ? round(dscrs.reduce((a, b) => a + b, 0) / dscrs.length) : null;
  const minimumDscr = dscrs.length ? Math.min(...dscrs) : null;
  const breakEven = breakEvenOf(input, rows);
  const avgAccrual = rows.length ? rows.reduce((sum, r) => sum + r.cashAccrual, 0) / rows.length : 0;
  const paybackYears = avgAccrual > 0 ? round(cost.total / avgAccrual) : null;
  const installedCapacityValue = round(input.products.reduce((sum, p) => sum + pos(p.capacity) * pos(p.price), 0));
  const mudra = input.scheme === "mudra" ? (mudraCategory(means.bankLoan)?.name ?? null) : null;

  return {
    cost,
    workingCapital,
    means,
    years: rows,
    repayment,
    depreciation,
    breakEven,
    averageDscr,
    minimumDscr,
    paybackYears,
    scheme,
    mudraCategory: mudra,
    installedCapacityValue,
    warnings: warningsFor(input, { cost, means, rows, averageDscr, scheme }),
  };
}

/**
 * Break-even in the year operations settle (the third year, or the last
 * if the report is shorter). Raw material and variable overheads are the
 * variable costs; wages, salaries, fixed overheads, depreciation and
 * interest are fixed.
 */
function breakEvenOf(input: DprInput, rows: YearRow[]): BreakEven | null {
  if (!rows.length) return null;
  const index = Math.min(2, rows.length - 1);
  const row = rows[index];
  const op = operations(input, index);
  const variable = op.rawMaterial + op.variableOverheads;
  const fixedCash =
    row.directWages + row.indirectSalaries + (row.directOverheads + row.indirectOverheads - op.variableOverheads) + row.termLoanInterest + row.ccInterest - row.interestSubvention;
  const fixed = fixedCash + row.depreciation + row.preliminaryWrittenOff;
  const contribution = row.sales - variable;
  if (row.sales <= 0 || contribution <= 0) {
    return { fyStart: row.fyStart, label: row.label, fixedCosts: round(fixed), variableCosts: round(variable), contribution: round(contribution), bepSales: 0, bepCapacityPct: null, cashBepCapacityPct: null };
  }
  const pvRatio = contribution / row.sales;
  const bepSales = fixed / pvRatio;
  const utilisation = row.utilisationPct;
  return {
    fyStart: row.fyStart,
    label: row.label,
    fixedCosts: round(fixed),
    variableCosts: round(variable),
    contribution: round(contribution),
    bepSales: round(bepSales),
    bepCapacityPct: round((fixed / contribution) * utilisation),
    cashBepCapacityPct: round((fixedCash / contribution) * utilisation),
  };
}

function warningsFor(
  input: DprInput,
  ctx: { cost: ProjectCost; means: MeansOfFinance; rows: YearRow[]; averageDscr: number | null; scheme: SchemeTerms | null },
): string[] {
  const out: string[] = [];
  const { cost, means, rows, averageDscr, scheme } = ctx;
  if (!input.products.length || rows[0]?.sales <= 0) out.push("Products / services aur unki capacity aur rate bharein, tabhi sales banegi.");
  if (cost.fixedCapital + cost.preliminary <= 0) out.push("Project ki machinery / capital items bharein.");
  if (Math.abs(means.gap) > 1) {
    out.push(`Means of finance project cost se Rs. ${Math.abs(means.gap).toLocaleString("en-IN")} ${means.gap > 0 ? "zyada" : "kam"} hai. Term loan / CC theek karein.`);
  }
  if (averageDscr !== null && averageDscr < 1.25) out.push(`Average DSCR ${averageDscr.toFixed(2)} hai. Zyaadatar bank kam se kam 1.25 dekhte hain.`);
  const losses = rows.filter((r) => r.netProfit < 0).map((r) => r.label);
  if (losses.length) out.push(`${losses.join(", ")} mein net loss dikh raha hai.`);
  const shortCash = rows.filter((r) => r.cash < 0).map((r) => r.label);
  if (shortCash.length) out.push(`${shortCash.join(", ")} mein cash kam pad raha hai. Capital ya working capital limit badhayein.`);
  if (scheme?.maxProjectCost && cost.total > scheme.maxProjectCost) {
    out.push(`${scheme.label} mein project cost Rs. ${scheme.maxProjectCost.toLocaleString("en-IN")} tak hi hota hai; ye project Rs. ${cost.total.toLocaleString("en-IN")} ka hai.`);
  }
  if (scheme?.maxLoan && means.bankLoan > scheme.maxLoan) {
    out.push(`${scheme.label} mein loan Rs. ${scheme.maxLoan.toLocaleString("en-IN")} tak milta hai; yahan Rs. ${means.bankLoan.toLocaleString("en-IN")} hai.`);
  }
  if (scheme?.needsComposite && (means.termLoan <= 0 || means.ccLimit <= 0)) out.push(`${scheme.label} mein loan composite hota hai: term loan aur CC dono chahiye.`);
  if ((input.scheme === "pmegp" || input.scheme === "mysy") && input.includeLand && cost.land > 0) {
    out.push("PMEGP / MYSY mein zameen project cost mein nahi gini jaati. 'Zameen project cost mein' ka tick hatayein.");
  }
  if (!input.promoters.some((p) => p.name.trim())) out.push("Promoter ka naam bharein.");
  return out;
}
