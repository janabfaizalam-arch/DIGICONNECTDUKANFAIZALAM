import "server-only";

import PDFDocument from "pdfkit";

import { CONSTITUTIONS, formatAmount } from "@/lib/balance-sheets/engine";
import { SCHEME_OPTIONS } from "@/lib/balance-sheets/schemes";

import { NARRATIVE_TITLES, narrativeFor } from "./defaults";
import { assetLabel, buildDpr, itemAmount, type DprInput, type DprReport, type NarrativeKey } from "./engine";
import type { ProjectReportRecord } from "./store";

/**
 * The printed DPR, in the plain format a bank's credit officer expects:
 * Times, black on white, ruled tables, amounts in Indian grouping.
 */

const M = 48;
const FONT = "Times-Roman";
const BOLD = "Times-Bold";
const ITALIC = "Times-Italic";
const RULE = "#555555";
const SHADE = "#eeeeee";

type Doc = PDFKit.PDFDocument;
type Align = "left" | "right" | "center";
type Column = { label: string; width: number; align?: Align };

const amt = (value: number) => (value < 0 ? `(${formatAmount(-value)})` : formatAmount(value));
const lakh = (value: number) => `Rs. ${(value / 100000).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} lakh`;
const pct = (value: number | null | undefined, digits = 2) => (value === null || value === undefined ? "-" : `${value.toFixed(digits)}%`);
const ratio = (value: number | null) => (value === null ? "-" : value.toFixed(2));

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
const bottom = (doc: Doc) => doc.page.height - M - 20;

function ensure(doc: Doc, height: number) {
  if (doc.y + height > bottom(doc)) doc.addPage();
}

function heading(doc: Doc, text: string) {
  ensure(doc, 60);
  doc.moveDown(0.6);
  doc.font(BOLD).fontSize(13).fillColor("#000").text(text.toUpperCase(), M, doc.y, { width: width(doc) });
  const y = doc.y + 2;
  doc.moveTo(M, y).lineTo(M + width(doc), y).lineWidth(0.8).strokeColor(RULE).stroke();
  doc.y = y + 8;
}

function subheading(doc: Doc, text: string) {
  ensure(doc, 40);
  doc.moveDown(0.3);
  doc.font(BOLD).fontSize(11).fillColor("#000").text(text, M, doc.y, { width: width(doc) });
  doc.moveDown(0.2);
}

function para(doc: Doc, text: string) {
  for (const line of text.split(/\n+/)) {
    ensure(doc, 30);
    doc.font(FONT).fontSize(11).fillColor("#000").text(line.trim(), M, doc.y, { width: width(doc), align: "justify", lineGap: 2 });
    doc.moveDown(0.4);
  }
}

/** A ruled table. `rows` are strings; a row starting with "**" is bold and shaded. */
function table(doc: Doc, columns: Column[], rows: string[][], options: { fontSize?: number } = {}) {
  const size = options.fontSize ?? 9.5;
  const total = columns.reduce((s, c) => s + c.width, 0);
  const scale = width(doc) / total;
  const cols = columns.map((c) => ({ ...c, width: c.width * scale }));
  const pad = 4;

  const rowHeight = (cells: string[], font: string) => {
    doc.font(font).fontSize(size);
    return Math.max(...cells.map((cell, i) => doc.heightOfString(cell, { width: cols[i].width - pad * 2 }))) + pad * 2;
  };

  const drawRow = (cells: string[], font: string, shaded: boolean) => {
    const h = rowHeight(cells, font);
    if (doc.y + h > bottom(doc)) {
      doc.addPage();
      drawRow(cols.map((c) => c.label), BOLD, true);
    }
    const top = doc.y;
    if (shaded) doc.rect(M, top, width(doc), h).fill(SHADE);
    let x = M;
    cells.forEach((cell, i) => {
      doc.font(font).fontSize(size).fillColor("#000").text(cell, x + pad, top + pad, { width: cols[i].width - pad * 2, align: cols[i].align ?? "left" });
      x += cols[i].width;
    });
    doc.lineWidth(0.4).strokeColor(RULE);
    doc.rect(M, top, width(doc), h).stroke();
    x = M;
    for (const c of cols.slice(0, -1)) {
      x += c.width;
      doc.moveTo(x, top).lineTo(x, top + h).stroke();
    }
    doc.y = top + h;
  };

  ensure(doc, 40);
  drawRow(cols.map((c) => c.label), BOLD, true);
  for (const row of rows) {
    const strong = row[0]?.startsWith("**");
    drawRow(strong ? [row[0].slice(2), ...row.slice(1)] : row, strong ? BOLD : FONT, Boolean(strong));
  }
  doc.moveDown(0.6);
}

