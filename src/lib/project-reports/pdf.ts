import "server-only";

import PDFDocument from "pdfkit";

import { CONSTITUTIONS } from "@/lib/balance-sheets/engine";
import { SCHEME_OPTIONS } from "@/lib/balance-sheets/schemes";

import { NARRATIVE_TITLES, narrativeFor } from "./defaults";
import {
  assetLabel,
  buildDpr,
  defaultDepreciationRate,
  fyLabel,
  itemAmount,
  monthlySchedule,
  sensitivityOf,
  type DprInput,
  type DprReport,
  type NarrativeKey,
} from "./engine";
import type { ProjectReportRecord } from "./store";

/**
 * The printed DPR.
 *
 * It follows the structure banks and CA offices use — project at a glance,
 * cost and means, salary, repayment, depreciation, raw material, sales,
 * profitability, balance sheet, cash flow, DSCR and current ratio, with
 * figures in lakhs — and adds the sections a credit officer otherwise asks
 * for: market, process, machinery, licences, risks, sensitivity, key ratios
 * and a monthly repayment schedule. The layout is quiet and modern: one
 * typeface, one accent colour, hairline rules, generous white space.
 */

/* ── Design tokens ─────────────────────────────────────────────────────── */

const M = 54;
const SANS = "Helvetica";
const SANS_BOLD = "Helvetica-Bold";
const SANS_ITALIC = "Helvetica-Oblique";
const INK = "#0f1b2d";
const BODY = "#2b3442";
const MUTED = "#6b7480";
const ACCENT = "#0e4a7a";
const ACCENT_SOFT = "#eef3f8";
const HAIRLINE = "#d8dde4";
const ZEBRA = "#f7f9fb";

type Doc = PDFKit.PDFDocument;
type Align = "left" | "right" | "center";
type Column = { label: string; width: number; align?: Align };
type Row = { cells: string[]; total?: boolean; muted?: boolean };

/* ── Number formats ────────────────────────────────────────────────────── */

const INR = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** Rupees as lakhs, two decimals; negatives in brackets. */
const L = (value: number) => {
  const v = Math.round((value / 100000) * 100) / 100;
  if (Math.abs(v) < 0.005) return "-";
  return v < 0 ? `(${INR.format(-v)})` : INR.format(v);
};
const rupees = (value: number) => INR.format(value);
const pct = (value: number | null | undefined, digits = 2) => (value === null || value === undefined || !Number.isFinite(value) ? "-" : `${value.toFixed(digits)}%`);
const ratio = (value: number | null) => (value === null || !Number.isFinite(value) ? "-" : value.toFixed(2));
const roman = (n: number) => ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"][n] ?? String(n + 1);

function buffer(doc: Doc) {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}

const contentWidth = (doc: Doc) => doc.page.width - M * 2;
const contentTop = M + 26;
const contentBottom = (doc: Doc) => doc.page.height - M - 18;

/* ── Layout state ──────────────────────────────────────────────────────── */

type Toc = { no: number; title: string; page: number }[];

class Layout {
  sectionNo = 0;
  toc: Toc = [];
  constructor(readonly doc: Doc) {}

  page() {
    return this.doc.bufferedPageRange().count;
  }

  newPage() {
    this.doc.addPage();
    this.doc.y = contentTop;
  }

  ensure(height: number) {
    if (this.doc.y + height > contentBottom(this.doc)) this.newPage();
  }

  section(title: string, options: { unit?: boolean; fresh?: boolean } = {}) {
    const doc = this.doc;
    if (options.fresh) this.newPage();
    else this.ensure(140);
    this.sectionNo += 1;
    this.toc.push({ no: this.sectionNo, title, page: this.page() });
    const w = contentWidth(doc);
    const top = doc.y + (doc.y > contentTop + 4 ? 16 : 0);
    doc.font(SANS_BOLD).fontSize(7.5).fillColor(ACCENT).text(`SECTION ${String(this.sectionNo).padStart(2, "0")}`, M, top, { width: w });
    doc.font(SANS_BOLD).fontSize(16).fillColor(INK).text(title, M, doc.y + 3, { width: w - 120 });
    const ruleY = doc.y + 6;
    doc.rect(M, ruleY, 28, 2).fill(ACCENT);
    if (options.unit) doc.font(SANS_ITALIC).fontSize(8).fillColor(MUTED).text("Amount in Rs. lakh", M, top + 14, { width: w, align: "right" });
    doc.y = ruleY + 16;
  }

  subhead(text: string, note?: string) {
    const doc = this.doc;
    this.ensure(80);
    const w = contentWidth(doc);
    const y = doc.y + 4;
    doc.font(SANS_BOLD).fontSize(9.5).fillColor(INK).text(text.toUpperCase(), M, y, { width: w });
    if (note) doc.font(SANS_ITALIC).fontSize(8).fillColor(MUTED).text(note, M, y + 1, { width: w, align: "right" });
    doc.y = y + 16;
  }

  para(text: string) {
    const doc = this.doc;
    const w = contentWidth(doc);
    for (const line of text.split(/\n+/).map((l) => l.trim()).filter(Boolean)) {
      this.ensure(34);
      const bullet = line.startsWith("•");
      const startY = doc.y;
      doc
        .font(SANS)
        .fontSize(10)
        .fillColor(BODY)
        .text(bullet ? line.slice(1).trim() : line, bullet ? M + 14 : M, doc.y, { width: bullet ? w - 14 : w, align: "justify", lineGap: 3.2 });
      if (bullet) doc.circle(M + 4, startY + 5.5, 1.6).fill(ACCENT);
      doc.moveDown(bullet ? 0.3 : 0.55);
    }
    doc.moveDown(0.2);
  }

  note(text: string) {
    this.ensure(30);
    this.doc.font(SANS_ITALIC).fontSize(8.5).fillColor(MUTED).text(text, M, this.doc.y, { width: contentWidth(this.doc), lineGap: 2 });
    this.doc.moveDown(0.8);
  }

