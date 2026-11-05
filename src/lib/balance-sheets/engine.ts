/**
 * Balance sheet engine.
 *
 * Turns the handful of figures an admin types in into a Trading and Profit &
 * Loss Account and a Balance Sheet for the last completed year (the actual
 * year) and for up to five projected years, in the layout Indian banks expect
 * in a loan file.
 *
 * Pure and deterministic: the admin form runs it live while typing, the
 * detail page runs it to render the statements, and the PDF route runs it
 * again, so all three always agree.
 *
 * Two rules decide the shape of everything below.
 *
 *   • The actual year is the customer's own figures. It is never adjusted to
 *     make it tally. If liabilities and assets differ, the difference is
 *     reported and the sheet cannot be marked final until somebody fixes the
 *     figures — a bank officer finds a plugged number faster than anyone.
 *
 *   • A projected year tallies by construction. Every item except cash is
 *     driven by an assumption; cash and bank is what the funds left over
 *     come to. If that comes out negative the business needs more money than
 *     the plan provides, and it is shown as a bank overdraft (a funding gap)
 *     rather than as negative cash.
 */

export type Constitution = "proprietorship" | "partnership" | "llp" | "private_limited" | "opc" | "other";

export const CONSTITUTIONS: { value: Constitution; label: string }[] = [
  { value: "proprietorship", label: "Proprietorship" },
  { value: "partnership", label: "Partnership Firm" },
  { value: "llp", label: "Limited Liability Partnership" },
  { value: "private_limited", label: "Private Limited Company" },
  { value: "opc", label: "One Person Company" },
  { value: "other", label: "Other" },
];

/** Figures from the last completed financial year, as the customer's books show them. */
export type ActualFigures = {
  sales: number;
  otherIncome: number;
  openingStock: number;
  purchases: number;
  directExpenses: number;
  closingStock: number;
  salaries: number;
  rent: number;
  adminExpenses: number;
  otherExpenses: number;
  interest: number;
  depreciation: number;
  tax: number;
  openingCapital: number;
  capitalIntroduced: number;
  drawings: number;
  fixedAssets: number;
  investments: number;
  debtors: number;
  cashAndBank: number;
  otherCurrentAssets: number;
  termLoan: number;
  unsecuredLoans: number;
  creditors: number;
  otherCurrentLiabilities: number;
};

/**
 * What the projected years assume.
 *
 * A `null` means "work it out from the actual year" — the material cost
 * ratio, the debtor, creditor and stock days and the expense base are all
 * read off the customer's own books unless the admin overrides them.
 */
export type ProjectionAssumptions = {
  years: number;
  year1Sales: number | null;
  salesGrowthPct: number;
  materialCostPct: number | null;
  indirectExpensesYear1: number | null;
  expenseGrowthPct: number;
  otherIncomePerYear: number | null;
  depreciationPct: number;
  taxPct: number;
  drawingsPerYear: number;
  capitalIntroducedYear1: number;
  newFixedAssets: number;
  newTermLoan: number;
  loanInterestPct: number;
  loanTenureYears: number;
  existingLoanRepaymentPerYear: number;
  existingLoanInterestPct: number;
  debtorDays: number | null;
  creditorDays: number | null;
  stockDays: number | null;
};

export type BalanceSheetFigures = {
  /** Start year of the actual financial year: 2025 means FY 2025-26. */
  baseYear: number;
  hasActual: boolean;
  constitution: Constitution;
  actual: ActualFigures;
  projection: ProjectionAssumptions;
};

export type ProfitAndLoss = {
  sales: number;
  otherIncome: number;
  openingStock: number;
  purchases: number;
  directExpenses: number;
  closingStock: number;
  costOfSales: number;
  grossProfit: number;
  salaries: number;
  rent: number;
  adminExpenses: number;
  otherExpenses: number;
  depreciation: number;
  interest: number;
  profitBeforeTax: number;
  tax: number;
  netProfit: number;
};

export type BalanceSheet = {
  openingCapital: number;
  capitalIntroduced: number;
  netProfit: number;
  drawings: number;
  closingCapital: number;
  termLoan: number;
  unsecuredLoans: number;
  creditors: number;
  otherCurrentLiabilities: number;
  bankOverdraft: number;
  totalLiabilities: number;
  fixedAssets: number;
  investments: number;
  closingStock: number;
  debtors: number;
  cashAndBank: number;
  otherCurrentAssets: number;
  totalAssets: number;
  /** Liabilities minus assets. Always 0 for a projected year. */
  difference: number;
};

