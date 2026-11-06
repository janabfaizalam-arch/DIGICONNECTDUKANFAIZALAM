import "server-only";

import PDFDocument from "pdfkit";

import {
  CONSTITUTIONS,
  buildStatements,
  capitalHeading,
  formatAmount,
  yearEndLabel,
  type Period,
  type Statements,
} from "@/lib/balance-sheets/engine";
import { amount, balanceSheetRows, profitAndLossRows, projectFinanceRows, ratioRows, type Row } from "@/lib/balance-sheets/rows";
import { SCHEME_OPTIONS, mudraCategory } from "@/lib/balance-sheets/schemes";
import { figuresOf } from "@/lib/balance-sheets/schema";
import type { BalanceSheetRecord } from "@/lib/balance-sheets/store";

/**
 * The printed statements, in the plain layout a chartered accountant's office
 * produces for a loan file: Times, black on white, ruled columns, amounts in
 * Indian grouping with negatives in brackets. No colour, no logo block, no
 * decoration — a bank officer reads hundreds of these and trusts the familiar
 * format.
 */

const PAGE = { size: "A4" as const, layout: "landscape" as const, margin: 40 };
const INK = "#000000";
const RULE = "#444444";
const SHADE = "#efefef";
const FONT = "Times-Roman";
const BOLD = "Times-Bold";
const ITALIC = "Times-Italic";

/** Full scheme name for the printed file, or null for an ordinary bank loan. */
function schemeName(record: BalanceSheetRecord) {
  const scheme = record.projection.scheme;
  if (!scheme || scheme === "none") return null;
  if (scheme === "other") return "Government scheme";
  const name = SCHEME_OPTIONS.find((option) => option.value === scheme)?.label ?? null;
  if (scheme === "mudra" && name) {
    const category = mudraCategory(record.projection.newTermLoan + record.projection.ccLimit);
    return category ? `${name.replace(/ \(.*\)$/, "")} - ${category.name}` : name;
  }
  return name;
}

function pdfBuffer(doc: PDFKit.PDFDocument) {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}

function constitutionLabel(value: string) {
  return CONSTITUTIONS.find((entry) => entry.value === value)?.label ?? "Other";
}

function signatoryTitle(constitution: string) {
  if (constitution === "proprietorship") return "Proprietor";
  if (constitution === "partnership" || constitution === "llp") return "Partner / Designated Partner";
  if (constitution === "private_limited" || constitution === "opc") return "Director";
  return "Authorised Signatory";
}

/* ─────────────────────────────────────────────────────────────────────────
   Tables
   ───────────────────────────────────────────────────────────────────────── */

