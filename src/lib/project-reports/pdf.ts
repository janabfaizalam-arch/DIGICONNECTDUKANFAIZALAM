import "server-only";

import PDFDocument from "pdfkit";

import { CONSTITUTIONS } from "@/lib/balance-sheets/engine";

import { buildDpr, type DprInput, type DprReport, type YearRow } from "./engine";
import type { ProjectReportRecord } from "./store";

/*
 * Bank DPR in the plain format branch managers and CAs exchange every day:
 * one statement per page, Times, black ink, figures in Rs. lakh.
 *
 *   1  Project at a Glance (17 points)
 *   2  Cost of Project, Means of Finance
 *   3  Term Loan Repayment Schedule, Depreciation
 *   4  Estimated Salary
 *   5  Cost of Production and Profitability Statements (trading account, year-wise)
 *   6  Profitability
 *   7  Projected Balance Sheet
 *   8  Cash Flow Statement
 *   9  Current Ratio
 *  10  Debt Service Coverage Ratio
 *
 * Every figure comes from the engine, so the statements tie to each other
 * exactly as the engine's checks prove.
 */

const M = 50;
const SERIF = "Times-Roman";
const SERIF_BOLD = "Times-Bold";
const INK = "#000000";

type Doc = PDFKit.PDFDocument;
type Align = "left" | "right" | "center";
type Col = { w: number; align?: Align };
type Line = { cells: string[]; bold?: boolean; rule?: boolean; gap?: number };

const INR = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** Rupees shown in lakh with two decimals; nil as "-", negatives in brackets. */
const L = (value: number) => {
  const v = Math.round((value / 100000) * 100) / 100;
  if (Math.abs(v) < 0.005) return "-";
  return v < 0 ? `(${INR.format(-v)})` : INR.format(v);
};
const Rs = (value: number) => (value < 0 ? `(${INR.format(-value)})` : INR.format(value));
const ratio = (value: number | null) => (value === null || !Number.isFinite(value) ? "-" : value.toFixed(2));
const roman = (n: number) => ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"][n] ?? String(n + 1);
const ordinal = (n: number) => `${n + 1}${n === 0 ? "st" : n === 1 ? "nd" : n === 2 ? "rd" : "th"} Year`;
const upper = (v: string) => v.toUpperCase();

function buffer(doc: Doc) {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}

const width = (doc: Doc) => doc.page.width - M * 2;
const bottom = (doc: Doc) => doc.page.height - M;

/* ── Drawing helpers ───────────────────────────────────────────────────── */

function heading(doc: Doc, text: string, align: Align = "center") {
  doc.font(SERIF_BOLD).fontSize(12).fillColor(INK).text(text, M, doc.y, { width: width(doc), align, underline: true });
  doc.moveDown(0.9);
}

function unit(doc: Doc, text = "(Rs. In Lacs)") {
  doc.font(SERIF).fontSize(9.5).fillColor(INK).text(text, M, doc.y, { width: width(doc), align: "right" });
  doc.moveDown(0.5);
}

/** A ruled grid. Column widths are shares of the page width. */
function grid(doc: Doc, cols: Col[], lines: Line[], opts: { size?: number; head?: Line } = {}) {
  const size = opts.size ?? 10;
  const total = cols.reduce((s, c) => s + c.w, 0);
  const w = width(doc);
  const xs: number[] = [];
  let x = M;
  for (const c of cols) {
    xs.push(x);
    x += (c.w / total) * w;
  }
  const colW = cols.map((c) => (c.w / total) * w);
  const draw = (line: Line, isHead = false) => {
    doc.font(line.bold || isHead ? SERIF_BOLD : SERIF).fontSize(size);
    const h = Math.max(...line.cells.map((cell, i) => doc.heightOfString(cell || " ", { width: colW[i] - 6 })));
    if (doc.y + h + 8 > bottom(doc)) {
      doc.addPage();
      if (opts.head && !isHead) draw(opts.head, true);
    }
    const y = doc.y + (line.gap ?? 0);
    if (line.rule) doc.moveTo(M, y - 2).lineTo(M + w, y - 2).lineWidth(0.6).strokeColor(INK).stroke();
    line.cells.forEach((cell, i) => {
      doc.font(line.bold || isHead ? SERIF_BOLD : SERIF).fontSize(size).fillColor(INK).text(cell, xs[i] + 3, y, { width: colW[i] - 6, align: cols[i].align ?? "left", underline: isHead });
    });
    doc.y = y + h + size * 0.55;
    if (line.rule && line.bold) {
      doc.moveTo(M, doc.y - size * 0.3).lineTo(M + w, doc.y - size * 0.3).lineWidth(0.6).strokeColor(INK).stroke();
      doc.y += 2;
    }
  };
  if (opts.head) draw(opts.head, true);
  for (const line of lines) draw(line);
  doc.x = M;
}

