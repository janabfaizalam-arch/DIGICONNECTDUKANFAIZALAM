import { formatAmount, TALLY_TOLERANCE, type ActualFigures, type ProjectionAssumptions, type Statements } from "@/lib/balance-sheets/engine";
import { mudraCategory, schemeTerms } from "@/lib/balance-sheets/schemes";

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
  "projection.scheme": "Loan yojana",
  "projection.schemeSector": "Sector",
  "projection.schemeArea": "Area",
  "projection.schemeCategory": "Category",
  "projection.workingCapitalNeed": "Working capital requirement",
  "projection.ccLimit": "CC / working capital limit",
  "projection.ccInterestPct": "CC interest rate",
  "projection.subsidyAmount": "Margin money / capital subsidy",
  "projection.interestSubventionPct": "Interest subvention",
  "projection.interestSubventionYears": "Interest subvention years",
};

/** Projection boxes that hold a choice, not a number. */
export const CHOICE_PROJECTION_KEYS = new Set<keyof ProjectionAssumptions>(["scheme", "schemeSector", "schemeArea", "schemeCategory"]);

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
  checkScheme(input, error, warn);

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

  if (showRequired && details.businessName.trim().length < 2) error("businessName", "Business ya firm ka naam bharein. Ye har page par chhapta hai.");
  if (showRequired && details.ownerName.trim().length < 2) error("ownerName", "Proprietor ya partners ka naam bharein. Ye signature wale box mein jaata hai.");

  const pan = details.pan.trim().toUpperCase();
  if (pan && shown("pan") && !PAN_RE.test(pan)) {
    error("pan", "PAN 10 character ka hota hai: 5 letter, 4 number, 1 letter (jaise ABCDE1234F).");
  }

  const gstin = details.gstin.trim().toUpperCase();
  if (gstin && shown("gstin")) {
    if (!GSTIN_RE.test(gstin)) {
      error("gstin", "GSTIN 15 character ka hota hai: 2 number state code, 10 character PAN, phir 3 aur (jaise 09ABCDE1234F1Z5).");
    } else if (PAN_RE.test(pan) && gstin.slice(2, 12) !== pan) {
      error("gstin", `Ye GSTIN PAN ${gstin.slice(2, 12)} ka hai, ${pan} ka nahi. GSTIN ke 3rd se 12th character PAN hote hain.`);
    }
  }

  const mobile = details.mobile.trim();
  if (mobile && shown("mobile") && !/^[6-9][0-9]{9}$/.test(mobile)) {
    error("mobile", mobile.length !== 10 ? `Mobile number mein ${mobile.length} digit hain, 10 chahiye.` : "Indian mobile number 6, 7, 8 ya 9 se shuru hota hai.");
  }

  const pincode = details.pincode.trim();
  if (pincode && shown("pincode") && !/^[1-9][0-9]{5}$/.test(pincode)) {
    error("pincode", pincode.length !== 6 ? `Pincode mein ${pincode.length} digit hain, 6 chahiye.` : "Pincode 0 se shuru nahi hota.");
  }

  const email = details.email.trim();
  if (email && shown("email") && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    error("email", "Ye sahi email address nahi lag raha (jaise name@example.com).");
  }

  if (details.loanAmount.trim() && !isValidNumberText(details.loanAmount)) {
    error("loanAmount", "Ye sahi amount nahi hai. Sirf number likhein, jaise 500000 ya 5,00,000.");
  }
}

