import { formatAmount, TALLY_TOLERANCE, type ActualFigures, type ProjectionAssumptions, type Statements } from "@/lib/balance-sheets/engine";

/**
 * Field-by-field checks for the balance sheet form.
 *
 * The engine says *whether* the figures agree; this says *which box* is wrong
 * and why, in the words a CA would use when sending a file back. Errors are
 * figures that cannot be right (closing stock larger than all the stock the
 * business had, tax above the profit). Warnings are figures that can be right
 * but that a bank officer will ask about, so they are worth a second look.
 *
 * Pure and synchronous: the form runs it on every keystroke.
 */

export type IssueLevel = "error" | "warning";

export type FieldIssue = {
  level: IssueLevel;
  message: string;
};

export type DetailKey = "businessName" | "ownerName" | "pan" | "gstin" | "mobile" | "pincode" | "email" | "loanAmount";
export type FieldKey = DetailKey | `actual.${keyof ActualFigures}` | `projection.${keyof ProjectionAssumptions}`;

export type CheckInput = {
  details: Record<DetailKey, string>;
  hasActual: boolean;
  actualText: Record<keyof ActualFigures, string>;
  projectionText: Record<keyof ProjectionAssumptions, string>;
  statements: Statements;
  /** Show "required" errors only once the admin has tried to save. */
  showRequired: boolean;
  /** Format errors on these text fields show once the admin has left them. */
  touched: ReadonlySet<DetailKey>;
};

export type CheckResult = {
  issues: Partial<Record<FieldKey, FieldIssue>>;
  errorCount: number;
  warningCount: number;
};

/** Labels as the form shows them, for the summary list. */
export const FIELD_LABELS: Record<FieldKey, string> = {
  businessName: "Business / firm name",
  ownerName: "Proprietor / partners",
  pan: "PAN",
  gstin: "GSTIN",
  mobile: "Mobile",
  pincode: "Pincode",
  email: "Email",
  loanAmount: "Loan amount applied for",
  "actual.sales": "Sales / turnover",
  "actual.otherIncome": "Other income",
  "actual.openingStock": "Opening stock",
  "actual.purchases": "Purchases",
  "actual.directExpenses": "Direct expenses",
  "actual.closingStock": "Closing stock",
  "actual.salaries": "Salaries and wages",
  "actual.rent": "Rent",
  "actual.adminExpenses": "Administrative expenses",
  "actual.otherExpenses": "Other expenses",
  "actual.interest": "Interest on loans",
  "actual.depreciation": "Depreciation",
  "actual.tax": "Income tax",
  "actual.openingCapital": "Opening capital",
  "actual.capitalIntroduced": "Capital introduced",
  "actual.drawings": "Drawings",
  "actual.fixedAssets": "Fixed assets (net block)",
  "actual.investments": "Investments",
  "actual.debtors": "Sundry debtors",
  "actual.cashAndBank": "Cash and bank balances",
  "actual.otherCurrentAssets": "Other current assets",
  "actual.termLoan": "Term loan outstanding",
  "actual.unsecuredLoans": "Unsecured loans",
  "actual.creditors": "Sundry creditors",
  "actual.otherCurrentLiabilities": "Other current liabilities",
  "projection.years": "Years to project",
  "projection.year1Sales": "Sales in the first projected year",
  "projection.salesGrowthPct": "Sales growth per year",
  "projection.materialCostPct": "Cost of sales",
  "projection.indirectExpensesYear1": "Indirect expenses, first year",
  "projection.expenseGrowthPct": "Expense growth per year",
  "projection.otherIncomePerYear": "Other income per year",
  "projection.depreciationPct": "Depreciation rate",
  "projection.taxPct": "Income tax",
  "projection.drawingsPerYear": "Drawings per year",
  "projection.capitalIntroducedYear1": "Own capital introduced, first year",
  "projection.newFixedAssets": "New fixed assets / machinery",
  "projection.newTermLoan": "New term loan",
  "projection.loanInterestPct": "Loan interest rate",
  "projection.loanTenureYears": "Loan tenure",
  "projection.existingLoanRepaymentPerYear": "Existing loan repaid per year",
  "projection.existingLoanInterestPct": "Existing loan interest",
  "projection.debtorDays": "Debtors (days)",
  "projection.creditorDays": "Creditors (days)",
  "projection.stockDays": "Stock (days)",
};

/** The order fields appear in on the form, so the summary reads top to bottom. */
export const FIELD_ORDER = Object.keys(FIELD_LABELS) as FieldKey[];

const rs = (value: number) => `Rs. ${formatAmount(value)}`;