export type Ratios = {
  currentRatio: number | null;
  netProfitMarginPct: number | null;
  debtEquityRatio: number | null;
  /** Debt service coverage. Only projected years carry one. */
  dscr: number | null;
  termLoanInterest: number;
  principalRepayment: number;
};

export type Period = {
  kind: "actual" | "projected";
  /** Start year of the financial year. */
  fyStart: number;
  label: string;
  yearEnd: string;
  pl: ProfitAndLoss;
  bs: BalanceSheet;
  ratios: Ratios;
};

export type EffectiveAssumptions = {
  year1Sales: number;
  salesGrowthPct: number;
  materialCostPct: number;
  indirectExpensesYear1: number;
  expenseGrowthPct: number;
  otherIncomePerYear: number;
  depreciationPct: number;
  taxPct: number;
  debtorDays: number;
  creditorDays: number;
  stockDays: number;
  /** Which values were read from the actual year rather than typed in. */
  derived: string[];
};

export type Statements = {
  periods: Period[];
  assumptions: EffectiveAssumptions;
  /** True when the actual year (if any) tallies to the rupee. */
  tallies: boolean;
  averageDscr: number | null;
  warnings: string[];
};

/** Differences smaller than this are rounding, not a mistake. */
export const TALLY_TOLERANCE = 1;

/** Opening words of the "does not tally" warning, so a screen can recognise it. */
export const NOT_TALLY_WARNING_PREFIX = "Actual saal ki balance sheet tally nahi ho rahi";

const DAYS = 365;

const round = (value: number) => Math.round(value * 100) / 100;
const num = (value: number | null | undefined) => (Number.isFinite(value) ? Number(value) : 0);

export function fyLabel(fyStart: number) {
  return `FY ${fyStart}-${String((fyStart + 1) % 100).padStart(2, "0")}`;
}

export function yearEndLabel(fyStart: number) {
  return `31st March ${fyStart + 1}`;
}

/** How the owners' funds are headed, by type of business. */
export function capitalHeading(constitution: Constitution) {
  if (constitution === "proprietorship") return "Proprietor's Capital Account";
  if (constitution === "partnership" || constitution === "llp") return "Partners' Capital Account";
  if (constitution === "private_limited" || constitution === "opc") return "Shareholders' Funds";
  return "Capital Account";
}

export function emptyActual(): ActualFigures {
  return {
    sales: 0,
    otherIncome: 0,
    openingStock: 0,
    purchases: 0,
    directExpenses: 0,
    closingStock: 0,
    salaries: 0,
    rent: 0,
    adminExpenses: 0,
    otherExpenses: 0,
    interest: 0,
    depreciation: 0,
    tax: 0,
    openingCapital: 0,
    capitalIntroduced: 0,
    drawings: 0,
    fixedAssets: 0,
    investments: 0,
    debtors: 0,
    cashAndBank: 0,
    otherCurrentAssets: 0,
    termLoan: 0,
    unsecuredLoans: 0,
    creditors: 0,
    otherCurrentLiabilities: 0,
  };
}

export function defaultProjection(): ProjectionAssumptions {
  return {
    years: 5,
    year1Sales: null,
    salesGrowthPct: 10,
    materialCostPct: null,
    indirectExpensesYear1: null,
    expenseGrowthPct: 5,
    otherIncomePerYear: null,
    depreciationPct: 15,
    taxPct: 0,
    drawingsPerYear: 0,
    capitalIntroducedYear1: 0,
    newFixedAssets: 0,
    newTermLoan: 0,
    loanInterestPct: 10,
    loanTenureYears: 5,
    existingLoanRepaymentPerYear: 0,
    existingLoanInterestPct: 0,
    debtorDays: null,
    creditorDays: null,
    stockDays: null,
  };
}

/* ─────────────────────────────────────────────────────────────────────────
   Actual year
   ───────────────────────────────────────────────────────────────────────── */