function drawTable(doc: PDFKit.PDFDocument, periods: Period[], rows: Row[], top: number) {
  const left = PAGE.margin;
  const width = doc.page.width - PAGE.margin * 2;
  const labelWidth = Math.min(260, width * 0.34);
  const colWidth = (width - labelWidth) / periods.length;
  // Fit the whole statement on one page: a CC limit, a subsidy and its
  // deposit add lines, and a statement split across pages reads badly. Rows
  // shrink from 15pt towards 11pt (and the type with them) only as needed.
  const lines = rows.filter((row) => row.kind !== "gap").length;
  const gaps = rows.length - lines;
  const totals = rows.filter((row) => row.kind === "line" && row.rule === "total").length;
  const room = doc.page.height - PAGE.margin - 26 - (top + 30);
  const rowHeight = Math.max(11, Math.min(15, (room - totals * 3) / (lines + gaps / 3)));
  const gapHeight = rowHeight / 3;
  const size = rowHeight >= 14 ? 9.5 : rowHeight >= 12.5 ? 9 : 8.5;
  const pad = (rowHeight - size) / 2 + 0.5;
  let y = top;

  // Column headings.
  doc.lineWidth(0.8).strokeColor(RULE).rect(left, y, width, 30).stroke();
  doc.font(BOLD).fontSize(9.5).fillColor(INK).text("Particulars", left + 6, y + 10, { width: labelWidth - 12 });
  periods.forEach((period, index) => {
    const x = left + labelWidth + index * colWidth;
    doc.moveTo(x, y).lineTo(x, y + 30).stroke();
    doc.font(BOLD).fontSize(9).text(period.kind === "actual" ? "Actual" : "Projected", x + 2, y + 5, { width: colWidth - 4, align: "center" });
    doc.font(FONT).fontSize(8.5).text(yearEndLabel(period.fyStart), x + 2, y + 17, { width: colWidth - 4, align: "center" });
  });
  y += 30;

  const bodyTop = y;
  for (const row of rows) {
    if (row.kind === "gap") {
      y += gapHeight;
      continue;
    }
    if (row.kind === "heading") {
      doc.rect(left, y, width, rowHeight).fill(SHADE);
      doc.fillColor(INK).font(BOLD).fontSize(size).text(row.label, left + 6, y + pad, { width: labelWidth, lineBreak: false });
      y += rowHeight;
      continue;
    }
    if (row.rule === "above" || row.rule === "total") {
      doc.lineWidth(0.6).strokeColor(RULE).moveTo(left + labelWidth, y).lineTo(left + width, y).stroke();
    }
    const font = row.bold ? BOLD : FONT;
    doc.fillColor(INK).font(font).fontSize(size).text(row.label, left + 6 + (row.indent ?? 0) * 12, y + pad, {
      width: labelWidth - 12 - (row.indent ?? 0) * 12,
      lineBreak: false,
      ellipsis: true,
    });
    row.values.forEach((value, index) => {
      const x = left + labelWidth + index * colWidth;
      doc.font(font).fontSize(size).text(amount(value), x + 4, y + pad, { width: colWidth - 10, align: "right", lineBreak: false });
    });
    y += rowHeight;
    if (row.rule === "total") {
      doc.lineWidth(0.6).moveTo(left + labelWidth, y).lineTo(left + width, y).stroke();
      doc.moveTo(left + labelWidth, y + 2).lineTo(left + width, y + 2).stroke();
      y += 3;
    }
  }

  // Frame and column rules for the body.
  doc.lineWidth(0.8).strokeColor(RULE).rect(left, bodyTop, width, y - bodyTop).stroke();
  periods.forEach((_, index) => {
    const x = left + labelWidth + index * colWidth;
    doc.moveTo(x, bodyTop).lineTo(x, y).stroke();
  });
  return y;
}

/* ─────────────────────────────────────────────────────────────────────────
   Pages
   ───────────────────────────────────────────────────────────────────────── */

function pageTitle(doc: PDFKit.PDFDocument, record: BalanceSheetRecord, title: string, subtitle: string, showUnit = true) {
  const width = doc.page.width - PAGE.margin * 2;
  doc.fillColor(INK).font(BOLD).fontSize(14).text(record.businessName.toUpperCase(), PAGE.margin, PAGE.margin, { width, align: "center" });
  const place = [record.address, record.city, record.state, record.pincode].filter(Boolean).join(", ");
  if (place) doc.font(FONT).fontSize(9.5).text(place, { width, align: "center" });
  doc.moveDown(0.6);
  doc.font(BOLD).fontSize(12).text(title, { width, align: "center", underline: true });
  doc.font(ITALIC).fontSize(9.5).text(subtitle, { width, align: "center" });
  if (showUnit) doc.font(FONT).fontSize(8.5).text("(Amount in Rs.)", PAGE.margin, doc.y + 2, { width, align: "right" });
  return doc.y + 4;
}

