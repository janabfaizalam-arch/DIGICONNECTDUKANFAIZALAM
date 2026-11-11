# DPR generator: audit and corrections (November 2026)

This document covers the DPR generator under `src/lib/project-reports/`, the
admin form `src/components/admin/project-report-form.tsx` and the PDF
`src/lib/project-reports/pdf.ts`. It records what was wrong, why, and what
was changed. The regression case is **DIGI-DPR-00003 "Leaf Beverages"**: a
packaged drinking water unit under MYSY on rented premises, saved from the
quick form. It is checked into the repository as
`src/lib/project-reports/fixtures/leaf-beverages.ts`, with the promoter's
personal details replaced.

The generator produces projections for a bank file. It is **not a CA
certification**, and no report it produces is bank-approved by virtue of
being generated.

## 1. How the system is put together (before the change)

| Part | File | What it does |
| --- | --- | --- |
| Input model | `engine.ts` (`DprInput`) | Saved as JSON in `project_reports.input` (Supabase). Its summary columns are `project_cost` and `bank_loan`. |
| Validation | `schema.ts` (zod) | Checks every save on the API. |
| Defaults / templates | `defaults.ts`, `templates.ts`, `activities.ts` | 62 trades, each scaled to the project cost typed. |
| Scheme rules | `balance-sheets/schemes.ts`, `project-reports/eligibility.ts` | Own contribution, subsidy, limits, age and sector rules. |
| Calculation | `engine.ts` (`buildDpr`) | Cost, means, working capital, operations, repayment, depreciation, P&L, balance sheet, cash flow, DSCR, BEP. |
| Narrative | `defaults.ts` (`draftNarrative`) | Written sections, built from the figures and the template. |
| PDF | `pdf.ts` (pdfkit) | About 20 A4 pages, in lakhs. |
| Storage / API | `store.ts`, `app/api/admin/project-reports/**` | CRUD, final-status gate and PDF route; admin only. |
| Form | `components/admin/project-report-form.tsx` | Quick DPR card, detailed sections, live summary. |

## 2. Issues found

Severity: **H** gives a wrong figure in a bank file; **M** is misleading or
incomplete; **L** is presentation only.