function keyValue(doc: Doc, rows: [string, string][]) {
  table(doc, [{ label: "Particulars", width: 45 }, { label: "Details", width: 55 }], rows.map(([k, v]) => [k, v || "-"]), { fontSize: 10 });
}

/** Columns for a year-wise statement: label, then one per year. */
function yearColumns(report: DprReport, first = "Particulars"): Column[] {
  return [{ label: first, width: 30 }, ...report.years.map((y) => ({ label: y.label, width: 14, align: "right" as Align }))];
}

function schemeLabel(input: DprInput) {
  if (input.scheme === "none") return "Bank finance (no government scheme)";
  return SCHEME_OPTIONS.find((s) => s.value === input.scheme)?.label ?? "Government scheme";
}

/* ─────────────────────────────────────────────────────────────────────────
   Pages
   ───────────────────────────────────────────────────────────────────────── */

function cover(doc: Doc, record: ProjectReportRecord, report: DprReport) {
  const input = record.input;
  const w = width(doc);
  doc.rect(M - 12, M - 12, w + 24, doc.page.height - (M - 12) * 2).lineWidth(1.5).strokeColor("#000").stroke();
  doc.y = 150;
  doc.font(BOLD).fontSize(26).text("DETAILED PROJECT REPORT", M, doc.y, { width: w, align: "center" });
  doc.moveDown(0.6);
  doc.font(ITALIC).fontSize(13).text("for", { width: w, align: "center" });
  doc.moveDown(0.6);
  doc.font(BOLD).fontSize(20).text(input.businessName, { width: w, align: "center" });
  doc.moveDown(0.4);
  doc.font(FONT).fontSize(13).text(input.activity || "", { width: w, align: "center" });
  doc.moveDown(2);
  doc.font(FONT).fontSize(12);
  const lines: [string, string][] = [
    ["Promoter", input.promoters.map((p) => p.name).filter(Boolean).join(", ")],
    ["Location", [input.address, input.district, input.state, input.pincode].filter(Boolean).join(", ")],
    ["Scheme", schemeLabel(input)],
    ["Cost of project", lakh(report.cost.total)],
    ["Bank loan required", `${lakh(report.means.bankLoan)}${report.mudraCategory ? ` (Mudra - ${report.mudraCategory})` : ""}`],
    ["Submitted to", [input.bankName, input.bankBranch].filter(Boolean).join(", ")],
  ];
  for (const [k, v] of lines) {
    if (!v) continue;
    doc.font(BOLD).text(`${k}: `, M + 60, doc.y, { continued: true, width: w - 120 }).font(FONT).text(v);
    doc.moveDown(0.3);
  }
  doc.font(ITALIC).fontSize(10).text(`Reference ${record.reference} · Prepared on ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`, M, doc.page.height - M - 40, { width: w, align: "center" });
}