  /** A row of figure tiles. */
  tiles(items: [string, string][]) {
    const doc = this.doc;
    this.ensure(62);
    const w = contentWidth(doc);
    const gap = 10;
    const tileW = (w - gap * (items.length - 1)) / items.length;
    const top = doc.y;
    items.forEach(([label, value], i) => {
      const x = M + i * (tileW + gap);
      doc.roundedRect(x, top, tileW, 44, 5).fill(ACCENT_SOFT);
      doc.font(SANS_BOLD).fontSize(6.8).fillColor(MUTED).text(label.toUpperCase(), x + 12, top + 9, { width: tileW - 24 });
      doc.font(SANS_BOLD).fontSize(13).fillColor(ACCENT).text(value, x + 12, top + 22, { width: tileW - 24 });
    });
    doc.y = top + 58;
  }

  /**
   * A minimal table: a dark rule under the header, hairlines between rows,
   * a faint band on alternate rows and a shaded, ruled total. Tables that
   * fit on a page are kept whole.
   */
  table(columns: Column[], rows: Row[], options: { size?: number } = {}) {
    const doc = this.doc;
    const size = options.size ?? 8.8;
    const w = contentWidth(doc);
    const totalWidth = columns.reduce((sum, c) => sum + c.width, 0);
    const cols = columns.map((c) => ({ ...c, w: (c.width / totalWidth) * w }));
    const padY = 5;
    const measure = (cells: string[], font: string, s: number) => {
      doc.font(font).fontSize(s);
      return Math.max(...cells.map((cell, i) => doc.heightOfString(cell || " ", { width: cols[i].w - 10 }))) + padY * 2;
    };
    const header = () => {
      const labels = cols.map((c) => c.label.toUpperCase());
      const h = measure(labels, SANS_BOLD, size - 1.3);
      const top = doc.y;
      let x = M;
      cols.forEach((c, i) => {
        doc.font(SANS_BOLD).fontSize(size - 1.3).fillColor(MUTED).text(labels[i], x + 5, top + padY, { width: c.w - 10, align: c.align ?? "left" });
        x += c.w;
      });
      doc.moveTo(M, top + h).lineTo(M + w, top + h).lineWidth(0.9).strokeColor(INK).stroke();
      doc.y = top + h;
    };

    const heights = rows.map((r) => measure(r.cells, r.total ? SANS_BOLD : SANS, size));
    const total = heights.reduce((a, b) => a + b, 0) + 26;
    if (total < contentBottom(doc) - contentTop) this.ensure(total + 8);
    else this.ensure(80);
    header();
    rows.forEach((row, index) => {
      const h = heights[index];
      if (doc.y + h > contentBottom(doc)) {
        this.newPage();
        header();
      }
      const top = doc.y;
      if (row.total) {
        doc.rect(M, top, w, h).fill(ACCENT_SOFT);
        doc.moveTo(M, top).lineTo(M + w, top).lineWidth(0.8).strokeColor(INK).stroke();
      } else if (index % 2 === 1) {
        doc.rect(M, top, w, h).fill(ZEBRA);
      }
      let x = M;
      row.cells.forEach((cell, i) => {
        doc.font(row.total ? SANS_BOLD : SANS).fontSize(size).fillColor(row.total ? INK : row.muted ? MUTED : BODY).text(cell, x + 5, top + padY, { width: cols[i].w - 10, align: cols[i].align ?? "left" });
        x += cols[i].w;
      });
      if (!row.total) doc.moveTo(M, top + h).lineTo(M + w, top + h).lineWidth(0.4).strokeColor(HAIRLINE).stroke();
      doc.y = top + h;
    });
    doc.y += 14;
  }
}

/** Year columns: label column then one per year. */
function yearCols(report: DprReport, first: string, sub?: (index: number) => string): Column[] {
  return [{ label: first, width: 34 }, ...report.years.map((_, i) => ({ label: `${roman(i)}${sub ? ` · ${sub(i)}` : ""}`, width: 13, align: "right" as Align }))];
}

const yearRow = (report: DprReport, label: string, pick: (index: number) => number, extra: Partial<Row> = {}): Row => ({
  cells: [label, ...report.years.map((_, i) => L(pick(i)))],
  ...extra,
});

function schemeLabel(input: DprInput) {
  if (input.scheme === "none") return "Bank finance (no government scheme)";
  return SCHEME_OPTIONS.find((s) => s.value === input.scheme)?.label ?? "Government scheme";
}

/* ─────────────────────────────────────────────────────────────────────────
   Pages
   ───────────────────────────────────────────────────────────────────────── */

function cover(doc: Doc, record: ProjectReportRecord, report: DprReport) {
  const input = record.input;
  const w = contentWidth(doc);
  const H = doc.page.height;

  doc.rect(0, 0, 10, H).fill(ACCENT);
  doc.font(SANS_BOLD).fontSize(8).fillColor(MUTED).text("DIGICONNECT DUKAN  ·  RNOS INDIA PVT. LTD.", M, M, { width: w });
  doc.font(SANS).fontSize(8).fillColor(MUTED).text(record.reference, M, M, { width: w, align: "right" });

  doc.font(SANS_BOLD).fontSize(10).fillColor(ACCENT).text("DETAILED PROJECT REPORT", M, 180, { width: w });
  doc.font(SANS_BOLD).fontSize(30).fillColor(INK).text(input.businessName, M, doc.y + 12, { width: w, lineGap: 2 });
  if (input.activity) doc.font(SANS).fontSize(13).fillColor(BODY).text(input.activity.charAt(0).toUpperCase() + input.activity.slice(1), M, doc.y + 8, { width: w * 0.85 });
  doc.rect(M, doc.y + 22, 44, 2.5).fill(ACCENT);

  const top = doc.y + 52;
  const gap = 12;
  const cardW = (w - gap * 2) / 3;
  const cards: [string, string, string][] = [
    ["Cost of project", `Rs. ${L(report.cost.total)} lakh`, "Fixed capital + working capital"],
    ["Bank finance", `Rs. ${L(report.means.bankLoan)} lakh`, report.mudraCategory ? `Mudra · ${report.mudraCategory}` : "Term loan + working capital"],
    ["Average DSCR", ratio(report.averageDscr), report.breakEven?.bepCapacityPct != null ? `Break-even at ${report.breakEven.bepCapacityPct.toFixed(1)}% capacity` : "Debt service coverage"],
  ];
  cards.forEach(([label, value, sub], i) => {
    const x = M + i * (cardW + gap);
    doc.roundedRect(x, top, cardW, 84, 6).lineWidth(0.8).strokeColor(HAIRLINE).stroke();
    doc.font(SANS_BOLD).fontSize(7).fillColor(MUTED).text(label.toUpperCase(), x + 14, top + 14, { width: cardW - 28 });
    doc.font(SANS_BOLD).fontSize(17).fillColor(INK).text(value, x + 14, top + 32, { width: cardW - 28 });
    doc.font(SANS).fontSize(7.5).fillColor(MUTED).text(sub, x + 14, top + 60, { width: cardW - 28 });
  });

  let y = top + 124;
  const facts: [string, string][] = [
    ["Promoter", input.promoters.map((p) => p.name).filter(Boolean).join(", ")],
    ["Constitution", CONSTITUTIONS.find((c) => c.value === input.constitution)?.label ?? ""],
    ["Location", [input.address, input.district, input.state, input.pincode].filter(Boolean).join(", ")],
    ["Scheme", schemeLabel(input)],
    ["Submitted to", [input.bankName, input.bankBranch].filter(Boolean).join(", ")],
  ];
  for (const [label, value] of facts) {
    if (!value) continue;
    doc.font(SANS_BOLD).fontSize(7.5).fillColor(MUTED).text(label.toUpperCase(), M, y, { width: 110 });
    doc.font(SANS).fontSize(10.5).fillColor(INK).text(value, M + 120, y - 1.5, { width: w - 120 });
    y = Math.max(doc.y, y + 14) + 10;
    doc.moveTo(M, y - 5).lineTo(M + w, y - 5).lineWidth(0.4).strokeColor(HAIRLINE).stroke();
  }
  doc.font(SANS).fontSize(8).fillColor(MUTED).text(`Prepared on ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`, M, H - M - 10, { width: w });
}