function coverPage(doc: PDFKit.PDFDocument, record: BalanceSheetRecord, statements: Statements) {
  const width = doc.page.width - PAGE.margin * 2;
  const first = statements.periods[0];
  const last = statements.periods[statements.periods.length - 1];
  const projected = statements.periods.some((period) => period.kind === "projected");

  doc.fillColor(INK).font(BOLD).fontSize(18).text(record.businessName.toUpperCase(), PAGE.margin, 80, { width, align: "center" });
  const place = [record.address, record.city, record.state, record.pincode].filter(Boolean).join(", ");
  if (place) doc.font(FONT).fontSize(11).text(place, { width, align: "center" });
  doc.moveDown(1.4);
  doc.font(BOLD).fontSize(15).text(projected && record.hasActual ? "ACTUAL AND PROJECTED FINANCIAL STATEMENTS" : projected ? "PROJECTED FINANCIAL STATEMENTS" : "FINANCIAL STATEMENTS", { width, align: "center" });
  doc.font(FONT).fontSize(11).text(
    first === last ? `For the year ended ${first.yearEnd}` : `For the years ended ${first.yearEnd} to ${last.yearEnd}`,
    { width, align: "center" },
  );
  if (record.bankName) doc.moveDown(0.3).font(ITALIC).fontSize(11).text(`Submitted to ${record.bankName}`, { width, align: "center" });

  const details: [string, string][] = [
    [record.constitution === "proprietorship" ? "Name of proprietor" : "Name of partners / directors", record.ownerName],
    ["Constitution", constitutionLabel(record.constitution)],
    ["Nature of business", record.natureOfBusiness ?? "-"],
    ["PAN", record.pan ?? "-"],
    ["GSTIN", record.gstin ?? "-"],
    ["Udyam registration no.", record.udyamNumber ?? "-"],
    ["Contact", [record.mobile, record.email].filter(Boolean).join(" / ") || "-"],
    ["Purpose of loan", record.loanPurpose ?? "-"],
    ["Loan amount applied for", record.loanAmount ? `Rs. ${formatAmount(record.loanAmount)}` : "-"],
  ];
  const scheme = schemeName(record);
  if (scheme) details.push(["Loan scheme", scheme]);

  const tableWidth = 470;
  const left = (doc.page.width - tableWidth) / 2;
  let y = doc.y + 26;
  doc.lineWidth(0.8).strokeColor(RULE);
  for (const [label, value] of details) {
    doc.rect(left, y, tableWidth, 20).stroke();
    doc.moveTo(left + 180, y).lineTo(left + 180, y + 20).stroke();
    doc.font(BOLD).fontSize(10).fillColor(INK).text(label, left + 8, y + 6, { width: 170 });
    doc.font(FONT).fontSize(10).text(value, left + 188, y + 6, { width: tableWidth - 196, height: 12, ellipsis: true });
    y += 20;
  }

  y += 22;
  doc.font(BOLD).fontSize(10.5).text("Contents", left, y);
  const contents = [
    ...(statements.projectFinance ? ["Project Cost and Means of Finance"] : []),
    "Trading and Profit & Loss Account",
    "Balance Sheet",
    "Key Ratios and Debt Service Coverage",
    "Notes and Assumptions",
  ];
  doc.font(FONT).fontSize(10);
  contents.forEach((item, index) => doc.text(`${index + 1}.  ${item}`, left + 12, index === 0 ? doc.y + 4 : undefined));
}