function yearCols(report: DprReport, label: number, extra: Col[] = []): Col[] {
  return [{ w: label }, ...extra, ...report.years.map(() => ({ w: 10, align: "right" as Align }))];
}
const yearLine = (label: string, values: number[], extra: Partial<Line> = {}, fmt: (v: number) => string = L): Line => ({ cells: [label, ...values.map(fmt)], ...extra });

/* ── Shared figures ────────────────────────────────────────────────────── */

const POWER = /power|electric|electricity|bijli|fuel|diesel|petrol|gas|lpg|coal|energy/i;

type Trading = { opening: number; purchases: number; sales: number; closing: number; grossProfit: number };

function figures(input: DprInput, report: DprReport) {
  const years = report.years;
  // Trading account per year: stock is all inventory (raw material, WIP and
  // finished goods); purchases are raw material bought.
  const trading: Trading[] = years.map((y, i) => {
    const prev = i > 0 ? years[i - 1] : null;
    const opening = prev?.stock ?? 0;
    const purchases = y.rawMaterial + y.rawMaterialStock - (prev?.rawMaterialStock ?? 0);
    const grossProfit = y.sales + y.stock - opening - purchases;
    return { opening, purchases, sales: y.sales, closing: y.stock, grossProfit };
  });
  // Electricity and fuel are the power-like overhead heads; everything else is
  // administration and selling. The split follows the inputs' own weights.
  const split = years.map((y) => {
    const util = y.utilisationPct / 100;
    const weight = (o: DprInput["overheads"][number]) => (o.monthly || 0) * (o.variable ? util : 1);
    const all = input.overheads.reduce((s, o) => s + weight(o), 0);
    const power = input.overheads.filter((o) => POWER.test(o.name)).reduce((s, o) => s + weight(o), 0);
    const overheads = y.directOverheads + y.indirectOverheads;
    const electricity = all > 0 ? Math.round((overheads * power) / all) : 0;
    return { electricity, admin: overheads - electricity };
  });
  const salary = years.map((y) => y.directWages + y.indirectSalaries);
  const writeOff = years.map((y) => y.depreciation + y.preliminaryWrittenOff);
  return { trading, split, salary, writeOff };
}

/* ── 1. Project at a glance ────────────────────────────────────────────── */