/** A typed figure is a number if, commas aside, it parses cleanly. Blank is fine. */
export function isValidNumberText(text: string) {
  if (text.trim() === "") return true;
  const cleaned = text.replace(/,/g, "").trim();
  return /^\d*\.?\d+$|^\d+\.$/.test(cleaned) && Number.isFinite(Number(cleaned));
}

const value = (text: string) => {
  const cleaned = text.replace(/,/g, "").trim();
  const parsed = Number(cleaned);
  return cleaned === "" || !Number.isFinite(parsed) ? 0 : parsed;
};

const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export function checkBalanceSheet(input: CheckInput): CheckResult {
  const issues: Partial<Record<FieldKey, FieldIssue>> = {};
  // The first problem found for a field wins; checks run most serious first.
  const add = (key: FieldKey, level: IssueLevel, message: string) => {
    if (!issues[key]) issues[key] = { level, message };
  };
  const error = (key: FieldKey, message: string) => add(key, "error", message);
  const warn = (key: FieldKey, message: string) => add(key, "warning", message);

  checkDetails(input, error);
  checkNumberFormat(input, error);
  if (input.hasActual) checkActual(input, error, warn);
  checkProjection(input, error, warn);

  const all = Object.values(issues) as FieldIssue[];
  return {
    issues,
    errorCount: all.filter((issue) => issue.level === "error").length,
    warningCount: all.filter((issue) => issue.level === "warning").length,
  };
}

type Report = (key: FieldKey, message: string) => void;

function checkDetails({ details, showRequired, touched }: CheckInput, error: Report) {
  const shown = (key: DetailKey) => showRequired || touched.has(key);

  if (showRequired && details.businessName.trim().length < 2) error("businessName", "Enter the business or firm name. It is printed on every page.");
  if (showRequired && details.ownerName.trim().length < 2) error("ownerName", "Enter the proprietor's or partners' name. It goes in the signature block.");

  const pan = details.pan.trim().toUpperCase();
  if (pan && shown("pan") && !PAN_RE.test(pan)) {
    error("pan", "PAN is 10 characters: 5 letters, 4 digits, 1 letter (e.g. ABCDE1234F).");
  }

  const gstin = details.gstin.trim().toUpperCase();
  if (gstin && shown("gstin")) {
    if (!GSTIN_RE.test(gstin)) {
      error("gstin", "GSTIN is 15 characters: 2-digit state code, the 10-character PAN, then 3 more (e.g. 09ABCDE1234F1Z5).");
    } else if (PAN_RE.test(pan) && gstin.slice(2, 12) !== pan) {
      error("gstin", `This GSTIN belongs to PAN ${gstin.slice(2, 12)}, not ${pan}. Characters 3 to 12 of a GSTIN are the PAN.`);
    }
  }

  const mobile = details.mobile.trim();
  if (mobile && shown("mobile") && !/^[6-9][0-9]{9}$/.test(mobile)) {
    error("mobile", mobile.length !== 10 ? `Mobile number has ${mobile.length} digits; it needs 10.` : "An Indian mobile number starts with 6, 7, 8 or 9.");
  }

  const pincode = details.pincode.trim();
  if (pincode && shown("pincode") && !/^[1-9][0-9]{5}$/.test(pincode)) {
    error("pincode", pincode.length !== 6 ? `Pincode has ${pincode.length} digits; it needs 6.` : "A pincode cannot start with 0.");
  }

  const email = details.email.trim();
  if (email && shown("email") && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    error("email", "This does not look like an email address (e.g. name@example.com).");
  }

  if (details.loanAmount.trim() && !isValidNumberText(details.loanAmount)) {
    error("loanAmount", "Not a valid amount. Type digits only, e.g. 500000 or 5,00,000.");
  }
}

function checkNumberFormat({ hasActual, actualText, projectionText }: CheckInput, error: Report) {
  const message = "Not a valid number. Type digits only, e.g. 250000 or 2,50,000.";
  if (hasActual) {
    for (const [key, text] of Object.entries(actualText)) {
      if (!isValidNumberText(text)) error(`actual.${key as keyof ActualFigures}`, message);
    }
  }
  for (const [key, text] of Object.entries(projectionText)) {
    if (!isValidNumberText(text)) error(`projection.${key as keyof ProjectionAssumptions}`, message);
  }
}

