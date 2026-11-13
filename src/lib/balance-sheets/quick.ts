/**
 * Quick balance sheet: the few figures a customer actually knows (or that
 * the ITR shows) turned into a full Trading and P&L Account and a Balance
 * Sheet that tallies, plus projections and the new loan.
 *
 * What is asked:
 *   • last year's turnover and net profit (ITR), and — if known — closing
 *     stock, cash and bank, machinery / vehicle value and loan outstanding;
 *   • for a new business, the expected first-year sales instead;
 *   • the new loan: machinery / equipment cost, working capital and scheme.
 *
 * Everything else is the usual break-up for the kind of business (trading,
 * manufacturing, service): gross margin, stock / debtor / creditor days,
 * expense heads. The capital account is the balancing figure, as a
 * proprietor's capital account is in books written up from an ITR.
 */

import type { ActualFigures, Constitution, ProjectionAssumptions, SchemeId } from "./engine";
import { emptyActual } from "./engine";
import { schemeSuggestion, termsFor } from "./schemes";

export type BusinessKind = "trading" | "manufacturing" | "service";

export const BUSINESS_KINDS: { value: BusinessKind; label: string }[] = [
  { value: "trading", label: "Trading (dukaan, kirana, kapda, hardware, medical...)" },
  { value: "manufacturing", label: "Manufacturing (udyog: atta chakki, bakery, furniture...)" },
  { value: "service", label: "Service (repair, salon, coaching, transport...)" },
];

/** The usual shape of a small business of each kind. */
const PRESET: Record<
  BusinessKind,
  { grossMarginPct: number; directPct: number; stockDays: number; debtorDays: number; creditorDays: number; cashPct: number; expenseSplit: { salaries: number; rent: number; admin: number; other: number } }
> = {
  trading: { grossMarginPct: 12, directPct: 1, stockDays: 45, debtorDays: 20, creditorDays: 25, cashPct: 3, expenseSplit: { salaries: 0.4, rent: 0.25, admin: 0.2, other: 0.15 } },
  manufacturing: { grossMarginPct: 22, directPct: 8, stockDays: 45, debtorDays: 30, creditorDays: 30, cashPct: 3, expenseSplit: { salaries: 0.45, rent: 0.2, admin: 0.2, other: 0.15 } },
  service: { grossMarginPct: 45, directPct: 25, stockDays: 5, debtorDays: 15, creditorDays: 10, cashPct: 5, expenseSplit: { salaries: 0.5, rent: 0.25, admin: 0.15, other: 0.1 } },
};

export type QuickInput = {
  kind: BusinessKind;
  constitution: Constitution;
  /** Start year of the actual financial year (2025 = FY 2025-26). */
  hasActual: boolean;
  /** Last year's turnover as per ITR (actual) or expected first-year sales (new business). */
  sales: number;
  /** Net profit as per ITR, before the owner's income tax. Ignored for a new business. */
  netProfit: number;
  /** Optional facts about the last year-end; null = usual for the kind of business. */
  closingStock: number | null;
  cashAndBank: number | null;
  fixedAssets: number | null;
  loanOutstanding: number | null;
  /** The new loan. */
  scheme: SchemeId;
  schemeArea: "urban" | "rural";
  schemeCategory: "general" | "special";
  machineryCost: number;
  workingCapital: number;
  /** Own margin %; null = the scheme's (25% without a scheme). */
  ownPct: number | null;
  interestPct: number;
  tenureYears: number;
  salesGrowthPct: number;
};

export type QuickResult = {
  actual: ActualFigures;
  projection: Partial<ProjectionAssumptions>;
  loanAmount: number;
  loanPurpose: string;
};

const r = (v: number) => Math.round(v);
const pos = (v: number | null | undefined) => (Number.isFinite(v) && (v as number) > 0 ? (v as number) : 0);