| # | Sev | Issue | Root cause | Correction |
| --- | --- | --- | --- | --- |
| 1 | H | **Cash was a plug.** Balance-sheet cash was set to `liabilities − other assets`, so the sheet "balanced" whatever the model did. The cash flow then reproduced the same plug. | `buildDpr` computed `cash = liabilitiesExCash − assetsExCash`. | Cash now comes from the cash-flow statement: opening cash plus operating, investing and financing flows. The balance sheet is then checked independently (`checks.balanceSheet`). A difference above Re 1 blocks *Final* and is reported as an error. |
| 2 | H | **Income tax was always 0** (`taxPct: 0` default). | A flat tax % field defaulted to zero. | Tax is computed by constitution and regime. Individuals (proprietorship) use the new-regime slabs (FY 2025-26 rates), §87A rebate and 4% cess; the old regime can be selected. A firm or LLP pays 30%; a company pays 22% (§115BAA) plus 10% surcharge. Cess of 4% applies throughout. Losses are carried forward. Taxable profit is shown separately from book profit, using Income-tax WDV depreciation. A manual % is still allowed. |
| 3 | H | **Rent missing on rented premises.** Leaf Beverages is rented and had no rent line. | Templates carried no rent line, and the engine never checked for one. | A cost-completeness check warns about rent (rented/leased), insurance, repairs, marketing, communication/admin and professional/compliance fees. *Fill estimates* adds clearly marked estimates. The PDF lists every estimate and every data gap in an "Assumptions to be confirmed" annexure. |
| 4 | H | **Raw material not linked to production.** Leaf Beverages: 26,123 cases × 12 = 313,476 bottles, but 523,000 preforms and 611,000 labels; pouch film was about half of what 1.1 million pouches need. | Quantities for raw material and for products came from separate sales shares. | Raw material can now be linked to a product with a *per-unit consumption*: quantity = production × per-unit × (1 + process loss). The packaged water template uses a real BOM. The PDF prints a production → saleable quantity → sales reconciliation. |
| 5 | H | **100% of production assumed sold.** | No wastage or rejection inputs existed. | Each product has a *process loss %* and a *rejection / return %*. Saleable quantity = production × (1 − loss) × (1 − rejection), and sales = saleable quantity × price. |
| 6 | H | **Subsidy never adjusted.** The MYSY margin money (Rs. 5.00 lakh) sat in "reserve" and "held by bank" for all five years, and the loan was repaid as if the subsidy did not exist. | No lock-in or adjustment logic. | The scheme catalog carries `lockInYears`, `interestFreeOnSubsidy` and `adjustment`. During lock-in the subsidy sits in a TDR (non-current, restricted). At the end of lock-in it is adjusted against the term loan, and the remaining instalments are recomputed. For PMEGP, no interest is charged on the loan equal to the TDR. The subsidy is never shown as cash available to the project. |
| 7 | H | **Average DSCR was a simple mean of yearly ratios** (2.58 for Leaf). Banks use total cash available ÷ total debt service over the repayment period (2.56 for Leaf). | `averageDscr = mean(dscr)`. | Average DSCR is now `Σ(PAT + dep + write-off + TL interest) ÷ Σ(TL interest + scheduled principal)` over repayment years. The method is printed beside the ratio. The subsidy adjustment is excluded from debt service, since it is not paid out of cash accruals. |
| 8 | H | **Current ratio inflated** (Leaf: 3.3 rising to 18.5). It ignored current maturities of the term loan and counted all cash. | `CA = stock + debtors + cash`, `CL = creditors + CC`. | CL now includes term-loan instalments due within 12 months (as in CMA Form IV) and provisions for tax. Restricted TDR is excluded from CA. The formula is printed. |
| 9 | M | **Repayment schedule options.** Only equal monthly principal was supported, and the monthly and yearly schedules were computed separately. | Two independent loops. | One monthly schedule now drives everything. It supports EMI or equal principal, monthly or quarterly repayment, an interest-only moratorium, and the subsidy adjustment. Yearly figures are sums of the monthly rows. Tests require the balance to reach exactly 0 at the end of the tenure. |
| 10 | M | **Depreciation basis not stated and WDV only.** | Single default rate table. | WDV (Income-tax Act rates) and SLM (Companies Act 2013 Schedule II useful lives, 5% residual) are both available. The default is WDV for proprietorships and firms and SLM for companies. The basis is printed. Tax depreciation always uses IT-Act WDV rates for the taxable profit. |
| 11 | M | **Project cost heads missing.** There were no heads for transport and installation, licences and registration, security deposits or contingency. | `ASSET_KINDS` was limited. | New heads: *installation* (capitalised with plant), *licences* (written off with preliminary), *deposit* (non-depreciable) and a *contingency %* on fixed capital. Total = sum of heads; tests check this. |
| 12 | M | **Working capital omitted WIP and minimum cash.** | Only RM, FG, debtors and creditors were used. | Added *WIP days* and *minimum cash days* (cash operating expenses). The PDF shows each line with its holding period and basis. |
| 13 | M | **Statutory employment costs ignored.** | Salary × count × 12 only. | Employer EPF 12% (applies at 20+ employees) and ESI 3.25% (10+ employees) are added automatically, or as an entered %. The PDF shows employee-wise annual cost and escalation. |
| 14 | M | **Break-even classification undisclosed.** Direct wages were treated as fixed without saying so. | Implicit in code. | The PDF prints a classification table (variable: raw material, variable expenses; fixed: wages, salaries, fixed overheads, depreciation, write-offs, interest). BEP and cash BEP are computed from it. |
| 15 | M | **Machinery quotations unsupported.** | No supplier fields existed. | Each item has *supplier* and *quotation ref.* fields. Empty ones print as "Quotation pending", and the gap is listed in the assumptions annexure. |
| 16 | M | **Blank promoter qualification and experience passed silently.** | No check existed. | They now produce warnings and appear in the assumptions annexure. Scheme education rules are checked against the qualification. |
| 17 | M | **MYSY sector mismatch.** The flour-mill record DIGI-DPR-00002 is saved as *service* with manufacturing activity. | The quick card set the sector from the template, but the detailed form allowed a different sector. | Eligibility check: the sector must match the template's sector. A warning shows otherwise. |
| 18 | M | **Scheme rules hard-coded, with no version or verification status.** | Constants inside `schemeTerms`. | `scheme-catalog.ts` gives each scheme a version, effective date, last-verified date, sources, and a per-rule status (*verified* / *verification required*). The PDF prints the status, and unverified rules say so. PMFME was added. |
| 19 | M | **Packaged water compliance was out of date.** BIS certification was listed as mandatory. | Template text predated the 17 Oct 2024 FSSAI change and the testing scheme effective 1 Jan 2026. | `compliance.ts` lists mandatory, conditional and recommended approvals per industry. For packaged water: FSSAI central licence, the FSSAI Scheme of Testing from 1 Jan 2026 (NABL / FSSAI-notified labs), groundwater NOC, PCB consent and Legal Metrology labelling. BIS is *voluntary* nationally, and a reported UP state requirement is marked *verification required*. |
| 20 | L | **Rounding.** Lakh tables could disagree with their totals by 0.01. | Each cell was rounded on its own. | Additive tables (cost, means, balance sheet) are footed: components are rounded so they add up to the rounded total, and the PDF states this. |
| 21 | L | **Contradictions.** The "Basis of projections" annexure said "income tax 0%" while taxes were due. Cost and means were repeated twice. | Static text. | The annexure is generated from the actual parameters, and the duplicate summary table was removed. |
| 22 | L | **No guard against NaN or Infinity.** | Divisions without guards. | Every ratio returns `null` when its denominator is 0. Tests scan the whole report for non-finite numbers. |