function glance(doc: Doc, input: DprInput, report: DprReport) {
  heading(doc, "PROJECT AT A GLANCE");
  const lead = input.promoters.find((p) => p.name.trim());
  const place = [input.address, input.district, input.state].filter((v) => v.trim()).join(", ") + (input.pincode ? ` ${input.pincode}` : "");
  const phone = input.promoters.map((p) => p.mobile).find((m) => m.trim());
  const constitution = CONSTITUTIONS.find((c) => c.value === input.constitution)?.label ?? "-";
  const products = input.products.map((p) => p.name.trim()).filter(Boolean).join(", ") || input.activity;
  const materials = input.rawMaterials.map((m) => m.name.trim()).filter(Boolean);
  const m = report.means;
  const schemeShort = input.scheme === "none" ? "BANK FINANCE" : upper(input.scheme === "cmyuva" ? "CM-YUVA" : input.scheme === "other" ? (report.scheme?.label ?? "OTHER") : input.scheme);
  const subsidyPct = report.cost.total > 0 ? (m.subsidy / report.cost.total) * 100 : 0;
  const capital: string[] = [`Term Loan :  ${L(m.termLoan)} LACS`];
  if (m.ccLimit > 0) capital.push(`Working Capital Loan :  ${L(m.ccLimit)} LACS`);
  if (m.otherFunding > 0) capital.push(`Unsecured Loan :  ${L(m.otherFunding)} LACS`);
  capital.push(`Promoter's Capital :  ${L(m.ownContribution)} LACS`);

  const items: [string, string][] = [
    ["Name of the Concern", [upper(input.businessName), lead && lead.fatherName.trim() && lead.name.trim().toUpperCase() === input.businessName.trim().toUpperCase() ? `S/O ${upper(lead.fatherName)}` : "", upper(lead?.address.trim() || place)].filter(Boolean).join("\n")],
    ["Constitution", upper(constitution)],
    ["Year of Establishment/Incorporation", String(input.startFy)],
    ["Unit location", upper(place || "-")],
    ["Registered Office/Postal Address\nwith Phone Nos.", [upper(lead?.address.trim() || place || "-"), phone ? `PH. ${phone}` : ""].filter(Boolean).join("\n")],
    ["Promoter's Name", lead ? upper(`${lead.name}${lead.fatherName.trim() ? ` S/O ${lead.fatherName}` : ""}`) : "-"],
    ["Product(s)", upper(products || "-")],
    ["Unit Name", upper(input.businessName)],
    ["Total Project Cost", `${L(report.cost.total)} LACS`],
    ["Capital Composition", capital.join("\n")],
    ["Technical Know-how", "AS PER NEW TECHNOLOGY"],
    ["Major Raw Materials", materials.length ? upper(materials.slice(0, 6).join(", ")) : "AS PER DETAILS"],
    ["Promoter's Contribution to\nTotal Project cost", `${Math.round(m.ownContributionPct * 100) / 100}%`],
    ["Project", schemeShort],
    ["D.S.C.R.", ratio(report.averageDscr)],
    [`Govt. Subsidy On Project${input.scheme === "none" ? "" : `    ${schemeShort}`}`, m.subsidy > 0 ? `${L(m.subsidy)} LACS (${Math.round(subsidyPct * 100) / 100}% on total Project Cost)` : "NOT APPLICABLE"],
    ["Government Subsidy", m.subsidy > 0 ? `As per term loan annexure${m.subsidyLockInYears ? ` (adjusted against term loan after lock-in of ${m.subsidyLockInYears} years)` : ""}` : "NOT APPLICABLE"],
  ];
  items.forEach(([label, value], i) => {
    const y = doc.y;
    doc.font(SERIF).fontSize(10.5).fillColor(INK).text(`${i + 1}.  ${label}`, M, y, { width: 200 });
    const labelEnd = doc.y;
    const bold = i === 0 || i === 5;
    doc.font(SERIF).text(":", M + 205, y, { width: 10 });
    doc.font(bold ? SERIF_BOLD : SERIF).text(value, M + 220, y, { width: width(doc) - 220 });
    doc.y = Math.max(doc.y, labelEnd) + 9;
  });
}

/* ── 2. Cost of project, means of finance ──────────────────────────────── */

function costAndMeans(doc: Doc, input: DprInput, report: DprReport) {
  heading(doc, "COST OF PROJECT");
  unit(doc);
  const cols: Col[] = [{ w: 12 }, { w: 58 }, { w: 30, align: "right" }];
  const lines: Line[] = [];
  const landBuilding = report.cost.lines.filter((l) => l.kind === "land" || l.kind === "building");
  const others = report.cost.lines.filter((l) => l.kind !== "land" && l.kind !== "building");
  let no = 1;
  const premises = input.premises === "owned" ? "OWN" : input.premises === "rented" ? "RENTED" : "LEASED";
  if (landBuilding.length) {
    lines.push({ cells: [`${no++}-`, "Land/Building", ""] });
    for (const l of landBuilding) lines.push({ cells: ["", l.label, L(l.amount)] });
  } else {
    lines.push({ cells: [`${no++}-`, "Land/Building\nBuilding", premises] });
  }
  for (const l of others) {
    const label = l.kind === "machinery" ? "Machinery\nPlant And Machinery" : l.label;
    lines.push({ cells: [`${no++}-`, label, L(l.amount)], gap: 6 });
  }
  lines.push({ cells: [`${no++}-`, "Working Capital", L(report.cost.workingCapital)], gap: 6 });
  lines.push({ cells: ["", "TOTAL", L(report.cost.total)], bold: true, rule: true, gap: 6 });
  grid(doc, cols, lines, { size: 10.5, head: { cells: ["SR. NO.", "ITEM", "AMOUNT"] } });
  if (report.cost.landOutside > 0) {
    doc.font(SERIF).fontSize(9).text(`Note: Land/premises of Rs. ${L(report.cost.landOutside)} lacs is the promoter's own and is not included in the cost of project.`, M, doc.y, { width: width(doc) });
  }

  doc.moveDown(2.5);
  heading(doc, "MEANS OF FINANCE");
  unit(doc);
  const m = report.means;
  const means: Line[] = [{ cells: ["1-", "Proprietor's/ Contribution", L(m.ownContribution)] }];
  let k = 2;
  if (m.otherFunding > 0) means.push({ cells: [`${k++}-`, "Unsecured Loans", L(m.otherFunding)], gap: 6 });
  means.push({ cells: [`${k++}-`, "Bank Loans", ""], gap: 6 });
  means.push({ cells: ["", "      Term Loan", L(m.termLoan)] });
  if (m.ccLimit > 0) means.push({ cells: ["", "      Working Capital Loan", L(m.ccLimit)] });
  means.push({ cells: ["", "TOTAL", L(m.total)], bold: true, rule: true, gap: 6 });
  grid(doc, cols, means, { size: 10.5, head: { cells: ["Sr.No.", "PARTICULARS", "AMOUNT"] } });
}