function actualPeriod(figures: BalanceSheetFigures): Period {
  const a = figures.actual;
  const costOfSales = num(a.openingStock) + num(a.purchases) + num(a.directExpenses) - num(a.closingStock);
  const grossProfit = num(a.sales) - costOfSales;
  const profitBeforeTax =
    grossProfit +
    num(a.otherIncome) -
    num(a.salaries) -
    num(a.rent) -
    num(a.adminExpenses) -
    num(a.otherExpenses) -
    num(a.depreciation) -
    num(a.interest);
  const netProfit = profitBeforeTax - num(a.tax);

  const pl: ProfitAndLoss = {
    sales: round(num(a.sales)),
    otherIncome: round(num(a.otherIncome)),
    openingStock: round(num(a.openingStock)),
    purchases: round(num(a.purchases)),
    directExpenses: round(num(a.directExpenses)),
    closingStock: round(num(a.closingStock)),
    costOfSales: round(costOfSales),
    grossProfit: round(grossProfit),
    salaries: round(num(a.salaries)),
    rent: round(num(a.rent)),
    adminExpenses: round(num(a.adminExpenses)),
    otherExpenses: round(num(a.otherExpenses)),
    depreciation: round(num(a.depreciation)),
    interest: round(num(a.interest)),
    profitBeforeTax: round(profitBeforeTax),
    tax: round(num(a.tax)),
    netProfit: round(netProfit),
  };

  const closingCapital = num(a.openingCapital) + num(a.capitalIntroduced) + netProfit - num(a.drawings);
  const totalLiabilities =
    closingCapital + num(a.termLoan) + num(a.unsecuredLoans) + num(a.creditors) + num(a.otherCurrentLiabilities);
  const totalAssets =
    num(a.fixedAssets) +
    num(a.investments) +
    num(a.closingStock) +
    num(a.debtors) +
    num(a.cashAndBank) +
    num(a.otherCurrentAssets);

  const bs: BalanceSheet = {
    openingCapital: round(num(a.openingCapital)),
    capitalIntroduced: round(num(a.capitalIntroduced)),
    netProfit: round(netProfit),
    drawings: round(num(a.drawings)),
    closingCapital: round(closingCapital),
    termLoan: round(num(a.termLoan)),
    unsecuredLoans: round(num(a.unsecuredLoans)),
    creditors: round(num(a.creditors)),
    otherCurrentLiabilities: round(num(a.otherCurrentLiabilities)),
    bankOverdraft: 0,
    totalLiabilities: round(totalLiabilities),
    fixedAssets: round(num(a.fixedAssets)),
    investments: round(num(a.investments)),
    closingStock: round(num(a.closingStock)),
    debtors: round(num(a.debtors)),
    cashAndBank: round(num(a.cashAndBank)),
    otherCurrentAssets: round(num(a.otherCurrentAssets)),
    totalAssets: round(totalAssets),
    difference: round(totalLiabilities - totalAssets),
  };

  return {
    kind: "actual",
    fyStart: figures.baseYear,
    label: `${fyLabel(figures.baseYear)} (Actual)`,
    yearEnd: yearEndLabel(figures.baseYear),
    pl,
    bs,
    ratios: ratiosFor(pl, bs, null),
  };
}

/* ─────────────────────────────────────────────────────────────────────────
   Assumptions
   ───────────────────────────────────────────────────────────────────────── */

const ratio = (part: number, whole: number) => (whole > 0 ? part / whole : null);

