import { formatAmount, type Period, type Statements } from "@/lib/balance-sheets/engine";

/**
 * The lines of each statement, in order, shared by the printed PDF and the
 * admin screen so the two can never show different figures or wording.
 */

export type Row =
  | { kind: "heading"; label: string }
  | { kind: "line"; label: string; values: (number | null)[]; bold?: boolean; indent?: number; rule?: "above" | "total" }
  | { kind: "gap" };

export const amount = (value: number | null) => {
  if (value === null) return "";
  if (Math.abs(value) < 0.005) return "-";
  return value < 0 ? `(${formatAmount(-value)})` : formatAmount(value);
};


export function profitAndLossRows(periods: Period[]): Row[] {
  const v = (pick: (period: Period) => number) => periods.map(pick);
  return [
    { kind: "heading", label: "I. INCOME" },
    { kind: "line", label: "Sales / Turnover", values: v((p) => p.pl.sales), indent: 1 },
    { kind: "line", label: "Other income", values: v((p) => p.pl.otherIncome), indent: 1 },
    { kind: "line", label: "Total Income", values: v((p) => p.pl.sales + p.pl.otherIncome), bold: true, rule: "above" },
    { kind: "gap" },
    { kind: "heading", label: "II. COST OF SALES" },
    { kind: "line", label: "Opening stock", values: v((p) => p.pl.openingStock), indent: 1 },
    { kind: "line", label: "Add: Purchases", values: v((p) => p.pl.purchases), indent: 1 },
    { kind: "line", label: "Add: Direct expenses (wages, power, freight)", values: v((p) => p.pl.directExpenses), indent: 1 },
    { kind: "line", label: "Less: Closing stock", values: v((p) => -p.pl.closingStock), indent: 1 },
    { kind: "line", label: "Cost of Sales", values: v((p) => p.pl.costOfSales), bold: true, rule: "above" },
    { kind: "gap" },
    { kind: "line", label: "GROSS PROFIT (Sales - Cost of Sales)", values: v((p) => p.pl.grossProfit), bold: true },
    { kind: "gap" },
    { kind: "heading", label: "III. INDIRECT EXPENSES" },
    { kind: "line", label: "Salaries and wages", values: v((p) => p.pl.salaries), indent: 1 },
    { kind: "line", label: "Rent", values: v((p) => p.pl.rent), indent: 1 },
    { kind: "line", label: "Administrative and office expenses", values: v((p) => p.pl.adminExpenses), indent: 1 },
    { kind: "line", label: "Other expenses", values: v((p) => p.pl.otherExpenses), indent: 1 },
    { kind: "line", label: "Depreciation", values: v((p) => p.pl.depreciation), indent: 1 },
    { kind: "line", label: "Interest on loans", values: v((p) => p.pl.interest), indent: 1 },
    {
      kind: "line",
      label: "Total Indirect Expenses",
      values: v((p) => p.pl.salaries + p.pl.rent + p.pl.adminExpenses + p.pl.otherExpenses + p.pl.depreciation + p.pl.interest),
      bold: true,
      rule: "above",
    },
    { kind: "gap" },
    { kind: "line", label: "NET PROFIT BEFORE TAX", values: v((p) => p.pl.profitBeforeTax), bold: true },
    { kind: "line", label: "Less: Provision for income tax", values: v((p) => -p.pl.tax), indent: 1 },
    { kind: "line", label: "NET PROFIT AFTER TAX", values: v((p) => p.pl.netProfit), bold: true, rule: "total" },
  ];
}