## 3. Corrections not made, and limitations

* **Tax** covers the main cases only: new and old regime slabs for individuals, the firm/LLP rate and company §115BAA. It does not cover surcharge for individuals, MAT/AMT, presumptive taxation (§44AD), or other income and deductions of the promoter. A *manual %* override exists for those cases.
* **Scheme figures** come from scheme guidelines and bank pages checked in November 2026. Where an official source could not be read, the rule is marked *verification required*: MYSY lock-in, CM-YUVA category-wise contribution, and PMFME status after 2025-26. The implementing agency and the bank have the final word.
* **CC limit** is assumed fully drawn from year 1, and the term loan fully disbursed at the start of year 1. Both assumptions are stated in the report.
* **GST** is treated as a pass-through and left out of sales and costs.
* **The guided workflow** is a navigator over the existing form sections, not a separate multi-page wizard. Drafts already save at any stage.

## 4. What changed in the code

| Area | Files |
| --- | --- |
| Engine (single source of truth, checks, tax, loan, depreciation, subsidy, ratios) | `src/lib/project-reports/engine.ts` |
| Pure "may this be final?" gate | `src/lib/project-reports/validation.ts`, used by `store.ts` |
| Marked estimates for missing running costs | `src/lib/project-reports/estimates.ts` |
| Versioned scheme catalog (PMEGP, MYSY, CM-YUVA, PMFME, Mudra) | `src/lib/project-reports/scheme-catalog.ts`; money terms in `src/lib/balance-sheets/schemes.ts` (PMFME and lock-in added) |
| Industry compliance (mandatory / conditional / recommended) | `src/lib/project-reports/compliance.ts` |
| Packaged water bill of materials linked to production | `src/lib/project-reports/activities.ts` |
| New inputs, defaults, validation | `defaults.ts`, `schema.ts`, `field-guide.ts` |
| Form: new inputs, 18-step navigator, estimate button, final review | `src/components/admin/project-report-form.tsx` |
| PDF: 28 sections with validation box, compliance, reconciliation tables and annexures | `src/lib/project-reports/pdf.ts` |
| Tests: 17 scenarios, tax, Leaf regression | `engine.scenarios.test.ts` (plus the updated `engine`, `templates` and `pdf` tests) |