/** Income tax on a firm / company's profit; a proprietor's tax is personal and not in the books. */
function businessTax(constitution: Constitution, profit: number) {
  if (profit <= 0) return 0;
  if (constitution === "partnership" || constitution === "llp") return r(profit * 0.312);
  if (constitution === "private_limited" || constitution === "opc") return r(profit * 0.2517);
  return 0;
}

/** Last year's books from the turnover and profit; the capital account balances them. */
function actualFrom(q: QuickInput): ActualFigures | string {
  const p = PRESET[q.kind];
  const sales = pos(q.sales);
  const profit = q.netProfit;
  if (!(sales > 0)) return "Pichhle saal ka turnover (ITR wala) bhariye.";
  if (!Number.isFinite(profit)) return "Net profit bhariye (ITR mein jo dikhaya).";
  if (profit >= sales) return "Net profit turnover se kam hona chahiye.";

  const fixedAssets = pos(q.fixedAssets);
  const termLoan = pos(q.loanOutstanding);
  // Written down value at 15%: this year's depreciation on what the asset was worth.
  const depreciation = r((fixedAssets * 0.15) / 0.85);
  const interest = r(termLoan * 0.1);
  const tax = businessTax(q.constitution, profit);

  // Gross profit must at least carry the expenses below it.
  const floorExpenses = r(sales * 0.02);
  const grossProfit = Math.max(r((sales * p.grossMarginPct) / 100), profit + depreciation + interest + floorExpenses);
  const indirect = grossProfit - profit - depreciation - interest;
  const salaries = r(indirect * p.expenseSplit.salaries);
  const rent = r(indirect * p.expenseSplit.rent);
  const adminExpenses = r(indirect * p.expenseSplit.admin);
  const otherExpenses = indirect - salaries - rent - adminExpenses;

  const costOfSales = sales - grossProfit;
  const directExpenses = r((sales * p.directPct) / 100);
  const closingStock = q.closingStock === null ? r((costOfSales * p.stockDays) / 365) : pos(q.closingStock);
  const openingStock = r(closingStock / (1 + q.salesGrowthPct / 100));
  const purchases = costOfSales - directExpenses - openingStock + closingStock;
  if (purchases < 0) return "Stock bahut zyada hai turnover ke hisaab se. Stock check kariye.";

  const debtors = r((sales * p.debtorDays) / 365);
  const creditors = r((purchases * p.creditorDays) / 365);
  const cashAndBank = q.cashAndBank === null ? r((sales * p.cashPct) / 100) : pos(q.cashAndBank);

  const assets = fixedAssets + closingStock + debtors + cashAndBank;
  const closingCapital = assets - termLoan - creditors;
  if (closingCapital <= 0)
    return "Loan outstanding aur udhaar, saari sampatti (machinery, stock, cash, udhaar bikri) se zyada ho rahe hain. Loan ya stock / cash ke aankde check kariye.";

  const netAfterTax = profit - tax;
  // Drawings: what the owner takes home (personal expenses, tax); never more
  // than leaves a positive opening capital.
  const companyLike = q.constitution === "private_limited" || q.constitution === "opc";
  let drawings = companyLike ? 0 : r(Math.max(0, netAfterTax) * 0.4);
  let openingCapital = closingCapital - netAfterTax + drawings;
  if (openingCapital < 0) {
    drawings = Math.max(0, drawings - openingCapital);
    openingCapital = closingCapital - netAfterTax + drawings;
  }
  let capitalIntroduced = 0;
  if (openingCapital < 0) {
    // A loss bigger than the capital: the owner must have put money in.
    capitalIntroduced = -openingCapital;
    openingCapital = 0;
  }

  return {
    ...emptyActual(),
    sales,
    otherIncome: 0,
    openingStock,
    purchases,
    directExpenses,
    closingStock,
    salaries,
    rent,
    adminExpenses,
    otherExpenses,
    interest,
    depreciation,
    tax,
    openingCapital: r(openingCapital),
    capitalIntroduced: r(capitalIntroduced),
    drawings,
    fixedAssets,
    investments: 0,
    debtors,
    cashAndBank,
    otherCurrentAssets: 0,
    termLoan,
    unsecuredLoans: 0,
    creditors,
    otherCurrentLiabilities: 0,
  };
}