function atAGlance(doc: Doc, input: DprInput, report: DprReport) {
  heading(doc, "Project at a Glance");
  const constitution = CONSTITUTIONS.find((c) => c.value === input.constitution)?.label ?? "-";
  const staff = input.staff.reduce((s, r) => s + (r.count || 0), 0);
  keyValue(doc, [
    ["Name of the enterprise", input.businessName],
    ["Constitution", constitution],
    ["Promoter(s)", input.promoters.map((p) => p.name).filter(Boolean).join(", ")],
    ["Activity", input.activity],
    ["Sector / Area", `${input.sector[0].toUpperCase()}${input.sector.slice(1)} / ${input.area === "rural" ? "Rural" : "Urban"}`],
    ["Location", [input.address, input.district, input.state, input.pincode].filter(Boolean).join(", ")],
    ["Premises", input.premises[0].toUpperCase() + input.premises.slice(1)],
    ["Udyam / GSTIN / PAN", [input.udyamNumber, input.gstin, input.pan].filter(Boolean).join(" / ")],
    ["Scheme", schemeLabel(input)],
    ["Cost of project", `Rs. ${amt(report.cost.total)}`],
    ["Promoter's contribution", `Rs. ${amt(report.means.ownContribution)} (${pct(report.means.ownContributionPct, 1)})`],
    ["Term loan", `Rs. ${amt(report.means.termLoan)}`],
    ["Working capital (CC) limit", `Rs. ${amt(report.means.ccLimit)}`],
    ["Margin money / subsidy", report.means.subsidy > 0 ? `Rs. ${amt(report.means.subsidy)}` : "-"],
    ["Sales in first year", `Rs. ${amt(report.years[0]?.sales ?? 0)}`],
    ["Average DSCR", ratio(report.averageDscr)],
    ["Break-even (of capacity)", pct(report.breakEven?.bepCapacityPct ?? null, 1)],
    ["Employment", staff ? `${staff} persons` : "-"],
  ]);
}

function narrativeSection(doc: Doc, text: Record<NarrativeKey, string>, key: NarrativeKey, number: number) {
  heading(doc, `${number}. ${NARRATIVE_TITLES[key]}`);
  para(doc, text[key]);
}

function promoterTable(doc: Doc, input: DprInput) {
  const promoters = input.promoters.filter((p) => p.name.trim());
  if (!promoters.length) return;
  table(
    doc,
    [
      { label: "Name", width: 22 },
      { label: "Father / Husband", width: 18 },
      { label: "Age", width: 7, align: "right" },
      { label: "Category", width: 11 },
      { label: "Qualification", width: 18 },
      { label: "Experience", width: 24 },
    ],
    promoters.map((p) => [p.name, p.fatherName, p.age ? String(p.age) : "-", p.socialCategory, p.qualification, p.experience]),
  );
}

function costOfProject(doc: Doc, input: DprInput, report: DprReport) {
  heading(doc, "Cost of Project");
  const items = input.capitalItems.filter((item) => itemAmount(item) > 0 && (item.kind !== "land" || input.includeLand));
  table(
    doc,
    [
      { label: "Item", width: 44 },
      { label: "Head", width: 22 },
      { label: "Qty", width: 8, align: "right" },
      { label: "Rate (Rs.)", width: 13, align: "right" },
      { label: "Amount (Rs.)", width: 13, align: "right" },
    ],
    [
      ...items.map((item) => [item.description, assetLabel(item.kind), String(item.quantity), amt(item.rate), amt(itemAmount(item))]),
      ["Working capital margin / requirement (one cycle)", "Working capital", "-", "-", amt(report.cost.workingCapital)],
      ["**Total cost of project", "", "", "", amt(report.cost.total)],
    ],
  );
  if (report.cost.landOutside > 0) {
    para(doc, `Land / premises worth Rs. ${amt(report.cost.landOutside)} is provided by the promoter and is not included in the cost of project.`);
  }

  subheading(doc, "Summary of cost");
  table(
    doc,
    [{ label: "Head", width: 70 }, { label: "Amount (Rs.)", width: 30, align: "right" }],
    [
      ...report.cost.lines.filter((l) => l.kind !== "land" || input.includeLand).map((l) => [l.label, amt(l.amount)]),
      ["Working capital", amt(report.cost.workingCapital)],
      ["**Total", amt(report.cost.total)],
    ],
  );
}