/* ── 3. Repayment, depreciation ────────────────────────────────────────── */

function repaymentAndDepreciation(doc: Doc, input: DprInput, report: DprReport) {
  heading(doc, "TERM LOAN REPAYMENT SCHEDULE :-", "left");
  const rp = report.repayment;
  const adj = rp.some((r) => r.subsidyAdjusted > 0);
  const cols: Col[] = [{ w: 34 }, ...rp.map(() => ({ w: 10, align: "right" as Align }))];
  const size = rp.length > 7 ? 8.5 : 10;
  grid(
    doc,
    cols,
    [
      { cells: ["Loan Amount Outstanding", ...rp.map((r) => L(r.opening))] },
      { cells: [`Interest @ ${input.termLoanInterestPct}% p.a.`, ...rp.map((r) => L(r.interest))] },
      { cells: ["Total", ...rp.map((r) => L(r.opening + r.interest))], rule: true },
      { cells: ["Less: Repayment", ...rp.map((r) => L(r.principal + r.interest))] },
      ...(adj ? [{ cells: ["Less: Subsidy adjusted", ...rp.map((r) => L(r.subsidyAdjusted))] }] : []),
      { cells: ["Balance", ...rp.map((r) => L(r.closing))], bold: true, rule: true },
    ],
    { size, head: { cells: ["YEAR>>>>>>>>>>>>>>>>", ...rp.map((_, i) => roman(i))] } },
  );
  doc.font(SERIF).fontSize(9).text(
    `Repayable in ${input.tenureYears} years${input.moratoriumMonths ? ` including a moratorium of ${input.moratoriumMonths} months` : ""}, ${input.repaymentMethod === "emi" ? "by equated instalments (EMI)" : "in equal instalments of principal with interest on the reducing balance"}.`,
    M,
    doc.y + 2,
    { width: width(doc) },
  );

  doc.moveDown(2);
  heading(doc, "CALCULATION OF DEPRECIATION OF FIXED ASSETS", "left");
  const n = report.years.length;
  const dsize = n > 6 ? 8 : 9.5;
  grid(
    doc,
    [{ w: 6 }, { w: 22 }, { w: 7, align: "right" }, { w: 10, align: "right" }, ...report.years.map(() => ({ w: 9, align: "right" as Align }))],
    [
      ...report.depreciation.map((d, i) => ({ cells: [`${i + 1}-`, d.label, `${d.ratePct}%`, L(d.cost), ...d.perYear.map(L)] })),
      { cells: ["", "TOTAL", "", L(report.depreciation.reduce((s, d) => s + d.cost, 0)), ...report.years.map((y) => L(y.depreciation))], bold: true, rule: true },
    ],
    { size: dsize, head: { cells: ["Sr.No.", "PARTICULARS", "RATE", "COST", ...report.years.map((_, i) => roman(i))] } },
  );
  doc.font(SERIF).fontSize(9).text(`Depreciation on ${report.depreciationMethod === "SLM" ? "straight line" : "written down value"} method.`, M, doc.y + 2, { width: width(doc) });
}

/* ── 4. Salary ─────────────────────────────────────────────────────────── */