/** Fill every `null` assumption from the actual year, or a plain default. */
export function effectiveAssumptions(figures: BalanceSheetFigures): EffectiveAssumptions {
  const a = figures.actual;
  const p = figures.projection;
  const useActual = figures.hasActual && num(a.sales) > 0;
  const derived: string[] = [];
  const costOfSales = num(a.openingStock) + num(a.purchases) + num(a.directExpenses) - num(a.closingStock);
  const indirect = num(a.salaries) + num(a.rent) + num(a.adminExpenses) + num(a.otherExpenses);

  const pick = (typed: number | null, fromActual: number | null, fallback: number, name: string) => {
    if (typed !== null && Number.isFinite(typed)) return Number(typed);
    if (useActual && fromActual !== null && Number.isFinite(fromActual)) {
      derived.push(name);
      return fromActual;
    }
    return fallback;
  };

  const year1Sales =
    p.year1Sales !== null && Number.isFinite(p.year1Sales)
      ? Number(p.year1Sales)
      : useActual
        ? num(a.sales) * (1 + num(p.salesGrowthPct) / 100)
        : 0;
  if ((p.year1Sales === null || !Number.isFinite(p.year1Sales)) && useActual) derived.push("Year 1 sales");

  const materialCostPct = pick(p.materialCostPct, useActual ? (ratio(costOfSales, num(a.sales)) ?? 0) * 100 : null, 70, "Material cost %");
  const indirectExpensesYear1 = pick(
    p.indirectExpensesYear1,
    useActual ? indirect * (1 + num(p.expenseGrowthPct) / 100) : null,
    0,
    "Operating expenses",
  );
  const otherIncomePerYear = pick(p.otherIncomePerYear, useActual ? num(a.otherIncome) : null, 0, "Other income");
  const debtorDays = pick(p.debtorDays, useActual ? (ratio(num(a.debtors), num(a.sales)) ?? 0) * DAYS : null, 30, "Debtor days");
  const creditorDays = pick(p.creditorDays, useActual ? (ratio(num(a.creditors), costOfSales) ?? 0) * DAYS : null, 30, "Creditor days");
  const stockDays = pick(p.stockDays, useActual ? (ratio(num(a.closingStock), costOfSales) ?? 0) * DAYS : null, 30, "Stock days");

  return {
    year1Sales: round(year1Sales),
    salesGrowthPct: num(p.salesGrowthPct),
    materialCostPct: round(materialCostPct),
    indirectExpensesYear1: round(indirectExpensesYear1),
    expenseGrowthPct: num(p.expenseGrowthPct),
    otherIncomePerYear: round(otherIncomePerYear),
    depreciationPct: num(p.depreciationPct),
    taxPct: num(p.taxPct),
    debtorDays: Math.round(debtorDays),
    creditorDays: Math.round(creditorDays),
    stockDays: Math.round(stockDays),
    derived,
  };
}

/* ─────────────────────────────────────────────────────────────────────────
   Projected years
   ───────────────────────────────────────────────────────────────────────── */

type Carry = {
  capital: number;
  fixedAssets: number;
  closingStock: number;
  sales: number;
  existingLoan: number;
  newLoan: number;
  unsecuredLoans: number;
  investments: number;
  otherCurrentAssets: number;
  otherCurrentLiabilities: number;
};