function contents(doc: Doc, toc: Toc) {
  doc.y = contentTop;
  const w = contentWidth(doc);
  doc.font(SANS_BOLD).fontSize(7.5).fillColor(ACCENT).text("CONTENTS", M, doc.y, { width: w });
  doc.font(SANS_BOLD).fontSize(16).fillColor(INK).text("Table of Contents", M, doc.y + 3);
  doc.rect(M, doc.y + 6, 28, 2).fill(ACCENT);
  let y = doc.y + 24;
  for (const entry of toc) {
    doc.font(SANS_BOLD).fontSize(9).fillColor(ACCENT).text(String(entry.no).padStart(2, "0"), M, y, { width: 26 });
    doc.font(SANS).fontSize(10.5).fillColor(INK).text(entry.title, M + 30, y - 1, { width: w - 90 });
    doc.font(SANS_BOLD).fontSize(10).fillColor(INK).text(String(entry.page), M, y - 1, { width: w, align: "right" });
    y += 22;
    doc.moveTo(M + 30, y - 6).lineTo(M + w, y - 6).lineWidth(0.4).strokeColor(HAIRLINE).stroke();
  }
}

function summary(lay: Layout, text: Record<NarrativeKey, string>, report: DprReport) {
  lay.section("Executive Summary", { fresh: true });
  lay.tiles([
    ["Cost of project", `Rs. ${L(report.cost.total)} lakh`],
    ["Bank loan", `Rs. ${L(report.means.bankLoan)} lakh`],
    ["Subsidy", report.means.subsidy > 0 ? `Rs. ${L(report.means.subsidy)} lakh` : "-"],
  ]);
  lay.tiles([
    ["Sales in year I", `Rs. ${L(report.years[0]?.sales ?? 0)} lakh`],
    ["Average DSCR", ratio(report.averageDscr)],
    ["Break-even", pct(report.breakEven?.bepCapacityPct ?? null, 1)],
  ]);
  lay.para(text.summary);
}

function glance(lay: Layout, input: DprInput, report: DprReport) {
  const doc = lay.doc;
  lay.section("Project at a Glance", { fresh: true });
  const constitution = CONSTITUTIONS.find((c) => c.value === input.constitution)?.label ?? "-";
  const lead = input.promoters.find((p) => p.name.trim());
  const staff = input.staff.reduce((s, r) => s + (r.count || 0), 0);
  const avgUtil = report.years.length ? report.years.reduce((s, y) => s + y.utilisationPct, 0) / report.years.length : 0;
  const ratios = report.years.map((y) => y.currentRatio).filter((v): v is number => v !== null);
  const avgCurrent = ratios.length ? ratios.reduce((a, b) => a + b, 0) / ratios.length : null;
  const items: [string, string][] = [
    ["Name of the concern", input.businessName],
    ["Promoter", lead ? `${lead.name}${lead.fatherName ? `, S/o / D/o / W/o ${lead.fatherName}` : ""}` : "-"],
    ["Constitution", constitution],
    ["Year of establishment", `${input.startFy} (proposed)`],
    ["Unit location", [input.address, input.district, input.state, input.pincode].filter(Boolean).join(", ")],
    ["Product(s) / service(s)", input.products.map((p) => p.name).filter(Boolean).join(", ") || input.activity],
    ["Nature of project", "New project"],
    ["Premises", input.premises === "owned" ? "Own" : input.premises === "rented" ? "Rented" : "Leased"],
    ["Proposed capacity utilisation", `Average ${avgUtil.toFixed(0)}% (${report.years[0]?.utilisationPct ?? 0}% in year I)`],
    ["Total cost of project", `Rs. ${L(report.cost.total)} lakh`],
    ["Promoter's contribution", `Rs. ${L(report.means.ownContribution)} lakh (${pct(report.means.ownContributionPct, 0)})`],
    ["Term loan", `Rs. ${L(report.means.termLoan)} lakh`],
    ["Working capital (cash credit)", report.means.ccLimit > 0 ? `Rs. ${L(report.means.ccLimit)} lakh` : "-"],
    ["Scheme", schemeLabel(input)],
    ["Government subsidy", report.means.subsidy > 0 ? `Rs. ${L(report.means.subsidy)} lakh${report.scheme ? ` (${report.scheme.subsidyPct}% under ${report.scheme.label})` : ""}` : "-"],
    ["Technical know-how", "Standard, proven technology; available locally"],
    ["Major raw materials", input.rawMaterials.map((m) => m.name).filter(Boolean).join(", ") || "Not applicable"],
    ["Average DSCR", ratio(report.averageDscr)],
    ["Average current ratio", ratio(avgCurrent === null ? null : Math.round(avgCurrent * 100) / 100)],
    ["Break-even point", pct(report.breakEven?.bepCapacityPct ?? null, 1)],
    ["Employment", staff ? `${staff} persons` : "-"],
  ];
  const w = contentWidth(doc);
  items.forEach(([label, value], index) => {
    lay.ensure(24);
    const y = doc.y;
    if (index % 2 === 0) doc.rect(M, y, w, 21).fill(ZEBRA);
    doc.font(SANS_BOLD).fontSize(8).fillColor(ACCENT).text(String(index + 1).padStart(2, "0"), M + 8, y + 6.5, { width: 20 });
    doc.font(SANS).fontSize(9.2).fillColor(MUTED).text(label, M + 34, y + 6, { width: w * 0.36 });
    doc.font(SANS_BOLD).fontSize(9.2).fillColor(INK).text(value || "-", M + 34 + w * 0.38, y + 6, { width: w * 0.62 - 44 });
    doc.y = Math.max(doc.y + 6, y + 21);
  });
}