function meansOfFinance(doc: Doc, report: DprReport) {
  heading(doc, "Means of Finance");
  const m = report.means;
  const share = (v: number) => (report.cost.total > 0 ? pct((v / report.cost.total) * 100, 1) : "-");
  table(
    doc,
    [{ label: "Source", width: 55 }, { label: "Amount (Rs.)", width: 25, align: "right" }, { label: "Share", width: 20, align: "right" }],
    [
      ["Promoter's own contribution", amt(m.ownContribution), share(m.ownContribution)],
      ["Term loan from bank", amt(m.termLoan), share(m.termLoan)],
      ["Working capital (cash credit) limit", amt(m.ccLimit), share(m.ccLimit)],
      ["**Total", amt(m.total), share(m.total)],
    ],
  );
  if (m.subsidy > 0) {
    para(doc, `Margin money subsidy of Rs. ${amt(m.subsidy)} is expected under ${report.scheme?.label ?? "the scheme"}. It is back-ended: the bank keeps it as a term deposit for the lock-in period and then adjusts it against the loan. It is shown on both sides of the projected balance sheet.`);
  }
}

function workingCapitalSection(doc: Doc, input: DprInput, report: DprReport) {
  heading(doc, "Assessment of Working Capital");
  const wc = report.workingCapital;
  table(
    doc,
    [{ label: "Item", width: 55 }, { label: "Holding period", width: 20, align: "right" }, { label: "Amount (Rs.)", width: 25, align: "right" }],
    [
      ["Raw material stock", `${input.rawMaterialDays} days`, amt(wc.rawMaterialStock)],
      ["Finished goods / work in progress", `${input.finishedGoodsDays} days`, amt(wc.finishedGoods)],
      ["Receivables (debtors)", `${input.debtorDays} days`, amt(wc.debtors)],
      ["Less: credit from suppliers", `${input.creditorDays} days`, `(${amt(wc.creditors)})`],
      ["**Working capital requirement", "", amt(wc.requirement)],
    ],
  );
}

function operationsSection(doc: Doc, input: DprInput, report: DprReport) {
  heading(doc, "Capacity, Sales and Costs");
  subheading(doc, "Installed capacity and selling price");
  table(
    doc,
    [
      { label: "Product / service", width: 40 },
      { label: "Unit", width: 12 },
      { label: "Capacity per year", width: 16, align: "right" },
      { label: "Rate (Rs.)", width: 14, align: "right" },
      { label: "Value at 100% (Rs.)", width: 18, align: "right" },
    ],
    [...input.products.map((p) => [p.name, p.unit, p.capacity.toLocaleString("en-IN"), amt(p.price), amt(p.capacity * p.price)]), ["**Total", "", "", "", amt(report.installedCapacityValue)]],
  );
  subheading(doc, "Capacity utilisation and sales");
  table(doc, yearColumns(report, "Year"), [
    ["Capacity utilisation", ...report.years.map((y) => `${y.utilisationPct}%`)],
    ["Sales (Rs.)", ...report.years.map((y) => amt(y.sales))],
  ]);

  if (input.rawMaterials.length) {
    subheading(doc, "Raw material (at 100% capacity)");
    table(
      doc,
      [{ label: "Material", width: 40 }, { label: "Unit", width: 12 }, { label: "Quantity", width: 16, align: "right" }, { label: "Rate (Rs.)", width: 14, align: "right" }, { label: "Cost (Rs.)", width: 18, align: "right" }],
      [...input.rawMaterials.map((m) => [m.name, m.unit, m.quantity.toLocaleString("en-IN"), amt(m.rate), amt(m.quantity * m.rate)]), ["**Total", "", "", "", amt(input.rawMaterials.reduce((s, m) => s + m.quantity * m.rate, 0))]],
    );
  }
  if (input.staff.length) {
    subheading(doc, "Manpower");
    table(
      doc,
      [{ label: "Post", width: 38 }, { label: "Type", width: 14 }, { label: "Number", width: 12, align: "right" }, { label: "Salary / month", width: 18, align: "right" }, { label: "Per year (Rs.)", width: 18, align: "right" }],
      [
        ...input.staff.map((s) => [s.role, s.direct ? "Direct" : "Indirect", String(s.count), amt(s.monthlySalary), amt(s.count * s.monthlySalary * 12)]),
        ["**Total", "", String(input.staff.reduce((t, s) => t + s.count, 0)), "", amt(input.staff.reduce((t, s) => t + s.count * s.monthlySalary * 12, 0))],
      ],
    );
  }
  if (input.overheads.some((o) => o.monthly > 0)) {
    subheading(doc, "Utilities and overheads");
    table(
      doc,
      [{ label: "Expense", width: 46 }, { label: "Nature", width: 24 }, { label: "Per month (Rs.)", width: 15, align: "right" }, { label: "Per year (Rs.)", width: 15, align: "right" }],
      input.overheads.filter((o) => o.monthly > 0).map((o) => [o.name, `${o.direct ? "Direct" : "Indirect"}, ${o.variable ? "varies with output" : "fixed"}`, amt(o.monthly), amt(o.monthly * 12)]),
    );
    para(doc, `Costs varying with output are stated at full capacity and taken in proportion to utilisation. Salaries and overheads are increased by ${input.costGrowthPct}% a year${input.priceGrowthPct ? `; selling prices and raw material rates by ${input.priceGrowthPct}% a year` : "; selling prices and raw material rates are held constant"}.`);
  }
}