function projectedPeriods(figures: BalanceSheetFigures, assumptions: EffectiveAssumptions, start: Carry): Period[] {
  const p = figures.projection;
  const a = figures.actual;
  const years = Math.max(1, Math.min(5, Math.round(num(p.years))));
  const indirectBase = num(a.salaries) + num(a.rent) + num(a.adminExpenses) + num(a.otherExpenses);
  const share = (part: number) => (figures.hasActual && indirectBase > 0 ? part / indirectBase : 0);
  const shares = {
    salaries: share(num(a.salaries)),
    rent: share(num(a.rent)),
    other: share(num(a.otherExpenses)),
  };
  const materialBase = num(a.purchases) + num(a.directExpenses);
  const directShare = figures.hasActual && materialBase > 0 ? num(a.directExpenses) / materialBase : 0;
  const newLoanInstalment = num(p.loanTenureYears) > 0 ? num(p.newTermLoan) / num(p.loanTenureYears) : num(p.newTermLoan);

  const periods: Period[] = [];
  let carry: Carry = { ...start, newLoan: start.newLoan + num(p.newTermLoan) };

  for (let index = 0; index < years; index += 1) {
    const fyStart = figures.baseYear + 1 + index;
    const sales = index === 0 ? assumptions.year1Sales : carry.sales * (1 + assumptions.salesGrowthPct / 100);
    const costOfSales = sales * (assumptions.materialCostPct / 100);
    const closingStock = costOfSales * (assumptions.stockDays / DAYS);
    const materials = costOfSales + closingStock - carry.closingStock;
    const directExpenses = materials * directShare;
    const purchases = materials - directExpenses;

    const indirect = assumptions.indirectExpensesYear1 * Math.pow(1 + assumptions.expenseGrowthPct / 100, index);
    const salaries = indirect * shares.salaries;
    const rent = indirect * shares.rent;
    const otherExpenses = indirect * shares.other;
    const adminExpenses = indirect - salaries - rent - otherExpenses;

    const capex = index === 0 ? num(p.newFixedAssets) : 0;
    const depreciation = (carry.fixedAssets + capex) * (assumptions.depreciationPct / 100);

    const termLoanInterest =
      carry.newLoan * (num(p.loanInterestPct) / 100) + carry.existingLoan * (num(p.existingLoanInterestPct) / 100);
    const newRepayment = Math.min(carry.newLoan, newLoanInstalment);
    const existingRepayment = Math.min(carry.existingLoan, num(p.existingLoanRepaymentPerYear));

    const grossProfit = sales - costOfSales;
    const profitBeforeTax =
      grossProfit + assumptions.otherIncomePerYear - indirect - depreciation - termLoanInterest;
    const tax = Math.max(0, profitBeforeTax) * (assumptions.taxPct / 100);
    const netProfit = profitBeforeTax - tax;

    const capitalIntroduced = index === 0 ? num(p.capitalIntroducedYear1) : 0;
    const closingCapital = carry.capital + capitalIntroduced + netProfit - num(p.drawingsPerYear);
    const newLoan = carry.newLoan - newRepayment;
    const existingLoan = carry.existingLoan - existingRepayment;
    const termLoan = newLoan + existingLoan;
    const creditors = costOfSales * (assumptions.creditorDays / DAYS);
    const debtors = sales * (assumptions.debtorDays / DAYS);
    const fixedAssets = carry.fixedAssets + capex - depreciation;

    const fundsAvailable =
      closingCapital + termLoan + carry.unsecuredLoans + creditors + carry.otherCurrentLiabilities;
    const fundsUsed = fixedAssets + carry.investments + closingStock + debtors + carry.otherCurrentAssets;
    const surplus = fundsAvailable - fundsUsed;
    const cashAndBank = Math.max(0, surplus);
    const bankOverdraft = Math.max(0, -surplus);

    const pl: ProfitAndLoss = {
      sales: round(sales),
      otherIncome: round(assumptions.otherIncomePerYear),
      openingStock: round(carry.closingStock),
      purchases: round(purchases),
      directExpenses: round(directExpenses),
      closingStock: round(closingStock),
      costOfSales: round(costOfSales),
      grossProfit: round(grossProfit),
      salaries: round(salaries),
      rent: round(rent),
      adminExpenses: round(adminExpenses),
      otherExpenses: round(otherExpenses),
      depreciation: round(depreciation),
      interest: round(termLoanInterest),
      profitBeforeTax: round(profitBeforeTax),
      tax: round(tax),
      netProfit: round(netProfit),
    };

    const totalLiabilities = fundsAvailable + bankOverdraft;
    const totalAssets = fundsUsed + cashAndBank;
    const bs: BalanceSheet = {
      openingCapital: round(carry.capital),
      capitalIntroduced: round(capitalIntroduced),
      netProfit: round(netProfit),
      drawings: round(num(p.drawingsPerYear)),
      closingCapital: round(closingCapital),
      termLoan: round(termLoan),
      unsecuredLoans: round(carry.unsecuredLoans),
      creditors: round(creditors),
      otherCurrentLiabilities: round(carry.otherCurrentLiabilities),
      bankOverdraft: round(bankOverdraft),
      totalLiabilities: round(totalLiabilities),
      fixedAssets: round(fixedAssets),
      investments: round(carry.investments),
      closingStock: round(closingStock),
      debtors: round(debtors),
      cashAndBank: round(cashAndBank),
      otherCurrentAssets: round(carry.otherCurrentAssets),
      totalAssets: round(totalAssets),
      difference: 0,
    };

    periods.push({
      kind: "projected",
      fyStart,
      label: `${fyLabel(fyStart)} (Projected)`,
      yearEnd: yearEndLabel(fyStart),
      pl,
      bs,
      ratios: ratiosFor(pl, bs, {
        termLoanInterest,
        principalRepayment: newRepayment + existingRepayment,
      }),
    });

    carry = {
      capital: closingCapital,
      fixedAssets,
      closingStock,
      sales,
      existingLoan,
      newLoan,
      unsecuredLoans: carry.unsecuredLoans,
      investments: carry.investments,
      otherCurrentAssets: carry.otherCurrentAssets,
      otherCurrentLiabilities: carry.otherCurrentLiabilities,
    };
  }

  return periods;
}