function salary(doc: Doc, input: DprInput, report: DprReport, f: ReturnType<typeof figures>) {
  heading(doc, "CALCULATION OF ESTIMATED SALARY", "left");
  const y1 = report.years[0];
  const staff = y1?.staffCost.filter((s) => s.count > 0) ?? [];
  if (!staff.length) {
    doc.font(SERIF).fontSize(10.5).text("The proprietor will run the unit personally; no salaried staff is proposed.", M, doc.y, { width: width(doc) });
    return;
  }
  const statutory = staff.reduce((s, r) => s + r.statutory, 0);
  grid(
    doc,
    [{ w: 40 }, { w: 10, align: "right" }, { w: 22, align: "right" }, { w: 28, align: "right" }],
    [
      ...staff.map((s) => ({ cells: [upper(s.role), String(s.count), Rs(s.count ? s.salary / s.count / 12 : 0), Rs(s.salary)], gap: 4 })),
      ...(statutory > 0 ? [{ cells: ["EMPLOYER'S EPF / ESI", "", "", Rs(statutory)], gap: 4 }] : []),
      { cells: ["", "", "TOTAL SALARY", Rs(staff.reduce((s, r) => s + r.total, 0))], bold: true, rule: true, gap: 6 },
    ],
    { size: 10.5, head: { cells: ["PARTICULARS", "No.", "SALARY\nper person/month", "ANNUAL"] } },
  );
  doc.moveDown(1);
  doc.font(SERIF).fontSize(10.5).text(`Assuming ${input.costGrowthPct}% of total salaries on account of increment and fringe benefits, salaries would be under :-`, M, doc.y, { width: width(doc) });
  doc.moveDown(1);
  unit(doc, "(Rs.in Lacs)");
  grid(
    doc,
    [{ w: 15 }, { w: 30, align: "center" }, { w: 25, align: "right" }, { w: 30 }],
    f.salary.map((v, i) => ({ cells: ["", roman(i), L(v), ""], gap: 4 })),
    { size: 10.5, head: { cells: ["", "YEAR", "AMOUNT", ""] } },
  );
}

/* ── 5. Trading accounts ───────────────────────────────────────────────── */

function tradingAccounts(doc: Doc, f: ReturnType<typeof figures>) {
  f.trading.forEach((t, i) => {
    const need = 120;
    if (doc.y + need > bottom(doc)) doc.addPage();
    doc.font(SERIF_BOLD).fontSize(10.5).text(`COST OF PRODUCTION AND PROFITABILITY STATEMENTS YEAR ${i + 1}`, M, doc.y, { width: width(doc), underline: true });
    doc.moveDown(0.5);
    const total = t.opening + t.purchases + Math.max(0, t.grossProfit);
    const right = t.sales + t.closing + Math.max(0, -t.grossProfit);
    grid(
      doc,
      [{ w: 25 }, { w: 25, align: "right" }, { w: 25 }, { w: 25, align: "right" }],
      [
        { cells: ["To Opening Stock", Rs(t.opening), "By Sales", Rs(t.sales)] },
        { cells: ["To Purchases", Rs(t.purchases), "By Closing Stock", Rs(t.closing)] },
        t.grossProfit >= 0 ? { cells: ["To Gross Profit", Rs(t.grossProfit), "", ""] } : { cells: ["", "", "By Gross Loss", Rs(-t.grossProfit)] },
        { cells: ["TOTAL RUPEES", Rs(total), "TOTAL RUPEES", Rs(right)], bold: true, rule: true, gap: 4 },
      ],
      { size: 9.5, head: { cells: ["PARTICULARS", "Rs. P.", "PARTICULARS", "Rs. P."] } },
    );
    doc.moveDown(1.2);
  });
}

/* ── 6. Profitability ──────────────────────────────────────────────────── */