function profitability(doc: Doc, report: DprReport) {
  heading(doc, "Projected Profitability Statement");
  const y = report.years;
  const row = (label: string, pick: (r: (typeof y)[number]) => number) => [label, ...y.map((r) => amt(pick(r)))];
  table(doc, yearColumns(report), [
    ["Capacity utilisation", ...y.map((r) => `${r.utilisationPct}%`)],
    ["**A. Sales", ...y.map((r) => amt(r.sales))],
    row("Raw material", (r) => r.rawMaterial),
    row("Direct wages", (r) => r.directWages),
    row("Power and direct expenses", (r) => r.directOverheads),
    ["**B. Cost of production", ...y.map((r) => amt(r.costOfProduction))],
    ["**C. Gross profit (A - B)", ...y.map((r) => amt(r.grossProfit))],
    row("Salaries (indirect staff)", (r) => r.indirectSalaries),
    row("Administrative and selling expenses", (r) => r.indirectOverheads),
    row("Depreciation", (r) => r.depreciation),
    row("Preliminary expenses written off", (r) => r.preliminaryWrittenOff),
    row("Interest on term loan", (r) => r.termLoanInterest),
    row("Interest on working capital", (r) => r.ccInterest),
    ...(y.some((r) => r.interestSubvention > 0) ? [row("Less: interest subvention", (r) => -r.interestSubvention)] : []),
    ["**D. Profit before tax", ...y.map((r) => amt(r.profitBeforeTax))],
    row("Income tax", (r) => r.tax),
    ["**E. Net profit after tax", ...y.map((r) => amt(r.netProfit))],
    ["**F. Cash accrual (E + depreciation + write-off)", ...y.map((r) => amt(r.cashAccrual))],
  ], { fontSize: 8.5 });
}

function balanceSheet(doc: Doc, report: DprReport) {
  heading(doc, "Projected Balance Sheet");
  const y = report.years;
  const row = (label: string, pick: (r: (typeof y)[number]) => number) => [label, ...y.map((r) => amt(pick(r)))];
  const hasSubsidy = y.some((r) => r.subsidyReserve > 0);
  table(doc, yearColumns(report, "Liabilities"), [
    row("Capital (with profit, less drawings)", (r) => r.capital),
    ...(hasSubsidy ? [row("Margin money subsidy reserve", (r) => r.subsidyReserve)] : []),
    row("Term loan", (r) => r.termLoanOutstanding),
    row("Cash credit (working capital)", (r) => r.ccLoan),
    row("Sundry creditors", (r) => r.creditors),
    ["**Total", ...y.map((r) => amt(r.totalLiabilities))],
  ], { fontSize: 8.5 });
  table(doc, yearColumns(report, "Assets"), [
    row("Net fixed assets", (r) => r.netFixedAssets),
    ...(y.some((r) => r.preliminaryUnamortised > 0) ? [row("Preliminary expenses (not written off)", (r) => r.preliminaryUnamortised)] : []),
    row("Stock", (r) => r.stock),
    row("Sundry debtors", (r) => r.debtorsBalance),
    ...(hasSubsidy ? [row("Subsidy held by bank (TDR)", (r) => r.subsidyDeposit)] : []),
    row("Cash and bank", (r) => r.cash),
    ["**Total", ...y.map((r) => amt(r.totalAssets))],
  ], { fontSize: 8.5 });
}