No database change was needed. New fields live inside the stored `input`
JSON and are filled from defaults when an older report is opened, so older
reports are recalculated under the corrected rules on the next view or PDF
download. In particular they now include income tax, minimum cash in working
capital, statutory employment costs and the subsidy lock-in.

## 5. Leaf Beverages: old against new

The report was regenerated from the saved inputs, with the two corrections
an admin makes in the form:

* **Missing kharche estimate se bharein.** This added rent (Rs. 7,000 / month),
  insurance and professional fees, all marked *estimate*.
* **Raw material linked to production.** The packaged-water bill of materials
  is preforms per case, caps per jar and film per pouch bag.

Machinery, prices, capacity, staff and loan terms are exactly as saved.

| Item | Old DPR | New DPR |
|---|---|---|
| Project cost (lakh) | 20.00 | 20.40 |
| Working capital (lakh) | 1.48 | 1.89 |
| Term loan / CC (lakh) | 16.67 / 1.33 | 16.67 / 1.70 |
| Subsidy treatment | Rs. 5.00 lakh kept in reserve and deposit for all 5 years | Rs. 5.10 lakh in TDR, adjusted against the loan at month 24 (MYSY; verification required) |
| Year 1 raw material (lakh) | 9.54 | 8.20 |
| Year 1 PBT (lakh) | 2.96 | 3.32 |
| Year 1 tax (lakh) | 0.00 | 0.00 |
| Year 1 current ratio | 3.3 | 1.12 |
| Year 3 raw material (lakh) | 12.72 | 10.93 |
| Year 3 PBT (lakh) | 8.96 | 9.89 |
| Year 3 tax (lakh) | 0.00 | 0.00 |
| Year 3 current ratio | 9.55 | 5.15 |
| Year 5 raw material (lakh) | 14.30 | 12.30 |
| Year 5 PBT (lakh) | 11.62 | 12.28 |
| Year 5 tax (lakh) | 0.00 | 0.29 |
| Year 5 current ratio | 18.51 | 19.86 |
| Average DSCR | 2.58 (simple mean) | 3.65 (total of numerators / total of denominators) |
| Minimum DSCR | 1.91 | 1.97 |
| Break-even % capacity | 49.48 | 48.78 |
Why the figures moved:

* **Raw material.** It now follows production (Rs. 8.20 lakh in year 1)
  instead of an unrelated annual guess (Rs. 9.54 lakh).
* **Costs added.** Rent, insurance and professional fees are now charged.
* **Working capital.** It now includes 7 days' minimum cash.
* **Year 5 tax.** It appears because taxable income crosses the Rs. 12 lakh
  §87A rebate limit.
* **Average DSCR.** It is higher because the bank method is used, and
  because the subsidy is adjusted against the loan after two years, which
  lowers later instalments.
* **Current ratio.** Year 1 falls to a realistic 1.12 because current
  maturities of the term loan are now counted. The high ratios in later years
  reflect cash building up because no drawings were entered — the report
  says this rather than hiding it.

## 6. Reconciliation status

Every report now carries five checks. Each is printed on the executive
summary page and in the form's final review:

1. Project cost equals the sum of its heads.
2. Means of finance equal the project cost.
3. The term loan schedule rolls forward month by month and closes at nil
   within the tenure.
4. The balance sheet balances every year, with cash taken from the cash flow.
5. Opening cash plus net cash flow equals closing cash, which equals
   balance-sheet cash.

A failed check blocks *Final*. The scenario suite checks all five
independently for manufacturing, trading, service, food, packaged water,
rented and owned premises, loans with and without moratorium, EMI and
quarterly repayment, working capital finance, subsidy and no-subsidy cases,
loss-making projects, incomplete input, zero sales, multiple products, and
the different tax regimes and constitutions. It also requires that no value
anywhere in the report is NaN, Infinity or undefined.