function textSection(lay: Layout, title: string, text: Record<NarrativeKey, string>, keys: NarrativeKey[], after?: Partial<Record<NarrativeKey, () => void>>) {
  lay.section(title, { fresh: true });
  for (const key of keys) {
    lay.subhead(NARRATIVE_TITLES[key]);
    lay.para(text[key]);
    after?.[key]?.();
  }
}

function promoterTable(lay: Layout, input: DprInput) {
  const promoters = input.promoters.filter((p) => p.name.trim());
  if (!promoters.length) return;
  lay.table(
    [
      { label: "Name", width: 20 },
      { label: "Father / husband", width: 17 },
      { label: "Age", width: 7, align: "right" },
      { label: "Category", width: 11 },
      { label: "Qualification", width: 18 },
      { label: "Experience", width: 27 },
    ],
    promoters.map((p) => ({ cells: [p.name, p.fatherName || "-", p.age ? String(p.age) : "-", p.socialCategory || "-", p.qualification || "-", p.experience || "-"] })),
  );
}

function machineryTable(lay: Layout, input: DprInput) {
  const items = input.capitalItems.filter((i) => itemAmount(i) > 0 && !["land", "preliminary"].includes(i.kind));
  if (!items.length) return;
  lay.table(
    [{ label: "#", width: 5 }, { label: "Machinery / equipment", width: 45 }, { label: "Qty", width: 8, align: "right" }, { label: "Rate (Rs.)", width: 18, align: "right" }, { label: "Amount (Rs.)", width: 24, align: "right" }],
    [
      ...items.map((item, i) => ({ cells: [String(i + 1), item.description, String(item.quantity), rupees(item.rate), rupees(itemAmount(item))] })),
      { cells: ["", "Total", "", "", rupees(items.reduce((s, i) => s + itemAmount(i), 0))], total: true },
    ],
  );
}

function costAndMeans(lay: Layout, input: DprInput, report: DprReport) {
  lay.section("Cost of Project and Means of Finance", { fresh: true, unit: true });
  lay.subhead("Cost of Project");
  const items = input.capitalItems.filter((item) => itemAmount(item) > 0 && (item.kind !== "land" || input.includeLand));
  const rows: Row[] = items.map((item, i) => ({ cells: [String(i + 1), item.description, assetLabel(item.kind), String(item.quantity), rupees(item.rate), L(itemAmount(item))] }));
  if (!input.includeLand && report.cost.land > 0) rows.unshift({ cells: ["-", "Land / building", "Land", "-", "-", "Own"], muted: true });
  rows.push({ cells: [String(items.length + 1), "Working capital requirement (one operating cycle)", "Working capital", "-", "-", L(report.cost.workingCapital)] });
  rows.push({ cells: ["", "Total cost of project", "", "", "", L(report.cost.total)], total: true });
  lay.table([{ label: "#", width: 5 }, { label: "Item", width: 37 }, { label: "Head", width: 20 }, { label: "Qty", width: 7, align: "right" }, { label: "Rate (Rs.)", width: 15, align: "right" }, { label: "Amount", width: 16, align: "right" }], rows);
  if (report.cost.landOutside > 0) lay.note(`Land / premises (Rs. ${L(report.cost.landOutside)} lakh) is the promoter's own and is not included in the cost of project.`);

  lay.subhead("Means of Finance", "Amount in Rs. lakh");
  const m = report.means;
  const share = (v: number) => (report.cost.total > 0 ? pct((v / report.cost.total) * 100, 1) : "-");
  lay.table(
    [{ label: "#", width: 5 }, { label: "Particulars", width: 55 }, { label: "Amount", width: 20, align: "right" }, { label: "Share", width: 20, align: "right" }],
    [
      { cells: ["1", "Promoter's own contribution", L(m.ownContribution), share(m.ownContribution)] },
      { cells: ["2", "Bank loan — term loan", L(m.termLoan), share(m.termLoan)] },
      ...(m.ccLimit > 0 ? [{ cells: ["3", "Bank loan — working capital (cash credit)", L(m.ccLimit), share(m.ccLimit)] }] : []),
      { cells: ["", "Total means of finance", L(m.total), share(m.total)], total: true },
    ],
  );
  if (m.subsidy > 0) lay.note(`Margin money subsidy of Rs. ${L(m.subsidy)} lakh is expected under ${report.scheme?.label ?? "the scheme"}. It is back-ended: the bank keeps it as a term deposit during the lock-in period and then adjusts it against the loan.`);

  lay.subhead("Assessment of Working Capital", "Amount in Rs. lakh");
  const wc = report.workingCapital;
  lay.table(
    [{ label: "Particulars", width: 60 }, { label: "Holding period", width: 20, align: "right" }, { label: "Amount", width: 20, align: "right" }],
    [
      { cells: ["Raw material stock", `${input.rawMaterialDays} days`, L(wc.rawMaterialStock)] },
      { cells: ["Finished goods / work in progress", `${input.finishedGoodsDays} days`, L(wc.finishedGoods)] },
      { cells: ["Receivables (sundry debtors)", `${input.debtorDays} days`, L(wc.debtors)] },
      { cells: ["Less: credit from suppliers", `${input.creditorDays} days`, `(${L(wc.creditors)})`] },
      { cells: ["Working capital requirement", "", L(wc.requirement)], total: true },
    ],
  );
}