export function quickBalanceSheet(q: QuickInput): QuickResult | string {
  const p = PRESET[q.kind];
  let actual: ActualFigures;
  if (q.hasActual) {
    const built = actualFrom(q);
    if (typeof built === "string") return built;
    actual = built;
  } else {
    if (!(pos(q.sales) > 0)) return "Pehle saal ki andaazit sales bhariye.";
    actual = emptyActual();
  }

  const machinery = pos(q.machineryCost);
  const workingCapital = pos(q.workingCapital);
  const schemeSector = q.kind;
  const terms = q.scheme === "none" ? null : termsFor({ scheme: q.scheme, schemeSector, schemeArea: q.schemeArea, schemeCategory: q.schemeCategory });
  const ownPct = q.ownPct ?? terms?.ownContributionPct ?? 25;
  // Margin on both parts: TL = machinery x (1 - margin), CC = working capital x (1 - margin).
  const plan = terms
    ? schemeSuggestion({ ...terms, ownContributionPct: ownPct }, { fixedAssets: machinery, workingCapital })
    : schemeSuggestion({ ownContributionPct: ownPct, subsidyPct: 0, subsidyCap: null } as Parameters<typeof schemeSuggestion>[0], { fixedAssets: machinery, workingCapital });

  // Projection: the actual year's own ratios drive it; a new business uses the usual ones.
  const projection: Partial<ProjectionAssumptions> = {
    years: 5,
    salesGrowthPct: q.salesGrowthPct,
    expenseGrowthPct: 5,
    depreciationPct: 15,
    taxPct: q.constitution === "partnership" || q.constitution === "llp" ? 31.2 : q.constitution === "private_limited" || q.constitution === "opc" ? 25.17 : 0,
    drawingsPerYear: q.hasActual ? actual.drawings : 0,
    capitalIntroducedYear1: plan.ownContribution,
    newFixedAssets: machinery,
    newTermLoan: plan.termLoan,
    loanInterestPct: q.interestPct,
    loanTenureYears: q.tenureYears,
    existingLoanRepaymentPerYear: actual.termLoan > 0 ? r(actual.termLoan / 5) : 0,
    existingLoanInterestPct: actual.termLoan > 0 ? 10 : 0,
    scheme: q.scheme,
    schemeSector,
    schemeArea: q.schemeArea,
    schemeCategory: q.schemeCategory,
    workingCapitalNeed: workingCapital,
    ccLimit: plan.ccLimit,
    ccInterestPct: q.interestPct,
    subsidyAmount: terms ? plan.subsidy : 0,
    interestSubventionPct: terms?.interestSubventionPct ?? 0,
    interestSubventionYears: terms?.interestSubventionYears ?? 0,
    // Blank (null) = read from the actual year.
    year1Sales: q.hasActual ? null : pos(q.sales),
    materialCostPct: q.hasActual ? null : 100 - p.grossMarginPct - p.directPct,
    indirectExpensesYear1: q.hasActual ? null : r((pos(q.sales) * (p.grossMarginPct + p.directPct - 8)) / 100),
    otherIncomePerYear: null,
    debtorDays: q.hasActual ? null : p.debtorDays,
    creditorDays: q.hasActual ? null : p.creditorDays,
    stockDays: q.hasActual ? null : p.stockDays,
  };

  const loanAmount = plan.termLoan + plan.ccLimit;
  const parts = [machinery > 0 ? "machinery / equipment" : "", workingCapital > 0 ? "working capital" : ""].filter(Boolean);
  return { actual, projection, loanAmount, loanPurpose: parts.length ? `Loan for ${parts.join(" and ")}` : "" };
}