function notesPage(doc: PDFKit.PDFDocument, record: BalanceSheetRecord, statements: Statements, top: number) {
  const a = statements.assumptions;
  const p = record.projection;
  const width = doc.page.width - PAGE.margin * 2;
  const projected = statements.periods.some((period) => period.kind === "projected");

  const notes: string[] = [];
  if (record.hasActual) {
    notes.push(`Figures for ${statements.periods[0].label.replace(" (Actual)", "")} are as per the books of account and information furnished by the ${signatoryTitle(record.constitution).toLowerCase()}, and have not been audited.`);
  }
  if (projected) {
    notes.push(
      record.hasActual
        ? `Sales are projected to grow at ${a.salesGrowthPct}% per annum over the previous year.`
        : `Sales for the first year are estimated at Rs. ${formatAmount(a.year1Sales)}, growing at ${a.salesGrowthPct}% per annum thereafter.`,
    );
    notes.push(`Cost of sales (materials and direct expenses) is taken at ${a.materialCostPct}% of sales.`);
    notes.push(`Indirect expenses are taken at Rs. ${formatAmount(a.indirectExpensesYear1)} for the first projected year, increasing at ${a.expenseGrowthPct}% per annum.`);
    notes.push(`Depreciation is provided on the written down value method at ${a.depreciationPct}% per annum.`);
    if (p.newTermLoan > 0) {
      notes.push(
        `A term loan of Rs. ${formatAmount(p.newTermLoan)} is assumed at ${p.loanInterestPct}% per annum, repayable in ${p.loanTenureYears} equal annual instalments. Interest is calculated on the opening balance of each year.`,
      );
    }
    if (p.ccLimit > 0) {
      notes.push(
        `A cash credit / working capital limit of Rs. ${formatAmount(p.ccLimit)} is assumed at ${p.ccInterestPct}% per annum. Being a running limit, it is taken as fully utilised in every projected year; its interest is charged to the Profit & Loss Account and it is excluded from debt service in the DSCR.`,
      );
    }
    if (p.interestSubventionPct > 0 && p.interestSubventionYears > 0) {
      notes.push(
        `Interest subvention of ${p.interestSubventionPct}% of the interest on the new facilities is taken for the first ${p.interestSubventionYears} year(s)${schemeName(record) ? ` under ${schemeName(record)}` : ""}, and is shown as a deduction from interest.`,
      );
    }
    if (p.subsidyAmount > 0) {
      notes.push(
        `Margin money / capital subsidy of Rs. ${formatAmount(p.subsidyAmount)}${schemeName(record) ? ` under ${schemeName(record)}` : ""} is back-ended. It is shown as a capital subsidy with an equal deposit (TDR) held by the bank during the lock-in period, and does not add to the funds available for the project.`,
      );
    }
    if (p.newFixedAssets > 0) notes.push(`Fixed assets of Rs. ${formatAmount(p.newFixedAssets)} are proposed to be acquired in the first projected year.`);
    if (p.capitalIntroducedYear1 > 0) notes.push(`Own contribution of Rs. ${formatAmount(p.capitalIntroducedYear1)} is introduced in the first projected year.`);
    notes.push(`Working capital is estimated at ${a.debtorDays} days of sales for debtors, ${a.stockDays} days of cost of sales for stock and ${a.creditorDays} days of cost of sales for creditors.`);
    notes.push(a.taxPct > 0 ? `Provision for income tax is made at ${a.taxPct}% of profit before tax.` : "No provision for income tax has been made in the projections.");
    if (p.drawingsPerYear > 0) notes.push(`Drawings are taken at Rs. ${formatAmount(p.drawingsPerYear)} per annum.`);
    notes.push("Cash and bank balances in the projected years represent the surplus of funds after meeting all the above requirements.");
    notes.push("The projections are estimates based on the assumptions stated above. Actual results may differ.");
  }

  doc.fillColor(INK).font(FONT).fontSize(10);
  doc.y = top + 4;
  notes.forEach((note, index) => {
    doc.text(`${index + 1}.  ${note}`, PAGE.margin + 4, doc.y + 4, { width: width - 8 });
  });

  // Signatures: the customer, the preparer, and an empty block for the CA.
  const blockTop = Math.max(doc.y + 24, doc.page.height - PAGE.margin - 120);
  const blockWidth = (width - 40) / 3;
  const blocks = [
    { heading: `For ${record.businessName}`, lines: ["", "", `(${record.ownerName})`, signatoryTitle(record.constitution), "Date:", "Place:"] },
    { heading: "Prepared by", lines: ["DigiConnect Dukan", "(RNOS India Private Limited)", "", "Authorised Signatory", "Date:"] },
    { heading: "Certified by Chartered Accountant", lines: ["", "", "Signature and Seal", "Name / Membership No.:", "Firm Reg. No.:", "UDIN:", "Date:"] },
  ];
  blocks.forEach((block, index) => {
    const x = PAGE.margin + index * (blockWidth + 20);
    doc.lineWidth(0.8).strokeColor(RULE).rect(x, blockTop, blockWidth, 108).stroke();
    doc.font(BOLD).fontSize(9.5).fillColor(INK).text(block.heading, x + 8, blockTop + 7, { width: blockWidth - 16 });
    let y = blockTop + 22;
    block.lines.forEach((line) => {
      doc.font(FONT).fontSize(9).text(line, x + 8, y, { width: blockWidth - 16 });
      y += 12;
    });
  });
}