function profitability(doc: Doc, report: DprReport, f: ReturnType<typeof figures>) {
  heading(doc, "PROFITABILITY STATEMENT", "left");
  unit(doc);
  const y = report.years;
  const pick = (fn: (r: YearRow, i: number) => number) => y.map(fn);
  const subvention = y.some((r) => r.interestSubvention > 0);
  const prelim = y.some((r) => r.preliminaryWrittenOff > 0);
  const expenses = y.map((r, i) => f.salary[i] + f.split[i].electricity + f.split[i].admin + r.termLoanInterest + r.ccInterest - r.interestSubvention + f.writeOff[i]);
  grid(
    doc,
    yearCols(report, 34),
    [
      yearLine("[A] Gross Profit", f.trading.map((t) => t.grossProfit)),
      yearLine("Total", f.trading.map((t) => t.grossProfit), { bold: true, rule: true }),
      { cells: ["[B] EXPENDITURE", ...y.map(() => "")], bold: true, gap: 6 },
      yearLine("Salary & Wages", f.salary),
      yearLine("Electricity & Fuel Exp.", f.split.map((s) => s.electricity)),
      yearLine("Admin. & Selling Exp.", f.split.map((s) => s.admin)),
      yearLine("Interest on Term Loan", pick((r) => r.termLoanInterest)),
      yearLine("Interest on W. C. Loan", pick((r) => r.ccInterest)),
      ...(subvention ? [yearLine("Less: Interest Subvention", pick((r) => -r.interestSubvention))] : []),
      yearLine(prelim ? "Depreciation & Prel. Exp. W/off" : "Depreciation", f.writeOff),
      yearLine("Total", expenses, { bold: true, rule: true }),
      yearLine("Profit Before Tax", pick((r) => r.profitBeforeTax), { gap: 8 }),
      yearLine("Less: Taxes", pick((r) => r.tax)),
      yearLine("Profit after Tax", pick((r) => r.netProfit)),
      yearLine(prelim ? "Add: Depreciation & W/off" : "Add: Depreciation", f.writeOff),
      yearLine("Cash Accruals", pick((r) => r.cashAccrual), { bold: true, rule: true }),
    ],
    { size: y.length > 6 ? 8.5 : 10, head: { cells: ["PARTICULARS", ...y.map((_, i) => roman(i))] } },
  );
}

/* ── 7. Balance sheet ──────────────────────────────────────────────────── */

function balanceSheet(doc: Doc, report: DprReport) {
  heading(doc, "PROJECTED BALANCE SHEET", "left");
  unit(doc);
  const y = report.years;
  const m = report.means;
  const opening = (i: number) => (i === 0 ? y[0].capital : y[i - 1].capital + y[i - 1].reserves);
  const pick = (fn: (r: YearRow, i: number) => number) => y.map(fn);
  const blockOpening = (i: number) => (i === 0 ? y[0].grossBlock : y[i - 1].netFixedAssets);
  const cols: Col[] = [{ w: 30 }, { w: 9, align: "right" }, ...y.map(() => ({ w: 9, align: "right" as Align }))];
  const row = (label: string, open: number | null, values: number[], extra: Partial<Line> = {}): Line => ({ cells: [label, open === null ? "" : L(open), ...values.map(L)], ...extra });
  const unsecured = m.otherFunding > 0;
  const subsidy = y.some((r) => r.subsidyReserve > 0);
  const deposit = y.some((r) => r.subsidyDeposit > 0);
  const otherCa = pick((r) => r.deposits + r.preliminaryUnamortised);
  // Opening position: the promoter's capital (including own land brought in),
  // the loans as sanctioned, and the assets they finance.
  const openCapital = y[0].capital;
  const openTotal = openCapital + m.termLoan + m.ccLimit + m.otherFunding;
  const openingOtherCa = openTotal - y[0].grossBlock;
  grid(
    doc,
    cols,
    [
      { cells: ["A.  Liabilities", "", ...y.map(() => "")], bold: true },
      row("Proprietor Contribution/Loan", openCapital, y.map((_, i) => opening(i))),
      row("Add: Profit", null, pick((r) => r.netProfit)),
      row("Less: Drawings", null, pick((r, i) => r.capital + r.reserves - opening(i) - r.netProfit).map((v) => -v)),
      row("", openCapital, pick((r) => r.capital + r.reserves), { rule: true }),
      ...(unsecured ? [row("Unsecured Loans", m.otherFunding, pick((r) => r.otherFunding), { gap: 4 })] : []),
      row("Term Loan", m.termLoan, pick((r) => r.termLoanOutstanding), { gap: 4 }),
      row("Working Capital Loan", m.ccLimit, pick((r) => r.ccLoan), { gap: 4 }),
      row("Other Current Liabilities", null, pick((r) => r.creditors)),
      ...(subsidy ? [row("Government Subsidy", null, pick((r) => r.subsidyReserve))] : []),
      row("Total Liabilities", openTotal, pick((r) => r.totalLiabilities), { bold: true, rule: true }),
      { cells: ["B.  Assets", "", ...y.map(() => "")], bold: true, gap: 10 },
      row("Gross Block", y[0].grossBlock, y.map((_, i) => blockOpening(i))),
      row(`Less: Depreciation`, null, pick((r) => r.depreciation)),
      row("Net Block", null, pick((r) => r.netFixedAssets), { rule: true }),
      { cells: ["Current Assets", "", ...y.map(() => "")], bold: true, gap: 6 },
      row("Other Current Assets", openingOtherCa, otherCa),
      row("Cash & Bank Balance", null, pick((r) => r.cash)),
      row("Stock", null, pick((r) => r.stock)),
      row("Sundry Debtors", null, pick((r) => r.debtorsBalance)),
      ...(deposit || subsidy ? [row("Government Subsidy (TDR)", null, pick((r) => r.subsidyDeposit))] : []),
      row("Total Assets", openTotal, pick((r) => r.totalAssets), { bold: true, rule: true }),
    ],
    { size: y.length > 6 ? 8.5 : 9.8, head: { cells: ["YEAR>>>>>>>>>>>>", "Opening", ...y.map((_, i) => roman(i))] } },
  );
  if (subsidy) {
    doc.font(SERIF).fontSize(9).text("Government subsidy is held by the bank in a term deposit (TDR) and adjusted against the term loan after the lock-in period.", M, doc.y + 2, { width: width(doc) });
  }
}