function salaryRepaymentDepreciation(lay: Layout, input: DprInput, report: DprReport) {
  lay.section("Salary, Loan Repayment and Depreciation", { fresh: true, unit: true });
  if (input.staff.length) {
    lay.subhead("Calculation of Estimated Salary");
    const totalYear = input.staff.reduce((s, r) => s + r.count * r.monthlySalary * 12, 0);
    lay.table(
      [{ label: "Particulars", width: 40 }, { label: "Type", width: 14 }, { label: "No.", width: 10, align: "right" }, { label: "Salary / month (Rs.)", width: 18, align: "right" }, { label: "Annual (Rs.)", width: 18, align: "right" }],
      [
        ...input.staff.map((s) => ({ cells: [s.role, s.direct ? "Direct" : "Indirect", String(s.count), rupees(s.monthlySalary), rupees(s.count * s.monthlySalary * 12)] })),
        { cells: ["Total salary", "", String(input.staff.reduce((t, s) => t + s.count, 0)), "", rupees(totalYear)], total: true },
      ],
    );
    lay.note(`Assuming ${input.costGrowthPct}% increase every year on account of increments and benefits, salaries would be as under.`);
    lay.table(yearCols(report, "Year"), [yearRow(report, "Salary and wages (Rs. lakh)", (i) => report.years[i].directWages + report.years[i].indirectSalaries, { total: true })]);
  }

  lay.subhead("Term Loan Repayment Schedule", `@ ${input.termLoanInterestPct}% p.a.`);
  const rp = report.repayment;
  lay.table(
    [{ label: "Year", width: 34 }, ...rp.map((_, i) => ({ label: roman(i), width: 13, align: "right" as Align }))],
    [
      { cells: ["Loan outstanding (opening)", ...rp.map((r) => L(r.opening))] },
      { cells: [`Interest @ ${input.termLoanInterestPct}%`, ...rp.map((r) => L(r.interest))] },
      { cells: ["Principal repaid", ...rp.map((r) => L(r.principal))] },
      { cells: ["Total instalment", ...rp.map((r) => L(r.interest + r.principal))] },
      { cells: ["Balance (closing)", ...rp.map((r) => L(r.closing))], total: true },
    ],
  );
  lay.note(`Term loan of Rs. ${L(report.means.termLoan)} lakh repayable over ${input.tenureYears} years including a moratorium of ${input.moratoriumMonths} months, in equal monthly instalments of principal; interest on the reducing balance. The month-wise schedule is at the annexure.`);

  lay.subhead("Calculation of Depreciation of Fixed Assets", "Written down value method");
  lay.table(
    [{ label: "Particulars", width: 26 }, { label: "Rate", width: 8, align: "right" }, { label: "Cost", width: 11, align: "right" }, ...report.years.map((_, i) => ({ label: roman(i), width: 11, align: "right" as Align }))],
    [
      ...report.depreciation.map((d) => ({ cells: [d.label, `${d.ratePct}%`, L(d.cost), ...d.perYear.map(L)] })),
      { cells: ["Total", "", L(report.depreciation.reduce((s, d) => s + d.cost, 0)), ...report.years.map((y) => L(y.depreciation))], total: true },
    ],
  );
}

function materialsAndSales(lay: Layout, input: DprInput, report: DprReport) {
  lay.section("Raw Material, Sales and Running Costs", { fresh: true });
  if (input.rawMaterials.length) {
    lay.subhead("Raw Materials & Consumables", "At 100% capacity");
    const total = input.rawMaterials.reduce((s, m) => s + m.quantity * m.rate, 0);
    lay.table(
      [{ label: "#", width: 5 }, { label: "Particulars", width: 35 }, { label: "Quantity", width: 18, align: "right" }, { label: "Rate (Rs.)", width: 18, align: "right" }, { label: "Value (Rs. lakh)", width: 24, align: "right" }],
      [
        ...input.rawMaterials.map((m, i) => ({ cells: [String(i + 1), m.name, `${m.quantity.toLocaleString("en-IN")}${m.unit ? ` ${m.unit}` : ""}`, rupees(m.rate), L(m.quantity * m.rate)] })),
        { cells: ["", "Total", "", "", L(total)], total: true },
      ],
    );
    lay.table(yearCols(report, "Consumption", (i) => `${report.years[i].utilisationPct}%`), [yearRow(report, "Raw material (Rs. lakh)", (i) => report.years[i].rawMaterial, { total: true })]);
  }

  lay.subhead("Sales", "At 100% capacity");
  lay.table(
    [{ label: "#", width: 5 }, { label: "Product / service", width: 35 }, { label: "Quantity", width: 18, align: "right" }, { label: "Rate (Rs.)", width: 18, align: "right" }, { label: "Amount (Rs.)", width: 24, align: "right" }],
    [
      ...input.products.map((p, i) => ({ cells: [String(i + 1), p.name, `${p.capacity.toLocaleString("en-IN")}${p.unit ? ` ${p.unit}` : ""}`, rupees(p.price), rupees(p.capacity * p.price)] })),
      { cells: ["", `Total — or say Rs. ${L(report.installedCapacityValue)} lakh`, "", "", rupees(report.installedCapacityValue)], total: true },
    ],
  );
  lay.table(yearCols(report, "Sales", (i) => `${report.years[i].utilisationPct}%`), [yearRow(report, "Sales (Rs. lakh)", (i) => report.years[i].sales, { total: true })]);

  if (input.overheads.some((o) => o.monthly > 0)) {
    lay.subhead("Utilities and Overheads", "Per month, at full capacity");
    lay.table(
      [{ label: "Expense", width: 46 }, { label: "Nature", width: 30 }, { label: "Per month (Rs.)", width: 24, align: "right" }],
      input.overheads.filter((o) => o.monthly > 0).map((o) => ({ cells: [o.name, `${o.direct ? "Direct" : "Indirect"} · ${o.variable ? "varies with output" : "fixed"}`, rupees(o.monthly)] })),
    );
  }
}