function ratiosFor(
  pl: ProfitAndLoss,
  bs: BalanceSheet,
  debt: { termLoanInterest: number; principalRepayment: number } | null,
): Ratios {
  const currentAssets = bs.closingStock + bs.debtors + bs.cashAndBank + bs.otherCurrentAssets;
  const currentLiabilities = bs.creditors + bs.otherCurrentLiabilities + bs.bankOverdraft;
  const borrowings = bs.termLoan + bs.unsecuredLoans + bs.bankOverdraft;
  const service = debt ? debt.termLoanInterest + debt.principalRepayment : 0;
  const cashAccrual = pl.netProfit + pl.depreciation + (debt?.termLoanInterest ?? 0);

  const two = (value: number | null) => (value === null || !Number.isFinite(value) ? null : Math.round(value * 100) / 100);

  return {
    currentRatio: two(currentLiabilities > 0 ? currentAssets / currentLiabilities : null),
    netProfitMarginPct: two(pl.sales > 0 ? (pl.netProfit / pl.sales) * 100 : null),
    debtEquityRatio: two(bs.closingCapital > 0 ? borrowings / bs.closingCapital : null),
    dscr: two(debt && service > 0 ? cashAccrual / service : null),
    termLoanInterest: round(debt?.termLoanInterest ?? 0),
    principalRepayment: round(debt?.principalRepayment ?? 0),
  };
}

/* ─────────────────────────────────────────────────────────────────────────
   Everything together
   ───────────────────────────────────────────────────────────────────────── */

export function buildStatements(figures: BalanceSheetFigures): Statements {
  const assumptions = effectiveAssumptions(figures);
  const warnings: string[] = [];
  const periods: Period[] = [];
  let start: Carry;

  if (figures.hasActual) {
    const actual = actualPeriod(figures);
    periods.push(actual);
    if (Math.abs(actual.bs.difference) > TALLY_TOLERANCE) {
      warnings.push(
        `${NOT_TALLY_WARNING_PREFIX}: ${actual.bs.difference > 0 ? "liabilities assets se" : "assets liabilities se"} Rs. ${formatAmount(Math.abs(actual.bs.difference))} zyada hain. Final karne se pehle figures theek karein.`,
      );
    }
    start = {
      capital: actual.bs.closingCapital,
      fixedAssets: actual.bs.fixedAssets,
      closingStock: actual.bs.closingStock,
      sales: actual.pl.sales,
      existingLoan: actual.bs.termLoan,
      newLoan: 0,
      unsecuredLoans: actual.bs.unsecuredLoans,
      investments: actual.bs.investments,
      otherCurrentAssets: actual.bs.otherCurrentAssets,
      otherCurrentLiabilities: actual.bs.otherCurrentLiabilities,
    };
  } else {
    start = {
      capital: 0,
      fixedAssets: 0,
      closingStock: 0,
      sales: 0,
      existingLoan: 0,
      newLoan: 0,
      unsecuredLoans: 0,
      investments: 0,
      otherCurrentAssets: 0,
      otherCurrentLiabilities: 0,
    };
    if (assumptions.year1Sales <= 0) warnings.push("Pehle projected saal ki expected sales bharein.");
  }

  const projected = projectedPeriods(figures, assumptions, start);
  periods.push(...projected);

  const overdraftYears = projected.filter((period) => period.bs.bankOverdraft > 0).map((period) => fyLabel(period.fyStart));
  if (overdraftYears.length) {
    warnings.push(
      `${overdraftYears.join(", ")} mein paisa kam pad raha hai; ye kami bank overdraft ki tarah dikhayi gayi hai. Capital ya loan badhayein, ya assumptions dobara dekhein.`,
    );
  }
  const losses = projected.filter((period) => period.pl.netProfit < 0).map((period) => fyLabel(period.fyStart));
  if (losses.length) warnings.push(`${losses.join(", ")} mein net loss dikh raha hai.`);

  const dscrs = projected.map((period) => period.ratios.dscr).filter((value): value is number => value !== null);
  const averageDscr = dscrs.length ? Math.round((dscrs.reduce((sum, value) => sum + value, 0) / dscrs.length) * 100) / 100 : null;
  if (averageDscr !== null && averageDscr < 1.25) {
    warnings.push(`Average DSCR ${averageDscr.toFixed(2)} hai. Zyaadatar bank kam se kam 1.25 dekhte hain.`);
  }

  const actual = periods.find((period) => period.kind === "actual");
  const tallies = !actual || Math.abs(actual.bs.difference) <= TALLY_TOLERANCE;

  return { periods, assumptions, tallies, averageDscr, warnings };
}

/** Indian digit grouping, two decimals: 12,34,567.00 */
export function formatAmount(value: number) {
  const fixed = Math.abs(value).toFixed(2);
  const [whole, paise] = fixed.split(".");
  const last3 = whole.slice(-3);
  const rest = whole.slice(0, -3);
  const grouped = rest ? `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",")},${last3}` : last3;
  return `${value < 0 ? "-" : ""}${grouped}.${paise}`;
}