function checkNumberFormat({ hasActual, actualText, projectionText }: CheckInput, error: Report) {
  const message = "Ye sahi number nahi hai. Sirf number likhein, jaise 250000 ya 2,50,000.";
  if (hasActual) {
    for (const [key, text] of Object.entries(actualText)) {
      if (!isValidNumberText(text)) error(`actual.${key as keyof ActualFigures}`, message);
    }
  }
  for (const [key, text] of Object.entries(projectionText)) {
    if (CHOICE_PROJECTION_KEYS.has(key as keyof ProjectionAssumptions)) continue;
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
    error("actual.sales", "Sales khaali hai par purchases aur kharche bhare hain. ITR ya books se saal ka turnover bharein.");
  }

  const available = a.openingStock + a.purchases + a.directExpenses;
  if (a.closingStock > available + TALLY_TOLERANCE) {
    error(
      "actual.closingStock",
      `Closing stock (${rs(a.closingStock)}) business ke poore maal se zyada hai: opening stock + purchases + direct expenses = ${rs(available)}. Closing stock ya purchases check karein.`,
    );
  } else if (a.sales > 0 && pl.grossProfit < 0) {
    warn(
      "actual.purchases",
      `Cost of sales (${rs(pl.costOfSales)}) sales (${rs(a.sales)}) se zyada hai, yaani ${rs(-pl.grossProfit)} ka gross loss. Purchases aur closing stock check karein.`,
    );
  } else if (a.sales > 0 && pl.grossProfit / a.sales > 0.6 && a.purchases > 0) {
    warn("actual.purchases", `Gross profit sales ka ${Math.round((pl.grossProfit / a.sales) * 100)}% hai, jo trading ke liye bahut zyada hai. Purchases aur closing stock check karein.`);
  }

  if (a.tax > 0) {
    const pbt = pl.profitBeforeTax;
    if (pbt <= 0) error("actual.tax", `Income tax bhara hai par profit before tax nahi hai (${rs(pbt)}). Ghaate par tax nahi lagta.`);
    else if (a.tax > pbt) error("actual.tax", `Income tax (${rs(a.tax)}) profit before tax (${rs(pbt)}) se zyada hai.`);
  }

  if (a.interest > 0 && a.termLoan + a.unsecuredLoans <= 0) {
    warn("actual.interest", "Byaaj bhara hai par balance sheet mein koi loan baaki nahi hai. Loan bharein, ya ye figure check karein.");
  } else if (a.termLoan > 0 && a.interest <= 0) {
    warn("actual.interest", `${rs(a.termLoan)} ka term loan baaki hai par saal ka koi byaaj nahi bhara.`);
  }

  if (a.depreciation > 0 && a.fixedAssets <= 0) {
    warn("actual.depreciation", "Depreciation liya hai par fixed assets zero hain. Net block bharein, ya depreciation hata dein.");
  } else if (a.depreciation > 0 && a.depreciation / (a.fixedAssets + a.depreciation) > 0.4) {
    warn(
      "actual.depreciation",
      `Depreciation opening block ka ${Math.round((a.depreciation / (a.fixedAssets + a.depreciation)) * 100)}% hai. Income tax ke rate 10 se 40% hote hain; figure check karein.`,
    );
  }

  // ── Balance sheet ──
  if (bs.closingCapital < 0) {
    error(
      "actual.drawings",
      `Drawings ki wajah se closing capital zero se neeche chali gayi (${rs(bs.closingCapital)}). Opening capital + naya paisa + profit sirf ${rs(bs.closingCapital + a.drawings)} hai.`,
    );
  }

  const bsFilled = a.fixedAssets + a.debtors + a.cashAndBank + a.creditors + a.termLoan > 0;
  if (bsFilled && a.openingCapital <= 0 && a.capitalIntroduced <= 0) {
    warn("actual.openingCapital", "Koi capital nahi bhari. Pichhle saal ki balance sheet se saal ki shuruat ki capital bharein.");
  }

  if (a.sales > 0 && a.debtors > a.sales) {
    warn("actual.debtors", `Debtors (${rs(a.debtors)}) poore saal ki sales (${rs(a.sales)}) se zyada hain.`);
  }
  const bought = a.purchases + a.directExpenses;
  if (bought > 0 && a.creditors > bought) {
    warn("actual.creditors", `Creditors (${rs(a.creditors)}) poore saal ki purchases (${rs(bought)}) se zyada hain.`);
  }

  if (Math.abs(bs.difference) > TALLY_TOLERANCE) {
    const neededCash = a.cashAndBank + bs.difference;
    const side =
      bs.difference > 0
        ? `Liabilities (${rs(bs.totalLiabilities)}) assets (${rs(bs.totalAssets)}) se ${rs(bs.difference)} zyada hain.`
        : `Assets (${rs(bs.totalAssets)}) liabilities (${rs(bs.totalLiabilities)}) se ${rs(-bs.difference)} zyada hain.`;
    const unreadable = (Object.entries(actualText) as [keyof ActualFigures, string][]).filter(([, text]) => !isValidNumberText(text));
    error(
      "actual.cashAndBank",
      unreadable.length
        ? `${side} ${FIELD_LABELS[`actual.${unreadable[0][0]}`]} mein sahi number nahi hai, theek hone tak wo 0 gina jaayega. Pehle use theek karein.`
        : neededCash >= 0
        ? `${side} Agar baaki sab figure sahi hain, to cash and bank ${rs(neededCash)} hona chahiye. Warna capital, loans, creditors, fixed assets aur debtors check karein.`
        : `${side} Cash zero karne par bhi farak khatam nahi hoga, yaani koi liability chhoot gayi hai ya koi asset zyada bhara hai. Capital, loans, creditors, fixed assets aur debtors check karein.`,
    );
  }
}