function checkActual({ actualText, statements }: CheckInput, error: Report, warn: Report) {
  const period = statements.periods.find((entry) => entry.kind === "actual");
  if (!period) return;
  const a = Object.fromEntries(Object.entries(actualText).map(([key, text]) => [key, value(text)])) as ActualFigures;
  const { pl, bs } = period;

  // ── Trading and P&L ──
  const expenses = a.purchases + a.directExpenses + a.salaries + a.rent + a.adminExpenses + a.otherExpenses;
  if (a.sales <= 0 && expenses > 0) {
    error("actual.sales", "Sales are blank but purchases and expenses are filled in. Enter the year's turnover from the ITR or books.");
  }

  const available = a.openingStock + a.purchases + a.directExpenses;
  if (a.closingStock > available + TALLY_TOLERANCE) {
    error(
      "actual.closingStock",
      `Closing stock (${rs(a.closingStock)}) is more than all the stock the business had: opening stock + purchases + direct expenses = ${rs(available)}. Check closing stock or purchases.`,
    );
  } else if (a.sales > 0 && pl.grossProfit < 0) {
    warn(
      "actual.purchases",
      `Cost of sales (${rs(pl.costOfSales)}) is more than sales (${rs(a.sales)}), a gross loss of ${rs(-pl.grossProfit)}. Check purchases and closing stock.`,
    );
  } else if (a.sales > 0 && pl.grossProfit / a.sales > 0.6 && a.purchases > 0) {
    warn("actual.purchases", `Gross profit is ${Math.round((pl.grossProfit / a.sales) * 100)}% of sales, which is unusually high for trading. Check purchases and closing stock.`);
  }

  if (a.tax > 0) {
    const pbt = pl.profitBeforeTax;
    if (pbt <= 0) error("actual.tax", `Income tax is entered but there is no profit before tax (${rs(pbt)}). Tax cannot be paid on a loss.`);
    else if (a.tax > pbt) error("actual.tax", `Income tax (${rs(a.tax)}) is more than the profit before tax (${rs(pbt)}).`);
  }

  if (a.interest > 0 && a.termLoan + a.unsecuredLoans <= 0) {
    warn("actual.interest", "Interest is shown but no loan is outstanding in the balance sheet. Add the loan, or check this figure.");
  } else if (a.termLoan > 0 && a.interest <= 0) {
    warn("actual.interest", `A term loan of ${rs(a.termLoan)} is outstanding but no interest is shown for the year.`);
  }

  if (a.depreciation > 0 && a.fixedAssets <= 0) {
    warn("actual.depreciation", "Depreciation is claimed but fixed assets are nil. Enter the net block, or remove the depreciation.");
  } else if (a.depreciation > 0 && a.depreciation / (a.fixedAssets + a.depreciation) > 0.4) {
    warn(
      "actual.depreciation",
      `Depreciation is ${Math.round((a.depreciation / (a.fixedAssets + a.depreciation)) * 100)}% of the opening block. Income-tax rates are 10 to 40%; check the figure.`,
    );
  }

  // ── Balance sheet ──
  if (bs.closingCapital < 0) {
    error(
      "actual.drawings",
      `Drawings take the closing capital below zero (${rs(bs.closingCapital)}). Opening capital + capital introduced + profit is only ${rs(bs.closingCapital + a.drawings)}.`,
    );
  }

  const bsFilled = a.fixedAssets + a.debtors + a.cashAndBank + a.creditors + a.termLoan > 0;
  if (bsFilled && a.openingCapital <= 0 && a.capitalIntroduced <= 0) {
    warn("actual.openingCapital", "No capital is shown. Enter the owner's capital at the start of the year from last year's balance sheet.");
  }

  if (a.sales > 0 && a.debtors > a.sales) {
    warn("actual.debtors", `Debtors (${rs(a.debtors)}) are more than the whole year's sales (${rs(a.sales)}).`);
  }
  const bought = a.purchases + a.directExpenses;
  if (bought > 0 && a.creditors > bought) {
    warn("actual.creditors", `Creditors (${rs(a.creditors)}) are more than the whole year's purchases (${rs(bought)}).`);
  }

  if (Math.abs(bs.difference) > TALLY_TOLERANCE) {
    const neededCash = a.cashAndBank + bs.difference;
    const side =
      bs.difference > 0
        ? `Liabilities (${rs(bs.totalLiabilities)}) are ${rs(bs.difference)} more than assets (${rs(bs.totalAssets)}).`
        : `Assets (${rs(bs.totalAssets)}) are ${rs(-bs.difference)} more than liabilities (${rs(bs.totalLiabilities)}).`;
    const unreadable = (Object.entries(actualText) as [keyof ActualFigures, string][]).filter(([, text]) => !isValidNumberText(text));
    error(
      "actual.cashAndBank",
      unreadable.length
        ? `${side} ${FIELD_LABELS[`actual.${unreadable[0][0]}`]} is not a valid number and counts as 0 until it is fixed, so correct that first.`
        : neededCash >= 0
        ? `${side} If every other figure is right, cash and bank should be ${rs(neededCash)}. Otherwise check capital, loans, creditors, fixed assets and debtors.`
        : `${side} Even nil cash would not close the gap, so a liability is missing or an asset is overstated. Check capital, loans, creditors, fixed assets and debtors.`,
    );
  }
}