function projectFinancePage(doc: PDFKit.PDFDocument, record: BalanceSheetRecord, statements: Statements, top: number) {
  const finance = statements.projectFinance;
  if (!finance) return;
  const table = projectFinanceRows(finance);
  const left = PAGE.margin;
  const width = doc.page.width - PAGE.margin * 2;
  const half = width / 2;
  const amountWidth = 120;
  let y = top;

  doc.lineWidth(0.8).strokeColor(RULE);
  doc.rect(left, y, width, 22).fillAndStroke(SHADE, RULE);
  doc.fillColor(INK).font(BOLD).fontSize(10);
  doc.text("Cost of project", left + 6, y + 7, { width: half - amountWidth - 12 });
  doc.text("Amount (Rs.)", left + half - amountWidth, y + 7, { width: amountWidth - 6, align: "right" });
  doc.text("Means of finance", left + half + 6, y + 7, { width: half - amountWidth - 12 });
  doc.text("Amount (Rs.)", left + width - amountWidth, y + 7, { width: amountWidth - 6, align: "right" });
  y += 22;

  const lines = Math.max(table.cost.length, table.means.length);
  for (let index = 0; index < lines; index += 1) {
    doc.rect(left, y, width, 18).stroke();
    doc.moveTo(left + half, y).lineTo(left + half, y + 18).stroke();
    doc.font(FONT).fontSize(10);
    const cost = table.cost[index];
    const means = table.means[index];
    if (cost) {
      doc.text(cost[0], left + 6, y + 5, { width: half - amountWidth - 12 });
      doc.text(amount(cost[1]), left + half - amountWidth, y + 5, { width: amountWidth - 6, align: "right" });
    }
    if (means) {
      doc.text(means[0], left + half + 6, y + 5, { width: half - amountWidth - 12 });
      doc.text(amount(means[1]), left + width - amountWidth, y + 5, { width: amountWidth - 6, align: "right" });
    }
    y += 18;
  }
  doc.rect(left, y, width, 20).stroke();
  doc.moveTo(left + half, y).lineTo(left + half, y + 20).stroke();
  doc.font(BOLD).fontSize(10);
  doc.text("Total", left + 6, y + 6);
  doc.text(amount(table.totalCost), left + half - amountWidth, y + 6, { width: amountWidth - 6, align: "right" });
  doc.text("Total", left + half + 6, y + 6);
  doc.text(amount(table.totalMeans), left + width - amountWidth, y + 6, { width: amountWidth - 6, align: "right" });
  y += 34;

  const p = record.projection;
  const facts: string[] = [];
  if (p.newTermLoan > 0) facts.push(`Term loan: Rs. ${formatAmount(p.newTermLoan)} at ${p.loanInterestPct}% per annum, repayable in ${p.loanTenureYears} years.`);
  if (p.ccLimit > 0) facts.push(`Cash credit / working capital limit: Rs. ${formatAmount(p.ccLimit)} at ${p.ccInterestPct}% per annum.`);
  if (finance.totalCost > 0) {
    facts.push(`Promoter's contribution: ${((finance.ownContribution / finance.totalCost) * 100).toFixed(2)}% of the project cost.`);
  }
  if (table.subsidy > 0) facts.push(`Margin money / capital subsidy (back-ended): Rs. ${formatAmount(table.subsidy)}, to be held by the bank during the lock-in period.`);
  if (p.interestSubventionPct > 0 && p.interestSubventionYears > 0) {
    facts.push(`Interest subvention: ${p.interestSubventionPct}% of interest for ${p.interestSubventionYears} year(s).`);
  }
  doc.font(FONT).fontSize(10).fillColor(INK);
  doc.y = y;
  facts.forEach((fact) => doc.text(fact, left + 4, doc.y + 3, { width: width - 8 }));
}