function profitability(lay: Layout, report: DprReport) {
  lay.section("Cost of Production and Profitability", { fresh: true, unit: true });
  const y = report.years;
  lay.table(
    yearCols(report, "Particulars"),
    [
      { cells: ["Capacity utilisation", ...y.map((r) => `${r.utilisationPct}%`)], muted: true },
      yearRow(report, "[A] Sales", (i) => y[i].sales, { total: true }),
      yearRow(report, "Raw material consumed", (i) => y[i].rawMaterial),
      yearRow(report, "Direct wages", (i) => y[i].directWages),
      yearRow(report, "Power and direct expenses", (i) => y[i].directOverheads),
      yearRow(report, "[B] Cost of production", (i) => y[i].costOfProduction, { total: true }),
      yearRow(report, "Gross profit [A - B]", (i) => y[i].grossProfit, { total: true }),
      yearRow(report, "Salaries (indirect staff)", (i) => y[i].indirectSalaries),
      yearRow(report, "Administrative and selling expenses", (i) => y[i].indirectOverheads),
      yearRow(report, "Interest on term loan", (i) => y[i].termLoanInterest),
      yearRow(report, "Interest on working capital", (i) => y[i].ccInterest),
      ...(y.some((r) => r.interestSubvention > 0) ? [yearRow(report, "Less: interest subvention", (i) => -y[i].interestSubvention)] : []),
      yearRow(report, "Depreciation", (i) => y[i].depreciation),
      ...(y.some((r) => r.preliminaryWrittenOff > 0) ? [yearRow(report, "Preliminary expenses written off", (i) => y[i].preliminaryWrittenOff)] : []),
      yearRow(report, "Profit before tax", (i) => y[i].profitBeforeTax, { total: true }),
      yearRow(report, "Less: income tax", (i) => y[i].tax),
      yearRow(report, "Profit after tax", (i) => y[i].netProfit, { total: true }),
      yearRow(report, "Add: depreciation and write-off", (i) => y[i].depreciation + y[i].preliminaryWrittenOff),
      yearRow(report, "Cash accruals", (i) => y[i].cashAccrual, { total: true }),
    ],
    { size: 8.6 },
  );
}

function balanceSheet(lay: Layout, report: DprReport) {
  lay.section("Projected Balance Sheet", { fresh: true, unit: true });
  const y = report.years;
  const subsidy = y.some((r) => r.subsidyReserve > 0);
  lay.subhead("Liabilities");
  lay.table(
    yearCols(report, "Particulars"),
    [
      yearRow(report, "Capital (with profit, less drawings)", (i) => y[i].capital),
      ...(subsidy ? [yearRow(report, "Government subsidy (reserve)", (i) => y[i].subsidyReserve)] : []),
      yearRow(report, "Term loan", (i) => y[i].termLoanOutstanding),
      ...(y.some((r) => r.ccLoan > 0) ? [yearRow(report, "Cash credit (working capital)", (i) => y[i].ccLoan)] : []),
      yearRow(report, "Sundry creditors", (i) => y[i].creditors),
      yearRow(report, "Total liabilities", (i) => y[i].totalLiabilities, { total: true }),
    ],
    { size: 8.6 },
  );
  lay.subhead("Assets");
  lay.table(
    yearCols(report, "Particulars"),
    [
      yearRow(report, "Net block (fixed assets)", (i) => y[i].netFixedAssets),
      ...(y.some((r) => r.preliminaryUnamortised > 0) ? [yearRow(report, "Preliminary expenses (not written off)", (i) => y[i].preliminaryUnamortised)] : []),
      yearRow(report, "Stock", (i) => y[i].stock),
      yearRow(report, "Sundry debtors", (i) => y[i].debtorsBalance),
      ...(subsidy ? [yearRow(report, "Government subsidy (held by bank)", (i) => y[i].subsidyDeposit)] : []),
      yearRow(report, "Cash and bank balance", (i) => y[i].cash),
      yearRow(report, "Total assets", (i) => y[i].totalAssets, { total: true }),
    ],
    { size: 8.6 },
  );
}

function cashFlow(lay: Layout, input: DprInput, report: DprReport) {
  lay.section("Cash Flow Statement", { fresh: true, unit: true });
  const cf = report.cashFlow;
  const row = (label: string, pick: (i: number) => number, extra: Partial<Row> = {}): Row => ({ cells: [label, ...cf.map((_, i) => L(pick(i)))], ...extra });
  lay.subhead("A. Sources of funds");
  lay.table(
    yearCols(report, "Particulars"),
    [
      row("Opening cash and bank balance", (i) => cf[i].openingCash),
      row("Net profit after tax", (i) => cf[i].netProfit),
      row("Depreciation and write-off", (i) => cf[i].depreciation),
      row("Increase in sundry creditors", (i) => cf[i].increaseInCreditors),
      row("Total inflow", (i) => cf[i].openingCash + cf[i].totalInflow, { total: true }),
    ],
    { size: 8.6 },
  );
  lay.subhead("B. Uses of funds");
  lay.table(
    yearCols(report, "Particulars"),
    [
      row("Term loan repayment", (i) => cf[i].principalRepaid),
      ...(input.drawingsPerYear > 0 ? [row("Drawings", (i) => cf[i].drawings)] : []),
      row("Increase in stock", (i) => cf[i].increaseInStock),
      row("Increase in sundry debtors", (i) => cf[i].increaseInDebtors),
      row("Total outflow", (i) => cf[i].totalOutflow, { total: true }),
    ],
    { size: 8.6 },
  );
  lay.table(yearCols(report, "Closing position"), [row("Closing cash and bank balance", (i) => cf[i].closingCash, { total: true })], { size: 8.6 });
}

