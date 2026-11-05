import type { FieldKey } from "@/lib/balance-sheets/checks";

/**
 * What to put in each box of the balance sheet form, shown when the admin
 * rests the pointer on a box or moves into it.
 *
 * Every entry answers the four questions someone filling a customer's file
 * actually has: what goes here, where do I get it, why does it matter, and
 * can I leave it blank.
 */

export type Importance = "required" | "important" | "optional";

export type FieldGuide = {
  /** What to enter, in one or two sentences. */
  what: string;
  /** Where the figure comes from. */
  where: string;
  /** Why the bank or the statements need it. */
  why: string;
  importance: Importance;
};

export type GuideKey =
  | FieldKey
  | "constitution"
  | "natureOfBusiness"
  | "udyamNumber"
  | "address"
  | "city"
  | "state"
  | "bankName"
  | "loanPurpose"
  | "baseYear"
  | "hasActual";

export const IMPORTANCE_LABEL: Record<Importance, string> = {
  required: "Must fill",
  important: "Bank checks this",
  optional: "Optional",
};

export const FIELD_GUIDE: Record<GuideKey, FieldGuide> = {
  // ── 1. Customer and business ──
  businessName: {
    what: "The firm's name exactly as on its GST certificate, Udyam certificate or bank account.",
    where: "GST certificate, Udyam certificate, or the current account passbook.",
    why: "It is printed on every page. If it differs from the bank's records, the file is sent back.",
    importance: "required",
  },
  ownerName: {
    what: "Full name of the proprietor, or all partners or directors separated by commas.",
    where: "PAN card or Aadhaar of the owner; partnership deed or MCA records for a firm or company.",
    why: "It goes in the signature block. The person named here signs the statements.",
    importance: "required",
  },
  constitution: {
    what: "The legal form of the business: proprietorship, partnership, LLP, private limited and so on.",
    where: "GST or Udyam certificate shows it; a partnership deed or incorporation certificate confirms it.",
    why: "It decides the capital heading (proprietor's, partners' or shareholders' funds) and how the bank appraises the file.",
    importance: "required",
  },
  natureOfBusiness: {
    what: "One line on what the business does, e.g. 'Wholesale trading of grocery' or 'Tailoring and readymade garments'.",
    where: "Ask the customer; GST certificate lists the goods or services.",
    why: "Printed on the cover. The bank uses it to judge whether margins and stock levels make sense.",
    importance: "important",
  },
  pan: {
    what: "10-character PAN: the proprietor's own PAN for a proprietorship, the firm's PAN otherwise.",
    where: "PAN card, or the top of the ITR acknowledgement.",
    why: "The bank matches it with the ITR and CIBIL. A wrong PAN means the figures cannot be verified.",
    importance: "important",
  },
  gstin: {
    what: "15-character GST number, if the business is registered under GST.",
    where: "GST registration certificate or any GST invoice the business issues.",
    why: "The bank compares the sales you enter with GST returns. Characters 3 to 12 must be the PAN above.",
    importance: "optional",
  },
  udyamNumber: {
    what: "Udyam registration number, e.g. UDYAM-UP-01-0012345.",
    where: "Udyam registration certificate (udyamregistration.gov.in).",
    why: "MSME loans, Mudra and CGTMSE cover need it; it can get a lower rate or collateral-free limit.",
    importance: "optional",
  },
  mobile: {
    what: "The customer's 10-digit mobile number.",
    where: "Ask the customer; use the number linked to their bank account if possible.",
    why: "Printed in the details table so the bank can reach the borrower.",
    importance: "optional",
  },
  email: {
    what: "The customer's email address.",
    where: "Ask the customer.",
    why: "Printed in the details table. Leave blank if they have none.",
    importance: "optional",
  },
  address: {
    what: "Full business address: shop or plot number, street, area.",
    where: "GST certificate, Udyam certificate, rent agreement or electricity bill.",
    why: "The bank visits this address for inspection, so it must match the KYC documents.",
    importance: "important",
  },
  city: {
    what: "City or town of the business.",
    where: "Same as the address.",
    why: "Printed with the address and used for 'Place' in the signature block.",
    importance: "important",
  },
  state: {
    what: "State of the business.",
    where: "Same as the address. The first two digits of the GSTIN are the state code.",
    why: "Printed with the address.",
    importance: "optional",
  },
  pincode: {
    what: "6-digit pincode of the business address.",
    where: "Same as the address.",
    why: "Printed with the address; banks check the branch serves that area.",
    importance: "optional",
  },
  bankName: {
    what: "Bank and branch where the loan file is going, e.g. 'State Bank of India, Orai'.",
    where: "Ask the customer which branch they are applying to.",
    why: "The cover reads 'Submitted to ...'. A file addressed to the right branch looks prepared for it.",
    importance: "important",
  },
  loanPurpose: {
    what: "What the loan is for, e.g. 'Working capital (CC limit)' or 'Purchase of embroidery machine'.",
    where: "Ask the customer; it should match the loan application form.",
    why: "Printed on the cover and in the notes. The projections should support this purpose.",
    importance: "important",
  },
  loanAmount: {
    what: "Amount of loan the customer is applying for, in rupees.",
    where: "The loan application or the bank's sanction discussion.",
    why: "Printed on the cover. If it is a term loan, enter the same amount as 'New term loan' below.",
    importance: "important",
  },

  // ── 2. Period ──
  baseYear: {
    what: "The last financial year whose accounts are closed (April to March).",
    where: "The year of the customer's latest ITR or audited balance sheet.",
    why: "The actual figures are for this year; projections start from the next year.",
    importance: "required",
  },
  "projection.years": {
    what: "How many future years to project. Banks usually ask for 3 years; term loans often need 5 or the loan tenure.",
    where: "Ask the bank, or match the loan tenure.",
    why: "DSCR is worked out for each projected year, so the projection should cover the repayment period.",
    importance: "required",
  },
  hasActual: {
    what: "'Available' if the business already ran for a year; 'New business' if it is just starting.",
    where: "If there is at least one ITR or one year of books, it is available.",
    why: "For a new business only projections are made, and the first-year sales must be entered by hand.",
    importance: "required",
  },

  // ── 3. Trading and P&L (actual) ──
  "actual.sales": {
    what: "Total sales or gross receipts for the year, without GST.",
    where: "ITR (gross turnover), GSTR-3B total for the year, or the P&L account.",
    why: "Everything starts from sales: margins, debtor days and next year's projection. It must match ITR and GST.",
    importance: "required",
  },
  "actual.otherIncome": {
    what: "Income other than sales: interest received, commission, rent received, discounts.",
    where: "P&L account (credit side), or 'income from other sources' in the ITR.",
    why: "Adds to profit. Leave blank if there is none.",
    importance: "optional",
  },
  "actual.openingStock": {
    what: "Value of stock on hand on 1st April (start of the year).",
    where: "Last year's balance sheet: its closing stock is this year's opening stock.",
    why: "Needed to work out cost of sales. If it is wrong, gross profit is wrong.",
    importance: "important",
  },
  "actual.purchases": {
    what: "Total goods or raw material bought during the year, without GST.",
    where: "Purchase register, GSTR-2B total, or the P&L account (debit side).",
    why: "Biggest part of cost of sales. Too low inflates profit, which the bank will question against GST returns.",
    importance: "required",
  },
  "actual.directExpenses": {
    what: "Costs of making or bringing in the goods: freight inward, labour wages, power for the machine, packing.",
    where: "Trading account (debit side) or expense ledger.",
    why: "Part of cost of sales, so it affects gross profit.",
    importance: "important",
  },
  "actual.closingStock": {
    what: "Value of stock on hand on 31st March, at cost price.",
    where: "Stock statement or the balance sheet. Must not be more than opening stock + purchases + direct expenses.",
    why: "Appears in both the P&L and the balance sheet. Banks give working capital against stock, so they check it closely.",
    importance: "required",
  },
  "actual.salaries": {
    what: "Salaries and wages paid to staff (not to the proprietor) during the year.",
    where: "Salary register or the P&L account.",
    why: "Indirect expense that reduces profit. Do not include the owner's own drawings here.",
    importance: "important",
  },
  "actual.rent": {
    what: "Rent paid for the shop, office or godown for the year.",
    where: "Rent agreement or the P&L account. Leave blank if the premises are owned.",
    why: "Indirect expense that reduces profit.",
    importance: "optional",
  },
  "actual.adminExpenses": {
    what: "Electricity, telephone, internet, stationery, office upkeep and similar running costs.",
    where: "P&L account or expense ledgers.",
    why: "Indirect expense that reduces profit.",
    importance: "optional",
  },
  "actual.otherExpenses": {
    what: "Any expense not listed above: travel, repairs, insurance, bank charges, professional fees.",
    where: "P&L account.",
    why: "Indirect expense that reduces profit.",
    importance: "optional",
  },
  "actual.interest": {
    what: "Interest paid on loans during the year (term loan, CC/OD, other loans).",
    where: "Bank's interest certificate, loan statement, or the P&L account.",
    why: "Reduces profit and is part of the DSCR. If there is a loan below, there should be interest here.",
    importance: "important",
  },
  "actual.depreciation": {
    what: "Depreciation claimed on fixed assets for the year.",
    where: "Depreciation schedule in the ITR or the fixed asset schedule. Income-tax rates are 10 to 40% WDV.",
    why: "Reduces profit but not cash, so it is added back in the DSCR.",
    importance: "important",
  },
  "actual.tax": {
    what: "Income tax paid or payable on the year's profit.",
    where: "ITR computation ('tax payable'). Leave blank if no tax was due.",
    why: "Reduces net profit. It cannot be more than the profit before tax.",
    importance: "optional",
  },

  // ── 4. Balance sheet (actual) ──
  "actual.openingCapital": {
    what: "Owner's capital at the start of the year (1st April).",
    where: "Last year's balance sheet: closing capital becomes this year's opening capital.",
    why: "The base of the capital account. Closing capital = opening + capital introduced + profit - drawings.",
    importance: "required",
  },
  "actual.capitalIntroduced": {
    what: "Fresh money the owner put into the business during the year.",
    where: "Capital account in the books, or bank credits from the owner's personal account.",
    why: "Adds to capital. Banks like to see the owner putting in own money.",
    importance: "optional",
  },
  "actual.drawings": {
    what: "Money the owner took out of the business for personal or household use during the year.",
    where: "Capital account in the books, or personal withdrawals in the bank statement.",
    why: "Reduces capital. Very high drawings make the bank doubt repayment capacity.",
    importance: "important",
  },
  "actual.termLoan": {
    what: "Balance still owed on term loans (machinery, vehicle, business loans) on 31st March.",
    where: "Loan account statement or the bank's balance confirmation as on 31st March.",
    why: "Shown as a secured loan. The bank counts the repayment of existing loans in the DSCR.",
    importance: "important",
  },
  "actual.unsecuredLoans": {
    what: "Loans from friends, relatives or others without any security, still owed on 31st March.",
    where: "Loan ledgers in the books, or loan confirmations from the lenders.",
    why: "Banks treat these as quasi-capital only if the lender agrees not to withdraw them during the loan.",
    importance: "optional",
  },
  "actual.creditors": {
    what: "Amount owed to suppliers for goods bought on credit, as on 31st March.",
    where: "Sundry creditors list in the books, or unpaid purchase bills.",
    why: "A current liability. Banks deduct it from stock when working out the drawing power.",
    importance: "important",
  },
  "actual.otherCurrentLiabilities": {
    what: "Other amounts payable within a year: unpaid salary, GST payable, expenses payable, CC/OD balance used.",
    where: "Balance sheet (current liabilities) or ledgers.",
    why: "A current liability that affects the current ratio.",
    importance: "optional",
  },
  "actual.fixedAssets": {
    what: "Net value of fixed assets (machinery, furniture, vehicles, computers, building) after depreciation, on 31st March.",
    where: "Fixed asset schedule or depreciation chart in the ITR or balance sheet.",
    why: "Shows what the business owns. Depreciation for the projection years is worked out on this.",
    importance: "important",
  },
  "actual.investments": {
    what: "FDs, NSC, shares, LIC or other investments held in the business's name.",
    where: "FD receipts, investment statements or the balance sheet.",
    why: "An asset. Leave blank if there are none.",
    importance: "optional",
  },
  "actual.debtors": {
    what: "Money customers owe the business for goods sold on credit, as on 31st March.",
    where: "Sundry debtors list in the books, or unpaid sales invoices.",
    why: "A current asset. Banks lend against debtors under 90 days old and check the debtor days.",
    importance: "important",
  },
  "actual.cashAndBank": {
    what: "Cash in hand plus balance in all business bank accounts on 31st March.",
    where: "Cash book and bank statements as on 31st March.",
    why: "If the balance sheet does not tally, check this first: the form tells you what cash should be.",
    importance: "required",
  },
  "actual.otherCurrentAssets": {
    what: "Advances to suppliers, security deposits, prepaid expenses, GST input credit, TDS receivable.",
    where: "Balance sheet (current assets) or ledgers.",
    why: "A current asset. Leave blank if there are none.",
    importance: "optional",
  },

  // ── 5. Projections ──
  "projection.year1Sales": {
    what: "Expected sales for the first projected year. Leave blank to use last year's sales plus the growth rate.",
    where: "Customer's estimate, orders in hand, or last year's sales plus a realistic growth.",
    why: "Every projected figure follows from this. Banks question a jump far above last year's sales.",
    importance: "important",
  },
  "projection.salesGrowthPct": {
    what: "Yearly growth in sales after the first year, in percent. 8 to 15% is usual.",
    where: "Past growth from the customer's ITRs, or the customer's realistic plan.",
    why: "Banks usually question more than 25 to 30% a year without a clear reason.",
    importance: "important",
  },
  "projection.materialCostPct": {
    what: "Cost of goods sold as a percent of sales. Leave blank to use last year's ratio (shown in grey).",
    where: "Last year's cost of sales / sales; the grey figure is already worked out.",
    why: "Sets the gross margin. It must be below 100%, or every sale makes a loss.",
    importance: "optional",
  },
  "projection.indirectExpensesYear1": {
    what: "Salaries, rent, office and other running costs for the first projected year. Leave blank to use last year's plus growth.",
    where: "Last year's indirect expenses, adjusted for new staff or a new shop.",
    why: "Reduces profit. Too low makes the projection look unrealistic.",
    importance: "optional",
  },
  "projection.expenseGrowthPct": {
    what: "Yearly increase in indirect expenses, in percent. 5 to 10% is usual for inflation.",
    where: "General inflation, or planned increases in staff or rent.",
    why: "Keeps the projection realistic year after year.",
    importance: "optional",
  },
  "projection.otherIncomePerYear": {
    what: "Other income expected each year (interest, commission). Leave blank to keep last year's figure.",
    where: "Last year's other income.",
    why: "Adds to profit.",
    importance: "optional",
  },
  "projection.depreciationPct": {
    what: "Depreciation rate on fixed assets, written down value method. 15% for plant and machinery is common.",
    where: "Income-tax rates: furniture 10%, plant and machinery 15%, vehicles 15%, computers 40%.",
    why: "Reduces profit and the value of assets each year.",
    importance: "optional",
  },
  "projection.taxPct": {
    what: "Income tax as a percent of profit. Use 0 if the profit stays below the taxable limit.",
    where: "The customer's tax slab; for a company usually 25%, for a firm 30% plus cess.",
    why: "Reduces net profit and the cash left to repay the loan.",
    importance: "optional",
  },
  "projection.drawingsPerYear": {
    what: "Money the owner will take out each year for household expenses.",
    where: "Last year's drawings, or what the family needs to live on.",
    why: "Reduces capital and cash. Banks expect realistic drawings, not zero.",
    importance: "important",
  },
  "projection.capitalIntroducedYear1": {
    what: "Own money the owner will put into the business in the first projected year, e.g. the margin money for the loan.",
    where: "Ask the customer. Banks usually need 10 to 25% of the project cost as the owner's margin.",
    why: "Shows the owner's stake. With a term loan, the bank checks this covers the margin.",
    importance: "important",
  },
  "projection.newFixedAssets": {
    what: "Cost of new machinery, vehicles, furniture or other assets to be bought with the loan.",
    where: "Quotations or proforma invoices from the supplier.",
    why: "The bank funds a part of this cost. Attach the quotations to the file.",
    importance: "important",
  },
  "projection.newTermLoan": {
    what: "Amount of the new term loan being applied for.",
    where: "Same as the loan amount applied for, if it is a term loan.",
    why: "Drives the repayment schedule and the DSCR.",
    importance: "important",
  },
  "projection.loanInterestPct": {
    what: "Yearly interest rate on the new loan, in percent.",
    where: "The bank's current rate for this kind of loan (ask the branch). 9 to 12% is typical.",
    why: "Interest reduces profit and is part of the DSCR.",
    importance: "important",
  },
  "projection.loanTenureYears": {
    what: "Number of years over which the new loan will be repaid.",
    where: "The bank's scheme; machinery loans are usually 5 to 7 years.",
    why: "Sets the yearly repayment. A longer tenure gives a better DSCR.",
    importance: "important",
  },
  "projection.existingLoanRepaymentPerYear": {
    what: "How much of the existing term loan will be repaid each year (principal only).",
    where: "Loan repayment schedule: EMI x 12 minus interest, or the bank's amortisation sheet.",
    why: "Banks include existing repayments in the DSCR, so leaving it out overstates repayment capacity.",
    importance: "important",
  },
  "projection.existingLoanInterestPct": {
    what: "Interest rate on the existing term loan, in percent.",
    where: "The loan sanction letter or statement.",
    why: "Interest on the existing loan reduces profit and goes into the DSCR.",
    importance: "optional",
  },
  "projection.debtorDays": {
    what: "On average, how many days customers take to pay. Leave blank to use last year's (shown in grey).",
    where: "Last year's debtors / sales x 365; the grey figure is already worked out.",
    why: "Sets the debtors in each projected balance sheet. Banks finance debtors up to 90 days.",
    importance: "optional",
  },
  "projection.creditorDays": {
    what: "On average, how many days the business takes to pay suppliers. Leave blank to use last year's.",
    where: "Last year's creditors / purchases x 365; the grey figure is already worked out.",
    why: "Sets the creditors in each projected balance sheet.",
    importance: "optional",
  },
  "projection.stockDays": {
    what: "How many days of sales the stock on hand covers. Leave blank to use last year's.",
    where: "Last year's closing stock / cost of sales x 365; the grey figure is already worked out.",
    why: "Sets the closing stock in each projected year, which the bank finances under the CC limit.",
    importance: "optional",
  },
};