function checkProjection({ hasActual, projectionText, actualText, details }: CheckInput, error: Report, warn: Report) {
  const p = (key: keyof ProjectionAssumptions) => value(projectionText[key]);
  const blank = (key: keyof ProjectionAssumptions) => projectionText[key].replace(/,/g, "").trim() === "";

  if (!hasActual && (blank("year1Sales") || p("year1Sales") <= 0)) {
    error("projection.year1Sales", "Naye business ke pichhle figure nahi hote, isliye pehle saal ki expected sales bharein.");
  }

  const growth = p("salesGrowthPct");
  if (growth > 100) error("projection.salesGrowthPct", `${growth}% growth ka matlab hai sales har saal double se zyada. Realistic rate bharein.`);
  else if (growth > 30) warn("projection.salesGrowthPct", `Har saal ${growth}% growth bank file ke liye zyada hai; 25 se 30% se upar par bank aksar sawaal karta hai.`);

  if (!blank("materialCostPct")) {
    const cost = p("materialCostPct");
    if (cost >= 100) error("projection.materialCostPct", `Cost of sales ${cost}% matlab har sale par ghaata. Ye 100% se kam hona chahiye.`);
    else if (cost < 20) warn("projection.materialCostPct", `Cost of sales ${cost}% se gross margin ${100 - cost}% bachta hai, jo bahut kam dekhne ko milta hai. Figure check karein.`);
  }

  if (p("expenseGrowthPct") > 100) error("projection.expenseGrowthPct", "Kharche har saal 100% se zyada badhna realistic nahi hai.");
  if (p("depreciationPct") > 100) error("projection.depreciationPct", "Depreciation ka rate 100% se zyada nahi ho sakta.");
  else if (p("depreciationPct") > 40) warn("projection.depreciationPct", "Income tax ke depreciation rate 10 se 40% WDV hote hain. Rate check karein.");
  if (p("taxPct") > 100) error("projection.taxPct", "Tax profit ke 100% se zyada nahi ho sakta.");
  else if (p("taxPct") > 40) warn("projection.taxPct", "India mein income tax surcharge aur cess milakar bhi lagbhag 40% se upar nahi jaata.");

  const newLoan = p("newTermLoan");
  if (newLoan > 0) {
    const tenure = p("loanTenureYears");
    if (tenure < 1) error("projection.loanTenureYears", "Loan ki tenure saalon mein bharein (1 ya zyada), taaki kisht nikal sake.");
    else if (!Number.isInteger(tenure)) error("projection.loanTenureYears", "Tenure poore saalon mein bharein, jaise 5.");
    else if (tenure > 30) warn("projection.loanTenureYears", "30 saal se lamba business term loan aam nahi hai. Tenure check karein.");

    const rate = p("loanInterestPct");
    if (rate <= 0) warn("projection.loanInterestPct", "Naya loan bhara hai par byaaj ka rate nahi. Bank ka rate bharein.");
    else if (rate > 30) warn("projection.loanInterestPct", `${rate}% saal bank ke rate se bahut zyada hai. Figure check karein.`);

    const assets = p("newFixedAssets");
    if (assets > 0 && newLoan > assets) {
      warn("projection.newTermLoan", `Loan (${rs(newLoan)}) naye assets ki keemat (${rs(assets)}) se zyada hai. Bank aam taur par keemat ka 75 se 80% hi deta hai.`);
    }

    const applied = value(details.loanAmount);
    // With a CC limit as well, the scheme check compares against term + CC.
    if (applied > 0 && value(projectionText.ccLimit) <= 0 && Math.abs(applied - newLoan) > TALLY_TOLERANCE) {
      warn("projection.newTermLoan", `Apply kiya loan ${rs(applied)} hai par projection mein ${rs(newLoan)} hai. Dono same rakhein, jab tak kuch hissa working capital ka na ho.`);
    }
  }

  if (hasActual) {
    const outstanding = value(actualText.termLoan);
    const repaid = p("existingLoanRepaymentPerYear");
    if (repaid > 0 && outstanding <= 0) warn("projection.existingLoanRepaymentPerYear", "Repayment bhara hai par actual balance sheet mein koi term loan baaki nahi hai.");
    else if (outstanding > 0 && repaid > outstanding) {
      warn("projection.existingLoanRepaymentPerYear", `Saal ka repayment poore baaki loan (${rs(outstanding)}) se zyada hai.`);
    }
  }

  for (const key of ["debtorDays", "creditorDays", "stockDays"] as const) {
    if (!blank(key) && p(key) > 365) error(`projection.${key}`, "Ye ek saal (365 din) se zyada hai. Figure check karein.");
  }
}