function checkProjection({ hasActual, projectionText, actualText, details }: CheckInput, error: Report, warn: Report) {
  const p = (key: keyof ProjectionAssumptions) => value(projectionText[key]);
  const blank = (key: keyof ProjectionAssumptions) => projectionText[key].replace(/,/g, "").trim() === "";

  if (!hasActual && (blank("year1Sales") || p("year1Sales") <= 0)) {
    error("projection.year1Sales", "A new business has no past figures, so enter the expected sales for the first year.");
  }

  const growth = p("salesGrowthPct");
  if (growth > 100) error("projection.salesGrowthPct", `${growth}% growth means sales more than double every year. Enter a realistic rate.`);
  else if (growth > 30) warn("projection.salesGrowthPct", `${growth}% growth every year is high for a bank file; banks usually question more than 25 to 30%.`);

  if (!blank("materialCostPct")) {
    const cost = p("materialCostPct");
    if (cost >= 100) error("projection.materialCostPct", `Cost of sales at ${cost}% of sales means a loss on every sale. It must be below 100%.`);
    else if (cost < 20) warn("projection.materialCostPct", `Cost of sales at ${cost}% leaves an ${100 - cost}% gross margin, which is rare. Check the figure.`);
  }

  if (p("expenseGrowthPct") > 100) error("projection.expenseGrowthPct", "Expense growth above 100% a year is not realistic.");
  if (p("depreciationPct") > 100) error("projection.depreciationPct", "A depreciation rate cannot be more than 100%.");
  else if (p("depreciationPct") > 40) warn("projection.depreciationPct", "Income-tax depreciation rates are 10 to 40% WDV. Check the rate.");
  if (p("taxPct") > 100) error("projection.taxPct", "Tax cannot be more than 100% of profit.");
  else if (p("taxPct") > 40) warn("projection.taxPct", "Indian income-tax rates do not go above about 40% including surcharge and cess.");

  const newLoan = p("newTermLoan");
  if (newLoan > 0) {
    const tenure = p("loanTenureYears");
    if (tenure < 1) error("projection.loanTenureYears", "Enter the loan tenure in years (1 or more), so the repayment can be worked out.");
    else if (!Number.isInteger(tenure)) error("projection.loanTenureYears", "Enter the tenure in whole years, e.g. 5.");
    else if (tenure > 30) warn("projection.loanTenureYears", "A business term loan longer than 30 years is unusual. Check the tenure.");

    const rate = p("loanInterestPct");
    if (rate <= 0) warn("projection.loanInterestPct", "A new loan is shown with no interest rate. Enter the bank's rate.");
    else if (rate > 30) warn("projection.loanInterestPct", `${rate}% a year is far above bank rates. Check the figure.`);

    const assets = p("newFixedAssets");
    if (assets > 0 && newLoan > assets) {
      warn("projection.newTermLoan", `The loan (${rs(newLoan)}) is more than the cost of the new assets (${rs(assets)}). Banks usually fund up to 75 to 80% of the cost.`);
    }

    const applied = value(details.loanAmount);
    if (applied > 0 && Math.abs(applied - newLoan) > TALLY_TOLERANCE) {
      warn("projection.newTermLoan", `The loan applied for is ${rs(applied)} but the projection uses ${rs(newLoan)}. Make them the same unless part is working capital.`);
    }
  }

  if (hasActual) {
    const outstanding = value(actualText.termLoan);
    const repaid = p("existingLoanRepaymentPerYear");
    if (repaid > 0 && outstanding <= 0) warn("projection.existingLoanRepaymentPerYear", "A repayment is entered but no term loan is outstanding in the actual balance sheet.");
    else if (outstanding > 0 && repaid > outstanding) {
      warn("projection.existingLoanRepaymentPerYear", `The yearly repayment is more than the whole loan outstanding (${rs(outstanding)}).`);
    }
  }

  for (const key of ["debtorDays", "creditorDays", "stockDays"] as const) {
    if (!blank(key) && p(key) > 365) error(`projection.${key}`, "That is more than a year (365 days). Check the figure.");
  }
}