function schedules(doc: Doc, input: DprInput, report: DprReport) {
  heading(doc, "Depreciation Schedule (Written Down Value)");
  table(
    doc,
    [{ label: "Asset", width: 24 }, { label: "Rate", width: 8, align: "right" }, { label: "Cost", width: 12, align: "right" }, ...report.years.map((y) => ({ label: y.label, width: 11, align: "right" as Align }))],
    [
      ...report.depreciation.map((d) => [d.label, `${d.ratePct}%`, amt(d.cost), ...d.perYear.map(amt)]),
      ["**Total", "", amt(report.depreciation.reduce((s, d) => s + d.cost, 0)), ...report.years.map((y) => amt(y.depreciation))],
    ],
    { fontSize: 8.5 },
  );

  heading(doc, "Repayment Schedule of Term Loan");
  para(doc, `Term loan of Rs. ${amt(report.means.termLoan)} at ${input.termLoanInterestPct}% per annum, repayable over ${input.tenureYears} years including a moratorium of ${input.moratoriumMonths} months, in equal monthly instalments of principal with interest on the balance outstanding.`);
  table(
    doc,
    [{ label: "Year", width: 16 }, { label: "Opening balance", width: 21, align: "right" }, { label: "Interest", width: 21, align: "right" }, { label: "Principal repaid", width: 21, align: "right" }, { label: "Closing balance", width: 21, align: "right" }],
    [
      ...report.repayment.map((r) => [r.label, amt(r.opening), amt(r.interest), amt(r.principal), amt(r.closing)]),
      ["**Total", "", amt(report.repayment.reduce((s, r) => s + r.interest, 0)), amt(report.repayment.reduce((s, r) => s + r.principal, 0)), ""],
    ],
  );

  heading(doc, "Debt Service Coverage Ratio (DSCR)");
  const y = report.years;
  table(doc, yearColumns(report), [
    ["Net profit after tax", ...y.map((r) => amt(r.netProfit))],
    ["Add: depreciation and write-off", ...y.map((r) => amt(r.depreciation + r.preliminaryWrittenOff))],
    ["Add: interest on term loan", ...y.map((r) => amt(r.termLoanInterest))],
    ["**A. Funds available", ...y.map((r) => amt(r.cashAccrual + r.termLoanInterest))],
    ["Interest on term loan", ...y.map((r) => amt(r.termLoanInterest))],
    ["Principal repaid", ...y.map((r) => amt(r.principalRepaid))],
    ["**B. Debt to be serviced", ...y.map((r) => amt(r.termLoanInterest + r.principalRepaid))],
    ["**DSCR (A / B)", ...y.map((r) => ratio(r.dscr))],
  ], { fontSize: 8.5 });
  para(doc, `Average DSCR: ${ratio(report.averageDscr)}   ·   Minimum DSCR: ${ratio(report.minimumDscr)}`);
}

function breakEvenSection(doc: Doc, report: DprReport) {
  const b = report.breakEven;
  if (!b) return;
  heading(doc, `Break-even Analysis (${b.label})`);
  keyValue(doc, [
    ["Sales", `Rs. ${amt(report.years.find((y) => y.fyStart === b.fyStart)?.sales ?? 0)}`],
    ["Variable costs (raw material and variable expenses)", `Rs. ${amt(b.variableCosts)}`],
    ["Contribution", `Rs. ${amt(b.contribution)}`],
    ["Fixed costs (wages, salaries, fixed overheads, interest, depreciation)", `Rs. ${amt(b.fixedCosts)}`],
    ["Break-even sales", `Rs. ${amt(b.bepSales)}`],
    ["Break-even point (of installed capacity)", pct(b.bepCapacityPct, 2)],
    ["Cash break-even point (of installed capacity)", pct(b.cashBepCapacityPct, 2)],
  ]);
}