function ratios(lay: Layout, report: DprReport) {
  lay.section("Debt Service Coverage and Current Ratio", { fresh: true, unit: true });
  const y = report.years;
  lay.subhead("Calculation of Debt Service Coverage Ratio");
  lay.table(
    yearCols(report, "Year ending"),
    [
      yearRow(report, "Cash accruals", (i) => y[i].cashAccrual),
      yearRow(report, "Add: interest on term loan", (i) => y[i].termLoanInterest),
      yearRow(report, "A. Total pre-interest accruals", (i) => y[i].cashAccrual + y[i].termLoanInterest, { total: true }),
      yearRow(report, "Interest on term loan", (i) => y[i].termLoanInterest),
      yearRow(report, "Loan repayment", (i) => y[i].principalRepaid),
      yearRow(report, "B. Total debt servicing", (i) => y[i].termLoanInterest + y[i].principalRepaid, { total: true }),
      { cells: ["DSCR (A / B)", ...y.map((r) => ratio(r.dscr))], total: true },
    ],
    { size: 8.6 },
  );
  lay.tiles([
    ["Average DSCR", ratio(report.averageDscr)],
    ["Minimum DSCR", ratio(report.minimumDscr)],
    ["Payback period", report.paybackYears === null ? "-" : `${report.paybackYears.toFixed(1)} years`],
  ]);

  lay.subhead("Calculation of Current Ratio");
  const ca = (i: number) => y[i].stock + y[i].debtorsBalance + Math.max(0, y[i].cash);
  const cl = (i: number) => y[i].creditors + y[i].ccLoan;
  lay.table(
    yearCols(report, "Year ending"),
    [
      yearRow(report, "Stock", (i) => y[i].stock),
      yearRow(report, "Sundry debtors", (i) => y[i].debtorsBalance),
      yearRow(report, "Cash and bank", (i) => Math.max(0, y[i].cash)),
      yearRow(report, "A. Total current assets", ca, { total: true }),
      yearRow(report, "Sundry creditors", (i) => y[i].creditors),
      ...(y.some((r) => r.ccLoan > 0) ? [yearRow(report, "Cash credit", (i) => y[i].ccLoan)] : []),
      yearRow(report, "B. Total current liabilities", cl, { total: true }),
      { cells: ["Current ratio (A / B)", ...y.map((r) => ratio(r.currentRatio))], total: true },
    ],
    { size: 8.6 },
  );
  const crs = y.map((r) => r.currentRatio).filter((v): v is number => v !== null);
  lay.tiles([["Average current ratio", crs.length ? (crs.reduce((a, b) => a + b, 0) / crs.length).toFixed(2) : "-"]]);
}

function analysis(lay: Layout, input: DprInput, report: DprReport) {
  lay.section("Break-even, Key Ratios and Sensitivity", { fresh: true });
  const b = report.breakEven;
  if (b) {
    lay.subhead(`Break-even Analysis — Year ${roman(report.years.findIndex((y) => y.fyStart === b.fyStart))}`, "Amount in Rs. lakh");
    lay.table(
      [{ label: "Particulars", width: 70 }, { label: "Amount", width: 30, align: "right" }],
      [
        { cells: ["Sales", L(report.years.find((y) => y.fyStart === b.fyStart)?.sales ?? 0)] },
        { cells: ["Variable costs (raw material, variable expenses)", L(b.variableCosts)] },
        { cells: ["Contribution", L(b.contribution)] },
        { cells: ["Fixed costs (wages, salaries, fixed overheads, interest, depreciation)", L(b.fixedCosts)] },
        { cells: ["Break-even sales", L(b.bepSales)], total: true },
      ],
    );
    lay.tiles([
      ["Break-even point", pct(b.bepCapacityPct, 2)],
      ["Cash break-even point", pct(b.cashBepCapacityPct, 2)],
    ]);
  }

  lay.subhead("Key Financial Ratios");
  const y = report.years;
  lay.table(yearCols(report, "Ratio"), [
    { cells: ["Gross profit margin", ...y.map((r) => (r.sales > 0 ? pct((r.grossProfit / r.sales) * 100) : "-"))] },
    { cells: ["Net profit margin", ...y.map((r) => (r.sales > 0 ? pct((r.netProfit / r.sales) * 100) : "-"))] },
    { cells: ["Return on capital employed", ...y.map((r) => { const ce = r.capital + r.termLoanOutstanding + r.ccLoan; return ce > 0 ? pct(((r.profitBeforeTax + r.termLoanInterest + r.ccInterest) / ce) * 100) : "-"; })] },
    { cells: ["Debt-equity ratio", ...y.map((r) => (r.capital > 0 ? ratio((r.termLoanOutstanding + r.ccLoan) / r.capital) : "-"))] },
    { cells: ["Current ratio", ...y.map((r) => ratio(r.currentRatio))] },
    { cells: ["DSCR", ...y.map((r) => ratio(r.dscr))] },
  ]);

  lay.subhead("Sensitivity Analysis");
  const cases = sensitivityOf(input);
  lay.table(
    [{ label: "Scenario", width: 40 }, { label: "Avg DSCR", width: 15, align: "right" }, { label: "Min DSCR", width: 15, align: "right" }, { label: "Year I profit (lakh)", width: 15, align: "right" }, { label: "Break-even", width: 15, align: "right" }],
    cases.map((c, i) => ({ cells: [c.label, ratio(c.averageDscr), ratio(c.minimumDscr), L(c.firstYearProfit), c.breakEvenPct !== null && c.breakEvenPct > 100 ? "Above 100%" : pct(c.breakEvenPct, 1)], total: i === 0 })),
  );
  const worst = cases.at(-1);
  lay.note(
    worst && worst.averageDscr !== null && worst.averageDscr >= 1.25
      ? "Even with lower volumes and higher running costs together, the project continues to service its debt comfortably."
      : "The project is sensitive to a combined fall in volumes and rise in costs; the promoter will watch sales and running costs closely.",
  );
}