function decoratePages(doc: PDFKit.PDFDocument, record: BalanceSheetRecord) {
  const range = doc.bufferedPageRange();
  for (let index = range.start; index < range.start + range.count; index += 1) {
    doc.switchToPage(index);
    // Footer and watermark sit inside the bottom margin; without this pdfkit
    // treats them as overflowing and starts a new page for each.
    const bottomMargin = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    if (record.status === "draft") {
      doc.save();
      doc.rotate(-30, { origin: [doc.page.width / 2, doc.page.height / 2] });
      doc.font(BOLD).fontSize(96).fillColor("#000000").fillOpacity(0.06).text("DRAFT", 0, doc.page.height / 2 - 50, { width: doc.page.width, align: "center" });
      doc.restore();
      doc.fillOpacity(1);
    }
    const y = doc.page.height - 26;
    doc.font(FONT).fontSize(8).fillColor("#333333");
    doc.text(`${record.businessName} - Ref. ${record.reference}`, PAGE.margin, y, { width: 400, lineBreak: false });
    doc.text(`Page ${index - range.start + 1} of ${range.count}`, doc.page.width - PAGE.margin - 120, y, { width: 120, align: "right", lineBreak: false });
    doc.page.margins.bottom = bottomMargin;
  }
}

export async function renderBalanceSheetPdf(record: BalanceSheetRecord) {
  const statements = buildStatements(figuresOf(record));
  const doc = new PDFDocument({
    ...PAGE,
    bufferPages: true,
    info: { Title: `${record.businessName} - Financial Statements`, Author: "DigiConnect Dukan" },
  });

  const periods = statements.periods;
  const span = periods.length === 1 ? `For the year ended ${periods[0].yearEnd}` : `For the years ended ${periods[0].yearEnd} to ${periods[periods.length - 1].yearEnd}`;
  const asAt = periods.length === 1 ? `As at ${periods[0].yearEnd}` : `As at ${periods[0].yearEnd} to ${periods[periods.length - 1].yearEnd}`;

  coverPage(doc, record, statements);

  if (statements.projectFinance) {
    doc.addPage();
    projectFinancePage(doc, record, statements, pageTitle(doc, record, "PROJECT COST AND MEANS OF FINANCE", schemeName(record) ?? "Proposed project"));
  }

  doc.addPage();
  drawTable(doc, periods, profitAndLossRows(periods), pageTitle(doc, record, "TRADING AND PROFIT & LOSS ACCOUNT", span));

  doc.addPage();
  drawTable(doc, periods, balanceSheetRows(periods, capitalHeading(record.constitution)), pageTitle(doc, record, "BALANCE SHEET", asAt));

  doc.addPage();
  let y = pageTitle(doc, record, "KEY RATIOS AND DEBT SERVICE COVERAGE", span);
  const left = PAGE.margin;
  const width = doc.page.width - PAGE.margin * 2;
  const labelWidth = Math.min(260, width * 0.34);
  const colWidth = (width - labelWidth) / periods.length;
  doc.lineWidth(0.8).strokeColor(RULE).rect(left, y, width, 22).stroke();
  doc.font(BOLD).fontSize(9.5).fillColor(INK).text("Particulars", left + 6, y + 7, { width: labelWidth - 12 });
  periods.forEach((period, index) => {
    const x = left + labelWidth + index * colWidth;
    doc.moveTo(x, y).lineTo(x, y + 22).stroke();
    doc.font(BOLD).fontSize(8.5).text(period.label.replace("FY ", ""), x + 2, y + 7, { width: colWidth - 4, align: "center" });
  });
  y += 22;
  for (const row of ratioRows(periods, statements)) {
    doc.rect(left, y, width, 16).stroke();
    doc.font(FONT).fontSize(9.5).text(row.label, left + 6, y + 4, { width: labelWidth - 12 });
    row.values.forEach((value, index) => {
      const x = left + labelWidth + index * colWidth;
      doc.moveTo(x, y).lineTo(x, y + 16).stroke();
      doc.font(FONT).fontSize(9.5).text(value, x + 4, y + 4, { width: colWidth - 10, align: "right" });
    });
    y += 16;
  }
  doc.font(ITALIC).fontSize(8.5).text(
    "DSCR = (Net profit after tax + Depreciation + Interest on term loan) / (Interest on term loan + Repayment of term loan).",
    left,
    y + 6,
    { width },
  );

  doc.addPage();
  notesPage(doc, record, statements, pageTitle(doc, record, "NOTES AND ASSUMPTIONS", span, false));
  decoratePages(doc, record);

  return pdfBuffer(doc);
}