/* ── 8. Cash flow ──────────────────────────────────────────────────────── */

function cashFlow(doc: Doc, report: DprReport) {
  heading(doc, "CASH FLOW STATEMENT", "left");
  unit(doc, "( Rs. in lakhs )");
  const c = report.cashFlow;
  const pick = (fn: (r: DprReport["cashFlow"][number]) => number) => c.map(fn);
  const released = c.some((r) => r.subsidyReleased > 0);
  const adjusted = c.some((r) => r.subsidyAdjustedAgainstLoan !== 0);
  const inflow = c.map((r) => r.openingCash + r.netProfit + r.depreciation + r.changeInCreditors + r.subsidyReleased);
  const currentAssets = c.map((r) => -(r.changeInInventory + r.changeInDebtors));
  const outflow = c.map((r, i) => -r.principalRepaid - r.subsidyAdjustedAgainstLoan - r.drawings + currentAssets[i]);
  grid(
    doc,
    [{ w: 34 }, ...c.map(() => ({ w: 10, align: "right" as Align }))],
    [
      { cells: ["A. SOURCES OF FUNDS", ...c.map(() => "")], bold: true },
      yearLine("Opening Cash & Bank Balance", pick((r) => r.openingCash)),
      yearLine("1. Net Profit as per profit & loss a/c", pick((r) => r.netProfit)),
      yearLine("2. Depreciation", pick((r) => r.depreciation)),
      yearLine("3. Increase in Current Liabilities", pick((r) => r.changeInCreditors)),
      ...(released ? [yearLine("4. Subsidy released from TDR", pick((r) => r.subsidyReleased))] : []),
      yearLine("Total In flow", inflow, { bold: true, rule: true }),
      { cells: ["B. USES OF FUNDS", ...c.map(() => "")], bold: true, gap: 10 },
      yearLine("Working Capital Repayment", c.map(() => 0)),
      yearLine("Term Loan Repayment", pick((r) => -r.principalRepaid)),
      ...(adjusted ? [yearLine("Subsidy adjusted against Term Loan", pick((r) => -r.subsidyAdjustedAgainstLoan))] : []),
      yearLine("Drawing", pick((r) => -r.drawings)),
      yearLine("Increase in current assets", currentAssets),
      yearLine("Total Out Flow", outflow, { bold: true, rule: true }),
      yearLine("Cash & Bank Balance", pick((r) => r.closingCash), { bold: true, gap: 6 }),
    ],
    { size: c.length > 6 ? 8.5 : 10, head: { cells: ["OPERATING YEAR", ...c.map((_, i) => ordinal(i))] } },
  );
}

/* ── 9. Current ratio ──────────────────────────────────────────────────── */