function annexures(lay: Layout, input: DprInput, report: DprReport) {
  lay.section("Annexure A — Month-wise Repayment Schedule", { fresh: true });
  const rows = monthlySchedule(input, report.means.termLoan);
  lay.note(`Term loan Rs. ${rupees(report.means.termLoan)} at ${input.termLoanInterestPct}% p.a.; moratorium ${input.moratoriumMonths} months; amounts in rupees.`);
  lay.table(
    [{ label: "Month", width: 10, align: "right" }, { label: "Opening balance", width: 22, align: "right" }, { label: "Interest", width: 17, align: "right" }, { label: "Principal", width: 17, align: "right" }, { label: "Instalment", width: 17, align: "right" }, { label: "Closing balance", width: 22, align: "right" }],
    rows.map((r) => ({ cells: [String(r.month), rupees(r.opening), rupees(r.interest), rupees(r.principal), rupees(r.instalment), rupees(r.closing)] })),
    { size: 7.8 },
  );

  lay.section("Annexure B — Basis of Projections", { fresh: true });
  const rates = [...new Set(input.capitalItems.filter((i) => !["land", "preliminary"].includes(i.kind)).map((i) => i.kind))]
    .map((kind) => `${assetLabel(kind)} ${input.depreciationRates[kind] ?? defaultDepreciationRate(kind)}%`)
    .join(", ");
  lay.para(
    [
      `• The projections cover ${report.years.length} years from ${fyLabel(input.startFy)}, the first year of commercial operation.`,
      `• Capacity utilisation is taken at ${input.utilisationPct.slice(0, report.years.length).join("%, ")}% in successive years.`,
      `• Selling prices ${input.priceGrowthPct ? `increase by ${input.priceGrowthPct}% a year` : "are held constant"}, and raw material rates move with them.`,
      `• Salaries and overheads increase by ${input.costGrowthPct}% a year; running costs that vary with output are taken in proportion to utilisation.`,
      `• Working capital: raw material ${input.rawMaterialDays} days, finished goods ${input.finishedGoodsDays} days, debtors ${input.debtorDays} days, supplier credit ${input.creditorDays} days.`,
      `• Term loan interest ${input.termLoanInterestPct}% and working capital interest ${input.ccInterestPct}% per annum; tenure ${input.tenureYears} years including ${input.moratoriumMonths} months' moratorium.`,
      `• Depreciation on the written down value method: ${rates || "as applicable"}. Preliminary expenses are written off over ${input.preliminaryWriteOffYears} years.`,
      `• Income tax is taken at ${input.taxPct}% of profit${input.taxPct === 0 ? " (income within the exempt limit / to be computed as applicable)" : ""}. GST is not included in sales or costs as it is a pass-through.`,
      `• All figures are estimates based on current market rates and the promoter's information; actual results may vary.`,
    ].join("\n"),
  );
}

function declaration(lay: Layout, input: DprInput) {
  const doc = lay.doc;
  lay.ensure(170);
  lay.subhead("Declaration");
  lay.para(
    "I / We hereby declare that the information given in this project report is true and correct to the best of my / our knowledge and belief, and that the projections are based on reasonable assumptions of capacity utilisation, prices and costs. I / We undertake to bring in the promoter's contribution and to use the loan only for the purpose stated.",
  );
  const w = contentWidth(doc);
  const y = doc.y + 40;
  const name = input.promoters.find((p) => p.name.trim())?.name ?? "";
  doc.font(SANS).fontSize(9).fillColor(BODY).text(`Place: ${input.district || "____________"}`, M, y, { width: w / 2 });
  doc.text("Date: ____________", M, y + 16, { width: w / 2 });
  doc.moveTo(M + w - 190, y + 10).lineTo(M + w, y + 10).lineWidth(0.6).strokeColor(INK).stroke();
  doc.font(SANS_BOLD).fontSize(9.5).fillColor(INK).text(name || "Signature of promoter", M + w - 190, y + 16, { width: 190, align: "center" });
  doc.font(SANS).fontSize(8).fillColor(MUTED).text(`For ${input.businessName}`, M + w - 190, doc.y + 2, { width: 190, align: "center" });
}

function decorate(doc: Doc, record: ProjectReportRecord) {
  const range = doc.bufferedPageRange();
  const w = contentWidth(doc);
  for (let i = 1; i < range.count; i += 1) {
    doc.switchToPage(range.start + i);
    const margins = { ...doc.page.margins };
    doc.page.margins.top = 0;
    doc.page.margins.bottom = 0;
    doc.font(SANS_BOLD).fontSize(7).fillColor(MUTED).text("DETAILED PROJECT REPORT", M, M - 18, { width: w / 2, lineBreak: false });
    doc.font(SANS).fontSize(7.5).fillColor(MUTED).text(record.input.businessName, M, M - 18, { width: w, align: "right", lineBreak: false });
    doc.moveTo(M, M - 6).lineTo(M + w, M - 6).lineWidth(0.4).strokeColor(HAIRLINE).stroke();
    const fy = doc.page.height - M + 6;
    doc.moveTo(M, fy - 6).lineTo(M + w, fy - 6).lineWidth(0.4).strokeColor(HAIRLINE).stroke();
    doc.font(SANS).fontSize(7.5).fillColor(MUTED).text(record.reference, M, fy, { width: w / 2, lineBreak: false });
    doc.text(`${i + 1} / ${range.count}`, M, fy, { width: w, align: "right", lineBreak: false });
    doc.page.margins = margins;
  }
}

export async function renderProjectReportPdf(record: ProjectReportRecord) {
  const input = record.input;
  const report = buildDpr(input);
  const text = narrativeFor(input, report);
  const doc = new PDFDocument({
    size: "A4",
    margin: M,
    bufferPages: true,
    info: { Title: `Detailed Project Report — ${input.businessName}`, Author: "DigiConnect Dukan / RNOS India Pvt. Ltd.", Subject: "Detailed Project Report" },
  });
  const lay = new Layout(doc);

  cover(doc, record, report);
  doc.addPage(); // contents, filled in at the end once page numbers are known
  summary(lay, text, report);
  glance(lay, input, report);
  textSection(lay, "Project Profile", text, ["introduction", "promoters", "project", "employment"], { promoters: () => promoterTable(lay, input) });
  textSection(lay, "Market and Marketing", text, ["market", "marketing"]);
  textSection(lay, "Process, Machinery and Raw Material", text, ["process", "machinery", "rawMaterialSource", "licences"], { machinery: () => machineryTable(lay, input) });
  costAndMeans(lay, input, report);
  salaryRepaymentDepreciation(lay, input, report);
  materialsAndSales(lay, input, report);
  profitability(lay, report);
  balanceSheet(lay, report);
  cashFlow(lay, input, report);
  ratios(lay, report);
  analysis(lay, input, report);
  textSection(lay, "Risks, SWOT and Implementation", text, ["risks", "swot", "implementation"]);
  lay.section("Conclusion", { fresh: true });
  lay.para(text.conclusion);
  declaration(lay, input);
  annexures(lay, input, report);

  doc.switchToPage(1);
  contents(doc, lay.toc);
  decorate(doc, record);
  return buffer(doc);
}