/**
 * Loan structure and scheme limits. Scheme figures are defaults that banks
 * apply with their own circulars, so going past a scheme limit is a warning
 * the admin should look at, not a block; a project that does not add up
 * (means of finance short of the cost) is an error.
 */
function checkScheme({ projectionText, details }: CheckInput, error: Report, warn: Report) {
  const p = (key: keyof ProjectionAssumptions) => value(projectionText[key]);
  const fixedAssets = p("newFixedAssets");
  const workingCapital = p("workingCapitalNeed");
  const termLoan = p("newTermLoan");
  const ccLimit = p("ccLimit");
  const own = p("capitalIntroducedYear1");
  const cost = fixedAssets + workingCapital;
  const means = own + termLoan + ccLimit;
  const bankLoan = termLoan + ccLimit;

  if (ccLimit > 0 && p("ccInterestPct") <= 0) warn("projection.ccInterestPct", "CC limit bhari hai par byaaj ka rate nahi. Bank ka CC rate bharein.");
  if (p("interestSubventionPct") > 0 && p("interestSubventionYears") <= 0) {
    error("projection.interestSubventionYears", "Byaaj mein chhoot ka percent bhara hai par kitne saal, ye nahi. Saal bharein.");
  }

  if (cost > 0 && Math.abs(means - cost) > TALLY_TOLERANCE) {
    const short = means < cost;
    (short ? error : warn)(
      "projection.workingCapitalNeed",
      short
        ? `Project cost ${rs(cost)} hai par means of finance (own contribution + term loan + CC) sirf ${rs(means)}. ${rs(cost - means)} ka intezaam dikhayein.`
        : `Means of finance ${rs(means)} project cost ${rs(cost)} se ${rs(means - cost)} zyada hai. Loan ya own contribution check karein.`,
    );
  }

  const applied = value(details.loanAmount);
  if (applied > 0 && ccLimit > 0 && Math.abs(applied - bankLoan) > TALLY_TOLERANCE) {
    warn("loanAmount", `Apply kiya loan ${rs(applied)} hai, par term loan + CC milakar ${rs(bankLoan)} hai.`);
  }

  const scheme = projectionText.scheme as ProjectionAssumptions["scheme"];
  const terms = schemeTerms(scheme, {
    sector: projectionText.schemeSector as ProjectionAssumptions["schemeSector"],
    area: projectionText.schemeArea as ProjectionAssumptions["schemeArea"],
    category: projectionText.schemeCategory as ProjectionAssumptions["schemeCategory"],
  });
  if (!terms || scheme === "none" || scheme === "other") return;

  if (terms.maxProjectCost !== null && cost > terms.maxProjectCost + TALLY_TOLERANCE) {
    warn("projection.newFixedAssets", `${terms.label} mein project cost ${rs(terms.maxProjectCost)} tak hi hoti hai; yahan ${rs(cost)} hai.`);
  }
  if (terms.maxLoan !== null && bankLoan > terms.maxLoan + TALLY_TOLERANCE) {
    warn("projection.newTermLoan", `${terms.label} mein loan ${rs(terms.maxLoan)} tak hi milta hai; yahan term loan + CC ${rs(bankLoan)} hai.`);
  }
  if (scheme === "mudra" && bankLoan > 0) {
    const category = mudraCategory(bankLoan);
    if (category?.name === "Tarun Plus") {
      warn("projection.newTermLoan", "Ye Tarun Plus category ka loan hai (10 se 20 lakh), jo sirf pehle Tarun loan samay par chukane walon ko milta hai.");
    }
  }
  if (terms.needsComposite && (termLoan <= 0 || ccLimit <= 0)) {
    warn("projection.ccLimit", `${terms.label} mein composite loan hota hai: term loan aur CC (working capital) dono bharein.`);
  }
  if (cost > 0) {
    const required = (cost * terms.ownContributionPct) / 100;
    if (own + TALLY_TOLERANCE < required) {
      warn("projection.capitalIntroducedYear1", `${terms.label} mein own contribution project cost ka ${terms.ownContributionPct}% (${rs(required)}) hona chahiye; yahan ${rs(own)} hai.`);
    }
    const maxSubsidy = Math.min((cost * terms.subsidyPct) / 100, terms.subsidyCap ?? Number.POSITIVE_INFINITY);
    if (p("subsidyAmount") > maxSubsidy + TALLY_TOLERANCE) {
      warn("projection.subsidyAmount", `${terms.label} ke hisaab se subsidy zyada se zyada ${rs(maxSubsidy)} banti hai; yahan ${rs(p("subsidyAmount"))} hai.`);
    }
  }
}