function currentRatio(doc: Doc, report: DprReport) {
  heading(doc, "CALCULATION OF CURRENT RATIO", "left");
  unit(doc);
  const y = report.years;
  const ratios = y.map((r) => r.currentRatio).filter((v): v is number => v !== null && Number.isFinite(v));
  const average = ratios.length ? ratios.reduce((s, v) => s + v, 0) / ratios.length : null;
  grid(
    doc,
    yearCols(report, 34),
    [
      yearLine("TOTAL CURRENT ASSETS", y.map((r) => r.currentAssets), { gap: 4 }),
      yearLine("TOTAL CURRENT LIABILITIES", y.map((r) => r.currentLiabilities), { gap: 4 }),
      { cells: ["CURRENT RATIO", ...y.map((r) => ratio(r.currentRatio))], bold: true, rule: true, gap: 4 },
      { cells: ["Average CURRENT RATIO", ratio(average), ...y.slice(1).map(() => "")], bold: true, gap: 10 },
    ],
    { size: 10, head: { cells: ["", ...y.map((_, i) => roman(i))] } },
  );
  doc.font(SERIF).fontSize(9).text("Current liabilities include creditors, the working capital loan and term loan instalments due within the next year.", M, doc.y + 4, { width: width(doc) });
}

/* ── 10. DSCR ──────────────────────────────────────────────────────────── */

function dscr(doc: Doc, report: DprReport) {
  heading(doc, "CALCULATION OF DEBT SERVICE COVERAGE RATIO");
  unit(doc);
  const y = report.years;
  // Interest counted is the term loan interest net of any subvention share,
  // exactly as the engine's DSCR.
  const interest = y.map((r) => {
    const all = r.termLoanInterest + r.ccInterest;
    const share = all > 0 ? r.interestSubvention / all : 0;
    return r.termLoanInterest * (1 - share);
  });
  const available = y.map((r, i) => r.cashAccrual + interest[i]);
  const service = y.map((r, i) => interest[i] + r.principalRepaid);
  grid(
    doc,
    yearCols(report, 34),
    [
      yearLine("Cash Accruals", y.map((r) => r.cashAccrual), { gap: 4 }),
      yearLine("Bank Interest", interest, { gap: 4 }),
      yearLine("A. Total pre interest Accruals", available, { bold: true, gap: 4 }),
      yearLine("Loan Repayment", y.map((r) => r.principalRepaid), { gap: 4 }),
      yearLine("B. Total Debt Servicing", service, { bold: true, gap: 4 }),
      { cells: ["C. Debt Service Coverage Ratio", ...y.map((r) => ratio(r.dscr))], bold: true, rule: true, gap: 4 },
    ],
    { size: y.length > 6 ? 8.5 : 10, head: { cells: ["YEAR ENDING", ...y.map((_, i) => ordinal(i))] } },
  );
  doc.moveDown(1.5);
  doc.font(SERIF_BOLD).fontSize(11).text(`Average Debt Service Coverage Ratio   =   ${ratio(report.averageDscr)}`, M, doc.y, { width: width(doc), align: "center" });
  doc.font(SERIF).fontSize(9).text("Average DSCR = total of A over total of B for the repayment years.", M, doc.y + 6, { width: width(doc), align: "center" });
}

/* ── Report ────────────────────────────────────────────────────────────── */

export async function renderProjectReportPdf(record: ProjectReportRecord) {
  const input = record.input;
  const report = buildDpr(input);
  const f = figures(input, report);
  const doc = new PDFDocument({ size: "A4", margins: { top: M, bottom: 20, left: M, right: M }, info: { Title: `Project Report — ${input.businessName}`, Author: "DigiConnect Dukan", Subject: record.reference } });

  const page = (draw: () => void, first = false) => {
    if (!first) doc.addPage();
    doc.x = M;
    doc.y = M + 10;
    draw();
  };
  page(() => glance(doc, input, report), true);
  page(() => costAndMeans(doc, input, report));
  page(() => repaymentAndDepreciation(doc, input, report));
  page(() => salary(doc, input, report, f));
  page(() => tradingAccounts(doc, f));
  page(() => profitability(doc, report, f));
  page(() => balanceSheet(doc, report));
  page(() => cashFlow(doc, report));
  page(() => currentRatio(doc, report));
  page(() => dscr(doc, report));
  return buffer(doc);
}