export function balanceSheetRows(periods: Period[], heading: string): Row[] {
  const v = (pick: (period: Period) => number) => periods.map(pick);
  const any = (pick: (period: Period) => number) => periods.some((period) => Math.abs(pick(period)) > 0.005);
  const rows: Row[] = [
    { kind: "heading", label: "LIABILITIES" },
    { kind: "line", label: heading, values: periods.map(() => null), bold: true },
    { kind: "line", label: "Opening balance", values: v((p) => p.bs.openingCapital), indent: 1 },
    { kind: "line", label: "Add: Capital introduced", values: v((p) => p.bs.capitalIntroduced), indent: 1 },
    { kind: "line", label: "Add: Net profit for the year", values: v((p) => p.bs.netProfit), indent: 1 },
    { kind: "line", label: "Less: Drawings", values: v((p) => -p.bs.drawings), indent: 1 },
    { kind: "line", label: "Closing balance", values: v((p) => p.bs.closingCapital), bold: true, rule: "above" },
    { kind: "gap" },
    { kind: "line", label: "Secured loans", values: periods.map(() => null), bold: true },
    { kind: "line", label: "Term loan from bank", values: v((p) => p.bs.termLoan), indent: 1 },
  ];
  if (any((p) => p.bs.bankOverdraft)) {
    rows.push({ kind: "line", label: "Bank overdraft / working capital limit", values: v((p) => p.bs.bankOverdraft), indent: 1 });
  }
  rows.push(
    { kind: "line", label: "Unsecured loans", values: v((p) => p.bs.unsecuredLoans), bold: true },
    { kind: "gap" },
    { kind: "line", label: "Current liabilities and provisions", values: periods.map(() => null), bold: true },
    { kind: "line", label: "Sundry creditors", values: v((p) => p.bs.creditors), indent: 1 },
    { kind: "line", label: "Other current liabilities and provisions", values: v((p) => p.bs.otherCurrentLiabilities), indent: 1 },
    { kind: "line", label: "TOTAL LIABILITIES", values: v((p) => p.bs.totalLiabilities), bold: true, rule: "total" },
    { kind: "gap" },
    { kind: "heading", label: "ASSETS" },
    { kind: "line", label: "Fixed assets (net block)", values: v((p) => p.bs.fixedAssets), bold: true },
    { kind: "line", label: "Investments", values: v((p) => p.bs.investments), bold: true },
    { kind: "gap" },
    { kind: "line", label: "Current assets", values: periods.map(() => null), bold: true },
    { kind: "line", label: "Closing stock", values: v((p) => p.bs.closingStock), indent: 1 },
    { kind: "line", label: "Sundry debtors", values: v((p) => p.bs.debtors), indent: 1 },
    { kind: "line", label: "Cash and bank balances", values: v((p) => p.bs.cashAndBank), indent: 1 },
    { kind: "line", label: "Other current assets, loans and advances", values: v((p) => p.bs.otherCurrentAssets), indent: 1 },
    { kind: "line", label: "TOTAL ASSETS", values: v((p) => p.bs.totalAssets), bold: true, rule: "total" },
  );
  if (any((p) => p.bs.difference)) {
    rows.push({ kind: "line", label: "Difference (to be reconciled)", values: v((p) => p.bs.difference), bold: true });
  }
  return rows;
}

export function ratioRows(periods: Period[], statements: Statements): { label: string; values: string[] }[] {
  const two = (value: number | null) => (value === null ? "-" : value.toFixed(2));
  return [
    { label: "Current ratio (times)", values: periods.map((p) => two(p.ratios.currentRatio)) },
    { label: "Net profit to sales (%)", values: periods.map((p) => two(p.ratios.netProfitMarginPct)) },
    { label: "Debt to equity (times)", values: periods.map((p) => two(p.ratios.debtEquityRatio)) },
    { label: "Interest on term loan (Rs.)", values: periods.map((p) => (p.kind === "projected" ? amount(p.ratios.termLoanInterest) : "-")) },
    { label: "Repayment of term loan (Rs.)", values: periods.map((p) => (p.kind === "projected" ? amount(p.ratios.principalRepayment) : "-")) },
    { label: "Debt service coverage ratio (DSCR)", values: periods.map((p) => two(p.ratios.dscr)) },
    { label: "Average DSCR over the projected period", values: periods.map((p, i) => (i === periods.length - 1 ? two(statements.averageDscr) : "")) },
  ];
}