function ratiosSection(doc: Doc, report: DprReport) {
  heading(doc, "Key Financial Indicators");
  const y = report.years;
  table(doc, yearColumns(report), [
    ["Net profit margin", ...y.map((r) => (r.sales > 0 ? pct((r.netProfit / r.sales) * 100) : "-"))],
    ["Current ratio", ...y.map((r) => ratio(r.currentRatio))],
    ["DSCR", ...y.map((r) => ratio(r.dscr))],
  ]);
  para(doc, `Payback period (cost of project / average cash accrual): ${report.paybackYears === null ? "-" : `${report.paybackYears.toFixed(1)} years`}.`);
}

function declaration(doc: Doc, input: DprInput) {
  ensure(doc, 160);
  heading(doc, "Declaration");
  para(doc, "I / We hereby declare that the information given in this project report is true and correct to the best of my / our knowledge and belief. The projections are based on reasonable assumptions about capacity utilisation, prices and costs.");
  doc.moveDown(3);
  const name = input.promoters.find((p) => p.name.trim())?.name ?? "";
  doc.font(FONT).fontSize(11).text("Place: " + (input.district || "________"), M, doc.y);
  doc.text("Date: ________", M, doc.y + 4);
  doc.font(BOLD).text(`(${name || "Signature of promoter"})`, M, doc.y - 30, { width: width(doc), align: "right" });
  doc.font(FONT).text("Signature of promoter", M, doc.y + 2, { width: width(doc), align: "right" });
}

function decorate(doc: Doc, record: ProjectReportRecord) {
  const range = doc.bufferedPageRange();
  for (let i = 1; i < range.count; i += 1) {
    doc.switchToPage(range.start + i);
    // Writing inside the bottom margin would make pdfkit start a new page.
    const margin = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    const y = doc.page.height - M + 8;
    doc.font(ITALIC).fontSize(8).fillColor("#333");
    doc.text(`${record.input.businessName} — Detailed Project Report (${record.reference})`, M, y, { width: width(doc) / 1.5, lineBreak: false });
    doc.text(`Page ${i + 1} of ${range.count}`, M, y, { width: width(doc), align: "right", lineBreak: false });
    doc.page.margins.bottom = margin;
  }
}

export async function renderProjectReportPdf(record: ProjectReportRecord) {
  const input = record.input;
  const report = buildDpr(input);
  const text = narrativeFor(input, report);
  const doc = new PDFDocument({ size: "A4", margin: M, bufferPages: true, info: { Title: `DPR - ${input.businessName}`, Author: "DigiConnect Dukan / RNOS India Pvt. Ltd." } });

  cover(doc, record, report);
  doc.addPage();
  atAGlance(doc, input, report);
  narrativeSection(doc, text, "introduction", 1);
  narrativeSection(doc, text, "promoters", 2);
  promoterTable(doc, input);
  narrativeSection(doc, text, "project", 3);
  narrativeSection(doc, text, "market", 4);
  narrativeSection(doc, text, "process", 5);
  costOfProject(doc, input, report);
  meansOfFinance(doc, report);
  workingCapitalSection(doc, input, report);
  operationsSection(doc, input, report);
  profitability(doc, report);
  balanceSheet(doc, report);
  schedules(doc, input, report);
  breakEvenSection(doc, report);
  ratiosSection(doc, report);
  narrativeSection(doc, text, "swot", 6);
  narrativeSection(doc, text, "implementation", 7);
  narrativeSection(doc, text, "conclusion", 8);
  declaration(doc, input);
  decorate(doc, record);
  return buffer(doc);
}


