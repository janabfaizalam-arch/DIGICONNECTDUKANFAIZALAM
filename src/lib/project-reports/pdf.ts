import "server-only";

import PDFDocument from "pdfkit";

import { CONSTITUTIONS } from "@/lib/balance-sheets/engine";
import { SCHEME_OPTIONS } from "@/lib/balance-sheets/schemes";

import { complianceFor } from "./compliance";
import { NARRATIVE_TITLES, narrativeFor } from "./defaults";
import { assetLabel, buildDpr, fyLabel, itemAmount, sensitivityOf, type DprInput, type DprReport, type NarrativeKey } from "./engine";
import { eligibilityIssues, SCHEME_RULES, SECTOR_LABEL } from "./eligibility";
import { schemeConfig } from "./scheme-catalog";
import type { ProjectReportRecord } from "./store";
import { templateById } from "./templates";

/**
 * The printed DPR.
 *
 * Every figure comes from `buildDpr` — the PDF computes nothing of its own
 * beyond formatting — so the tables always agree with each other and with
 * the form. The structure follows what banks and CA offices expect, in 28
 * sections from the cover to the documents checklist, with figures in
 * lakhs. Validation results, estimates and data gaps are printed rather
 * than hidden. The layout is quiet and modern: one typeface, one accent
 * colour, hairline rules.
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
    this.flushHead(0);
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

  private pendingHead: { text: string; note?: string } | null = null;

  /**
   * A subheading is drawn together with whatever follows it, so the two
   * always land on the same page — never a heading alone at a page foot.
   */
  subhead(text: string, note?: string) {
    this.flushHead(0);
    this.pendingHead = { text, note };
  }

  /** Room for `need` points of content: the pending heading moves with it. */
  private room(need: number) {
    if (this.pendingHead) this.flushHead(need);
    else this.ensure(need);
  }

  private flushHead(need: number) {
    const head = this.pendingHead;
    if (!head) return;
    this.pendingHead = null;
    const doc = this.doc;
    this.ensure(need + 20);
    const w = contentWidth(doc);
    const y = doc.y + 4;
    doc.font(SANS_BOLD).fontSize(9.5).fillColor(INK).text(head.text.toUpperCase(), M, y, { width: w });
    if (head.note) doc.font(SANS_ITALIC).fontSize(8).fillColor(MUTED).text(head.note, M, y + 1, { width: w, align: "right" });
    doc.y = y + 16;
  }

  para(text: string) {
    const doc = this.doc;
    const w = contentWidth(doc);
    for (const line of text.split(/\n+/).map((l) => l.trim()).filter(Boolean)) {
      this.room(34);
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
    this.room(30);
    this.doc.font(SANS_ITALIC).fontSize(8.5).fillColor(MUTED).text(text, M, this.doc.y, { width: contentWidth(this.doc), lineGap: 2 });
    this.doc.moveDown(0.8);
  }

  /** A row of figure tiles. */
  tiles(items: [string, string][]) {
    const doc = this.doc;
    this.room(62);
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
    if (total < contentBottom(doc) - contentTop - 30) this.room(total + 8);
    else this.room(80);
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

/**
 * Lakh figures for an additive table, rounded so the shown parts add up to
 * the shown total (largest-remainder rounding). Returns the cells and the total.
 */
function footed(values: number[], total = values.reduce((a, b) => a + b, 0)) {
  const target = Math.round(total / 1000); // in 0.01 lakh
  const raw = values.map((v) => v / 1000);
  const floors = raw.map((r) => Math.floor(r));
  let short = target - floors.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => [r - Math.floor(r), i] as const).sort((a, b) => b[0] - a[0]);
  const out = [...floors];
  for (const [, i] of order) {
    if (short <= 0) break;
    out[i] += 1;
    short -= 1;
  }
  const fmt = (hundredths: number) => (Math.abs(hundredths) < 0.5 ? "-" : hundredths < 0 ? `(${INR.format(-hundredths / 100)})` : INR.format(hundredths / 100));
  return { cells: out.map(fmt), total: fmt(target) };
}

const schemeLabel = (input: DprInput) => (input.scheme === "none" ? "Bank finance (no government scheme)" : (SCHEME_OPTIONS.find((s) => s.value === input.scheme)?.label ?? "Government scheme"));
const notFurnished = (v: string | null | undefined) => (v && v.trim() ? v : "Not furnished");

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
    ["Cost of project", `Rs. ${L(report.cost.total)} lakh`, "Fixed assets + pre-operative + working capital"],
    ["Bank finance", `Rs. ${L(report.means.bankLoan)} lakh`, report.mudraCategory ? `Mudra · ${report.mudraCategory}` : `Term loan ${L(report.means.termLoan)} + CC ${L(report.means.ccLimit)}`],
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
  doc
    .font(SANS)
    .fontSize(7.5)
    .fillColor(MUTED)
    .text(
      `Prepared on ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })} from information furnished by the promoter. Projections are estimates; this report is not a CA certification and does not represent a sanction by any bank or agency.`,
      M,
      H - M - 26,
      { width: w },
    );
}

function contents(doc: Doc, toc: Toc) {
  doc.y = contentTop;
  const w = contentWidth(doc);
  doc.font(SANS_BOLD).fontSize(7.5).fillColor(ACCENT).text("CONTENTS", M, doc.y, { width: w });
  doc.font(SANS_BOLD).fontSize(16).fillColor(INK).text("Table of Contents", M, doc.y + 3);
  doc.rect(M, doc.y + 6, 28, 2).fill(ACCENT);
  let y = doc.y + 20;
  const rowH = toc.length > 26 ? 19 : 21;
  for (const entry of toc) {
    doc.font(SANS_BOLD).fontSize(8.5).fillColor(ACCENT).text(String(entry.no).padStart(2, "0"), M, y, { width: 26 });
    doc.font(SANS).fontSize(9.8).fillColor(INK).text(entry.title, M + 30, y - 1, { width: w - 90, lineBreak: false });
    doc.font(SANS_BOLD).fontSize(9.5).fillColor(INK).text(String(entry.page), M, y - 1, { width: w, align: "right" });
    y += rowH;
    doc.moveTo(M + 30, y - 6).lineTo(M + w, y - 6).lineWidth(0.4).strokeColor(HAIRLINE).stroke();
  }
}

function validationBox(lay: Layout, report: DprReport) {
  const c = report.checks;
  const items: [string, boolean][] = [
    ["Project cost = sum of cost heads", c.costReconciles],
    ["Means of finance = project cost", c.meansReconcile],
    ["Term loan schedule closes at nil within tenure", c.loanReconciles],
    ["Balance sheet balances every year", c.balanceSheetBalances],
    ["Cash flow closing cash = balance sheet cash", c.cashFlowReconciles],
  ];
  lay.subhead("Internal consistency checks");
  lay.table(
    [{ label: "Check", width: 75 }, { label: "Result", width: 25, align: "right" }],
    items.map(([label, ok]) => ({ cells: [label, ok ? "Reconciled" : "NOT RECONCILED"], muted: !ok })),
  );
}

function summary(lay: Layout, text: Record<NarrativeKey, string>, report: DprReport) {
  lay.section("Executive Summary", { fresh: true });
  lay.tiles([
    ["Cost of project", `Rs. ${L(report.cost.total)} lakh`],
    ["Bank loan", `Rs. ${L(report.means.bankLoan)} lakh`],
    ["Subsidy (back-ended)", report.means.subsidy > 0 ? `Rs. ${L(report.means.subsidy)} lakh` : "-"],
  ]);
  lay.tiles([
    ["Net sales in year I", `Rs. ${L(report.years[0]?.sales ?? 0)} lakh`],
    ["Average DSCR", ratio(report.averageDscr)],
    ["Break-even", pct(report.breakEven?.bepCapacityPct ?? null, 1)],
  ]);
  lay.para(text.summary);
  validationBox(lay, report);
}

function glance(lay: Layout, input: DprInput, report: DprReport) {
  const doc = lay.doc;
  lay.section("Project at a Glance", { fresh: true });
  const constitution = CONSTITUTIONS.find((c) => c.value === input.constitution)?.label ?? "-";
  const lead = input.promoters.find((p) => p.name.trim());
  const staff = input.staff.reduce((s, r) => s + (r.count || 0), 0);
  const avgUtil = report.years.length ? report.years.reduce((s, y) => s + y.utilisationPct, 0) / report.years.length : 0;
  const items: [string, string][] = [
    ["Name of the concern", input.businessName],
    ["Promoter", lead ? `${lead.name}${lead.fatherName ? `, S/o / D/o / W/o ${lead.fatherName}` : ""}` : "-"],
    ["Constitution", constitution],
    ["Commencement of operations", `FY ${fyLabel(input.startFy)} (proposed)`],
    ["Unit location", [input.address, input.district, input.state, input.pincode].filter(Boolean).join(", ")],
    ["Product(s) / service(s)", input.products.map((p) => p.name).filter(Boolean).join(", ") || input.activity],
    ["Nature of project", "New project"],
    ["Premises", input.premises === "owned" ? "Own" : input.premises === "rented" ? "Rented" : "Leased"],
    ["Capacity utilisation", `${report.years[0]?.utilisationPct ?? 0}% in year I, average ${avgUtil.toFixed(0)}%`],
    ["Total cost of project", `Rs. ${L(report.cost.total)} lakh`],
    ["Promoter's contribution", `Rs. ${L(report.means.ownContribution)} lakh (${pct(report.means.ownContributionPct, 0)})`],
    ["Term loan", `Rs. ${L(report.means.termLoan)} lakh over ${input.tenureYears} years incl. ${input.moratoriumMonths} months' moratorium`],
    ["Working capital (cash credit)", report.means.ccLimit > 0 ? `Rs. ${L(report.means.ccLimit)} lakh` : "-"],
    ["Scheme", schemeLabel(input)],
    ["Government subsidy", report.means.subsidy > 0 ? `Rs. ${L(report.means.subsidy)} lakh, back-ended${report.means.subsidyLockInYears ? `, lock-in ${report.means.subsidyLockInYears} years` : ""}` : "-"],
    ["Average DSCR (bank method)", ratio(report.averageDscr)],
    ["Minimum DSCR", ratio(report.minimumDscr)],
    ["Current ratio (year I)", ratio(report.years[0]?.currentRatio ?? null)],
    ["Break-even point", pct(report.breakEven?.bepCapacityPct ?? null, 1)],
    ["Payback period", report.paybackYears === null ? "Beyond projection period" : `${report.paybackYears.toFixed(1)} years`],
    ["Employment", staff ? `${staff} persons besides the promoter` : "-"],
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

function textBlock(lay: Layout, text: Record<NarrativeKey, string>, keys: NarrativeKey[]) {
  for (const key of keys) {
    lay.subhead(NARRATIVE_TITLES[key]);
    lay.para(text[key]);
  }
}

function promoterProfile(lay: Layout, input: DprInput, text: Record<NarrativeKey, string>) {
  lay.section("Promoter Profile", { fresh: true });
  lay.para(text.promoters);
  const promoters = input.promoters.filter((p) => p.name.trim());
  if (promoters.length)
    lay.table(
      [
        { label: "Name", width: 20 },
        { label: "Father / husband", width: 17 },
        { label: "Age", width: 7, align: "right" },
        { label: "Category", width: 11 },
        { label: "Qualification", width: 18 },
        { label: "Experience", width: 27 },
      ],
      promoters.map((p) => ({ cells: [p.name, notFurnished(p.fatherName), p.age ? String(p.age) : "-", p.socialCategory || "-", notFurnished(p.qualification), notFurnished(p.experience)] })),
    );
}

function schemeEligibility(lay: Layout, input: DprInput, report: DprReport) {
  const terms = report.scheme;
  const rule = SCHEME_RULES[input.scheme];
  const config = schemeConfig(input.scheme);
  lay.section(input.scheme === "none" ? "Finance Arrangement" : `Scheme Eligibility — ${config.short}`, { fresh: true });
  if (!terms || input.scheme === "none") {
    lay.para("The project is proposed for finance from the bank under its normal lending norms, without a government subsidy scheme.");
    return;
  }
  const lead = input.promoters.find((p) => p.name.trim());
  const template = templateById(input.templateId);
  const status = (ok: boolean | null) => (ok === null ? "To be verified" : ok ? "Meets" : "Not met");
  const rows: [string, string, string, boolean | null][] = [
    ["Nature of activity", rule.sectors.map((s) => SECTOR_LABEL[s].split(" (")[0]).join(", "), SECTOR_LABEL[input.sector].split(" (")[0], rule.sectors.includes(input.sector)],
    ["Activity not in the negative list", config.negativeList.length ? `Not in: ${config.negativeList.join("; ")}` : "No negative list", input.activity || template?.activity || "-", template ? !template.notFor.includes(input.scheme) && (!rule.onlyGroups || rule.onlyGroups.includes(template.group)) : null],
  ];
  if (terms.maxProjectCost) rows.push(["Project cost (excluding land)", `Up to Rs. ${L(terms.maxProjectCost)} lakh`, `Rs. ${L(report.cost.total)} lakh`, report.cost.total <= terms.maxProjectCost]);
  if (terms.maxLoan) rows.push(["Bank loan", `Up to Rs. ${L(terms.maxLoan)} lakh`, `Rs. ${L(report.means.bankLoan)} lakh`, report.means.bankLoan <= terms.maxLoan]);
  rows.push(["Promoter's contribution", `At least ${terms.ownContributionPct}% of project cost`, `${report.means.ownContributionPct}% (Rs. ${L(report.means.ownContribution)} lakh)`, report.means.ownContributionPct >= terms.ownContributionPct]);
  if (terms.subsidyPct > 0) rows.push(["Subsidy", `${terms.subsidyPct}% of project cost${terms.subsidyCap ? `, up to Rs. ${L(terms.subsidyCap)} lakh` : ""}`, `Rs. ${L(report.means.subsidy)} lakh`, null]);
  if (terms.interestSubventionPct > 0) rows.push(["Interest subvention", `${terms.interestSubventionPct}% for ${terms.interestSubventionYears} years`, "Taken in the projections", true]);
  rows.push(["Age of promoter", `${rule.age.min}${rule.age.max ? ` to ${rule.age.max}` : " and above"} years`, lead?.age ? `${lead.age} years` : "Not furnished", lead?.age ? lead.age >= rule.age.min && (rule.age.max === null || lead.age <= rule.age.max) : null]);
  if (rule.educationEn) rows.push(["Educational qualification", rule.educationEn, notFurnished(lead?.qualification), null]);
  lay.table(
    [{ label: "Condition", width: 22 }, { label: "Scheme requirement", width: 34 }, { label: "This project", width: 28 }, { label: "Status", width: 16 }],
    rows.map(([a, b, c, ok]) => ({ cells: [a, b, c, status(ok)], muted: ok === null })),
  );
  lay.subhead("Scheme rules used and their verification status");
  lay.table(
    [{ label: "Rule", width: 24 }, { label: "As applied in this report", width: 52 }, { label: "Status", width: 24 }],
    [
      ...config.terms.map((t) => ({ cells: [t.rule, `${t.requirement}${t.note ? ` (${t.note})` : ""}`, t.status === "verified" ? "Verified" : "Verification required"], muted: t.status !== "verified" })),
      { cells: ["Age limit", `${config.age.min}${config.age.max ? `–${config.age.max}` : "+"} years`, config.age.status === "verified" ? "Verified" : "Verification required"], muted: config.age.status !== "verified" },
    ],
  );
  lay.note(
    `${config.name} — ${config.version}. Rules as checked on ${config.lastVerified}${config.sources.length ? ` from: ${config.sources.map((s) => s.label).join("; ")}` : ""}. ${
      eligibilityIssues(input).length ? "Some conditions are not met; the application should be corrected before submission." : "Final eligibility and the subsidy are decided by the implementing agency and the bank; nothing in this report guarantees them."
    }`,
  );
}

function machineryDetails(lay: Layout, input: DprInput, text: Record<NarrativeKey, string>) {
  lay.subhead(NARRATIVE_TITLES.machinery);
  lay.para(text.machinery);
  const items = input.capitalItems.filter((i) => itemAmount(i) > 0 && !["land", "preliminary", "licences", "deposit"].includes(i.kind));
  if (!items.length) return;
  lay.table(
    [{ label: "#", width: 4 }, { label: "Machinery / equipment", width: 36 }, { label: "Qty", width: 6, align: "right" }, { label: "Rate (Rs.)", width: 14, align: "right" }, { label: "Amount (Rs.)", width: 15, align: "right" }, { label: "Supplier / quotation", width: 25 }],
    [
      ...items.map((item, i) => ({
        cells: [String(i + 1), item.description, String(item.quantity), rupees(item.rate), rupees(itemAmount(item)), item.supplier?.trim() ? `${item.supplier}${item.quotationRef ? ` (${item.quotationRef})` : ""}` : "Quotation pending"],
        muted: !item.supplier?.trim(),
      })),
      { cells: ["", "Total", "", "", rupees(items.reduce((s, i) => s + itemAmount(i), 0)), ""], total: true },
    ],
  );
  lay.note("Rates exclude GST. Items marked \"Quotation pending\" carry indicative market rates; supplier quotations are to be furnished to the bank.");
}

function productionAndMaterials(lay: Layout, input: DprInput, report: DprReport, text: Record<NarrativeKey, string>) {
  lay.section("Production, Sales and Raw Material", { fresh: true });
  const y1 = report.years[0];
  if (y1?.production.length) {
    lay.subhead("Production and saleable quantity", `Year I at ${y1.utilisationPct}% capacity`);
    lay.table(
      [{ label: "Product", width: 26 }, { label: "Capacity", width: 13, align: "right" }, { label: "Produced", width: 13, align: "right" }, { label: "Process loss", width: 12, align: "right" }, { label: "Rejected", width: 11, align: "right" }, { label: "Saleable", width: 12, align: "right" }, { label: "Net sales (lakh)", width: 13, align: "right" }],
      [
        ...y1.production.map((p) => ({ cells: [`${p.name}${p.unit ? ` (${p.unit})` : ""}`, qty(p.capacity), qty(p.production), qty(p.processLoss), qty(p.rejected), qty(p.saleable), L(p.netSales)] })),
        { cells: ["Total", "", "", "", "", "", L(y1.sales)], total: true },
      ],
      { size: 8.2 },
    );
    lay.note("Saleable quantity = production less process loss and rejections / returns. Net sales = saleable quantity × selling price (excluding GST).");
    lay.table(yearCols(report, "Sales", (i) => `${report.years[i].utilisationPct}%`), [
      yearRow(report, "Gross sales", (i) => report.years[i].grossSales),
      yearRow(report, "Less: rejections / returns", (i) => -report.years[i].returns),
      yearRow(report, "Net sales (Rs. lakh)", (i) => report.years[i].sales, { total: true }),
    ]);
  }
  lay.subhead(NARRATIVE_TITLES.rawMaterialSource);
  lay.para(text.rawMaterialSource);
  if (y1?.materials.length) {
    lay.subhead("Raw material consumption", `Year I at ${y1.utilisationPct}% capacity`);
    lay.table(
      [{ label: "Material", width: 30 }, { label: "Quantity", width: 16, align: "right" }, { label: "Rate (Rs.)", width: 14, align: "right" }, { label: "Value (lakh)", width: 14, align: "right" }, { label: "Basis", width: 26 }],
      [
        ...y1.materials.map((m) => ({ cells: [m.name, `${qty(m.quantity)}${m.unit ? ` ${m.unit}` : ""}`, rupees(m.rate), L(m.value), m.basis === "linked" ? `Per unit of ${m.linkedTo}` : "Estimate for the year"], muted: m.basis !== "linked" })),
        { cells: ["Total", "", "", L(y1.rawMaterial), ""], total: true },
      ],
    );
    lay.table(yearCols(report, "Consumption", (i) => `${report.years[i].utilisationPct}%`), [yearRow(report, "Raw material (Rs. lakh)", (i) => report.years[i].rawMaterial, { total: true })]);
  }
  if (input.overheads.some((o) => o.monthly > 0)) {
    lay.subhead("Utilities and running costs", "Per month, at full capacity");
    lay.table(
      [{ label: "Expense", width: 40 }, { label: "Nature", width: 36 }, { label: "Per month (Rs.)", width: 24, align: "right" }],
      input.overheads
        .filter((o) => o.monthly > 0)
        .map((o) => ({ cells: [`${o.name}${o.estimated ? " (estimate)" : ""}`, `${o.direct ? "Direct" : "Indirect"} · ${o.variable ? "varies with output" : "fixed"}`, rupees(o.monthly)], muted: o.estimated })),
    );
  }
}

const qty = (v: number) => v.toLocaleString("en-IN", { maximumFractionDigits: v < 100 ? 2 : 0 });

function statutoryCompliance(lay: Layout, input: DprInput, report: DprReport) {
  lay.section("Statutory Compliance and Licences", { fresh: true });
  const items = complianceFor(input, report);
  const groups: [string, typeof items][] = [
    ["Mandatory approvals", items.filter((i) => i.level === "mandatory")],
    ["Conditional approvals (apply above thresholds or in some cases)", items.filter((i) => i.level === "conditional")],
    ["Recommended registrations", items.filter((i) => i.level === "recommended")],
  ];
  for (const [title, list] of groups) {
    if (!list.length) continue;
    lay.subhead(title);
    lay.table(
      [{ label: "Approval", width: 30 }, { label: "Authority", width: 22 }, { label: "Basis", width: 34 }, { label: "Status", width: 14 }],
      list.map((i) => ({ cells: [i.name, i.authority, i.basis, i.status === "verified" ? "Confirmed" : "Verify"], muted: i.status !== "verified" })),
      { size: 8.2 },
    );
  }
  lay.note("Prepared from the industry, location, size and headcount of the project as checked in November 2026. Items marked \"Verify\" are to be confirmed with the authority before submission. This is not legal advice.");
}

function costAndMeans(lay: Layout, input: DprInput, report: DprReport) {
  lay.section("Project Cost", { fresh: true, unit: true });
  const items = input.capitalItems.filter((item) => itemAmount(item) > 0 && (item.kind !== "land" || input.includeLand));
  const lineValues = report.cost.lines.map((l) => l.amount);
  const f = footed([...lineValues, report.cost.workingCapital], report.cost.total);
  lay.table(
    [{ label: "#", width: 6 }, { label: "Head of cost", width: 64 }, { label: "Amount", width: 30, align: "right" }],
    [
      ...report.cost.lines.map((l, i) => ({ cells: [String(i + 1), l.label, f.cells[i]] })),
      { cells: [String(report.cost.lines.length + 1), "Working capital requirement (see working capital assessment)", f.cells[report.cost.lines.length]] },
      { cells: ["", "Total cost of project", f.total], total: true },
    ],
  );
  if (report.cost.landOutside > 0) lay.note(`Land / premises (Rs. ${L(report.cost.landOutside)} lakh) is the promoter's own and is not included in the cost of project.`);
  lay.subhead("Item-wise detail", "Amount in Rs.");
  lay.table(
    [{ label: "#", width: 5 }, { label: "Item", width: 45 }, { label: "Head", width: 22 }, { label: "Qty", width: 7, align: "right" }, { label: "Amount (Rs.)", width: 21, align: "right" }],
    items.map((item, i) => ({ cells: [String(i + 1), item.description, assetLabel(item.kind), String(item.quantity), rupees(itemAmount(item))] })),
    { size: 8.2 },
  );

  lay.section("Means of Finance", { unit: true });
  const m = report.means;
  const parts: [string, number][] = [
    ["Promoter's own contribution", m.ownContribution],
    ...(m.otherFunding > 0 ? ([["Other funding (unsecured loans)", m.otherFunding]] as [string, number][]) : []),
    ["Bank loan — term loan", m.termLoan],
    ...(m.ccLimit > 0 ? ([["Bank loan — working capital (cash credit)", m.ccLimit]] as [string, number][]) : []),
  ];
  const mf = footed(parts.map(([, v]) => v), m.total);
  const share = (v: number) => (report.cost.total > 0 ? pct((v / report.cost.total) * 100, 1) : "-");
  lay.table(
    [{ label: "#", width: 5 }, { label: "Source", width: 55 }, { label: "Amount", width: 20, align: "right" }, { label: "Share", width: 20, align: "right" }],
    [...parts.map(([label, v], i) => ({ cells: [String(i + 1), label, mf.cells[i], share(v)] })), { cells: ["", "Total means of finance (= cost of project)", mf.total, share(m.total)], total: true }],
  );
  if (m.subsidy > 0) {
    lay.subhead("Treatment of the government subsidy");
    lay.para(
      `A subsidy of Rs. ${L(m.subsidy)} lakh is expected under ${report.scheme?.label ?? "the scheme"}. It is back-ended and is not counted as a source of funds above: on sanction it is kept by the bank in a term deposit (TDR) in the unit's name${m.subsidyLockInYears ? ` for a lock-in period of ${m.subsidyLockInYears} years` : ""}${m.subsidyInterestFree ? ", during which no interest is charged on the part of the loan equal to it" : ""}, and is then adjusted against the term loan, reducing the remaining instalments. In the balance sheet it appears as a capital subsidy reserve with an equal restricted deposit until it is adjusted.`,
    );
  }
}

function workingCapital(lay: Layout, input: DprInput, report: DprReport) {
  lay.section("Working Capital Assessment", { unit: true });
  const wc = report.workingCapital;
  const parts: [string, string, number, string][] = [
    ["Raw material stock", `${input.rawMaterialDays} days`, wc.rawMaterialStock, "of raw material consumed"],
    ["Work in progress", `${input.workInProgressDays} days`, wc.workInProgress, "of cost of production"],
    ["Finished goods", `${input.finishedGoodsDays} days`, wc.finishedGoods, "of cost of production"],
    ["Receivables (sundry debtors)", `${input.debtorDays} days`, wc.debtors, "of net sales"],
    ["Minimum cash balance", `${input.minimumCashDays} days`, wc.minimumCash, "of cash operating expenses"],
  ];
  lay.table(
    [{ label: "Particulars", width: 34 }, { label: "Holding period", width: 18, align: "right" }, { label: "Basis", width: 30 }, { label: "Amount", width: 18, align: "right" }],
    [
      ...parts.filter(([, , v]) => v > 0 || true).map(([a, b, v, c]) => ({ cells: [a, b, c, L(v)] })),
      { cells: ["Less: credit from suppliers", `${input.creditorDays} days`, "of raw material purchases", `(${L(wc.creditors)})`] },
      { cells: ["Working capital requirement", "", "Year I", L(wc.requirement)], total: true },
    ],
  );
  lay.note(`Financed by cash credit of Rs. ${L(report.means.ccLimit)} lakh and the promoter's margin. The cash credit limit is taken as fully drawn from year I.`);
}

function employees(lay: Layout, input: DprInput, report: DprReport) {
  lay.section("Employees and Salary", { fresh: true, unit: true });
  const y1 = report.years[0];
  if (!y1?.staffCost.length) {
    lay.para("The promoter will run the unit personally; no employees are proposed.");
    return;
  }
  lay.table(
    [{ label: "Post", width: 30 }, { label: "Type", width: 11 }, { label: "No.", width: 7, align: "right" }, { label: "Salary / month (Rs.)", width: 16, align: "right" }, { label: "Annual salary (Rs.)", width: 18, align: "right" }, { label: "Statutory (Rs.)", width: 18, align: "right" }],
    [
      ...y1.staffCost.map((s) => ({ cells: [s.role, s.direct ? "Direct" : "Indirect", String(s.count), rupees(s.monthlySalary), rupees(s.salary), rupees(s.statutory)] })),
      { cells: ["Total", "", String(y1.staffCost.reduce((t, s) => t + s.count, 0)), "", rupees(y1.staffCost.reduce((t, s) => t + s.salary, 0)), rupees(y1.staffCost.reduce((t, s) => t + s.statutory, 0))], total: true },
    ],
    { size: 8.2 },
  );
  lay.note(
    input.employerContributionPct !== null
      ? `Employer's statutory contributions taken at ${input.employerContributionPct}% of salary as entered.`
      : "Employer's EPF (12% of wages up to Rs. 15,000) applies from 20 employees and ESI (3.25% for wages up to Rs. 21,000) from 10 employees; they are added where the headcount reaches these thresholds.",
  );
  lay.table(yearCols(report, "Year"), [
    yearRow(report, `Salary and wages incl. statutory (escalation ${input.costGrowthPct}% p.a.)`, (i) => report.years[i].directWages + report.years[i].indirectSalaries, { total: true }),
  ]);
}

function repaymentAndDepreciation(lay: Layout, input: DprInput, report: DprReport) {
  lay.section("Loan Repayment Schedule", { fresh: true, unit: true });
  const rp = report.repayment;
  const adj = rp.some((r) => r.subsidyAdjusted > 0);
  lay.table(
    [{ label: "Year", width: 30 }, ...rp.map((r, i) => ({ label: roman(i), width: Math.max(9, 70 / rp.length), align: "right" as Align }))],
    [
      { cells: ["Opening balance", ...rp.map((r) => L(r.opening))] },
      { cells: [`Interest @ ${input.termLoanInterestPct}%`, ...rp.map((r) => L(r.interest))] },
      { cells: ["Principal repaid", ...rp.map((r) => L(r.principal))] },
      ...(adj ? [{ cells: ["Subsidy adjusted against loan", ...rp.map((r) => L(r.subsidyAdjusted))] }] : []),
      { cells: ["Closing balance", ...rp.map((r) => L(r.closing))], total: true },
    ],
    { size: rp.length > 6 ? 7.8 : 8.6 },
  );
  const method = input.repaymentMethod === "emi" ? "equated instalments (EMI)" : "equal instalments of principal with interest on the reducing balance";
  lay.note(
    `Term loan of Rs. ${L(report.means.termLoan)} lakh, disbursed at the start of year I, repayable over ${input.tenureYears} years including a moratorium of ${input.moratoriumMonths} months (interest only), in ${input.repaymentFrequency} ${method}. Yearly figures are the totals of the month-wise schedule at Annexure A; the balance is nil at the end of the tenure.`,
  );

  lay.section("Depreciation Schedule", { unit: true });
  lay.table(
    [{ label: "Asset", width: 24 }, { label: "Rate", width: 8, align: "right" }, { label: "Cost", width: 11, align: "right" }, ...report.years.map((_, i) => ({ label: roman(i), width: 11, align: "right" as Align }))],
    [
      ...report.depreciation.map((d) => ({ cells: [d.label, `${d.ratePct}%`, L(d.cost), ...d.perYear.map(L)] })),
      { cells: ["Book depreciation", "", L(report.depreciation.reduce((s, d) => s + d.cost, 0)), ...report.years.map((y) => L(y.depreciation))], total: true },
      { cells: ["Tax depreciation (IT Act WDV)", "", "", ...report.taxDepreciation.map(L)], muted: true },
    ],
    { size: 8.2 },
  );
  const bases = [...new Set(report.depreciation.map((d) => d.basis))];
  lay.note(`Book depreciation: ${report.depreciationMethod === "SLM" ? "straight line method" : "written down value method"} — ${bases.join("; ")}. Full year's depreciation is taken in year I. Tax depreciation is at Income-tax Act WDV rates and is used for the taxable income.`);
}

function profitability(lay: Layout, report: DprReport) {
  lay.section("Projected Profit and Loss", { fresh: true, unit: true });
  const y = report.years;
  lay.table(
    yearCols(report, "Particulars"),
    [
      { cells: ["Capacity utilisation", ...y.map((r) => `${r.utilisationPct}%`)], muted: true },
      yearRow(report, "Gross sales", (i) => y[i].grossSales),
      yearRow(report, "Less: rejections / returns", (i) => -y[i].returns),
      yearRow(report, "[A] Net sales", (i) => y[i].sales, { total: true }),
      yearRow(report, "Raw material consumed", (i) => y[i].rawMaterial),
      yearRow(report, "Direct wages (incl. statutory)", (i) => y[i].directWages),
      yearRow(report, "Power and direct expenses", (i) => y[i].directOverheads),
      yearRow(report, "Cost of production", (i) => y[i].costOfProduction),
      yearRow(report, "Add: opening less closing stock (WIP, FG)", (i) => y[i].stockAdjustment),
      yearRow(report, "[B] Cost of sales", (i) => y[i].costOfSales, { total: true }),
      yearRow(report, "Gross profit [A - B]", (i) => y[i].grossProfit, { total: true }),
      yearRow(report, "Salaries (indirect staff)", (i) => y[i].indirectSalaries),
      yearRow(report, "Administrative and selling expenses", (i) => y[i].indirectOverheads),
      yearRow(report, "EBITDA", (i) => y[i].ebitda, { total: true }),
      yearRow(report, "Depreciation", (i) => y[i].depreciation),
      ...(y.some((r) => r.preliminaryWrittenOff > 0) ? [yearRow(report, "Preliminary expenses written off", (i) => y[i].preliminaryWrittenOff)] : []),
      yearRow(report, "Interest on term loan", (i) => y[i].termLoanInterest),
      yearRow(report, "Interest on working capital", (i) => y[i].ccInterest),
      ...(y.some((r) => r.interestSubvention > 0) ? [yearRow(report, "Less: interest subvention", (i) => -y[i].interestSubvention)] : []),
      yearRow(report, "Profit before tax", (i) => y[i].profitBeforeTax, { total: true }),
      yearRow(report, "Income tax", (i) => y[i].tax),
      yearRow(report, "Profit after tax", (i) => y[i].netProfit, { total: true }),
      yearRow(report, "Cash accruals (PAT + depreciation + write-off)", (i) => y[i].cashAccrual, { total: true }),
    ],
    { size: 8.4 },
  );
  lay.subhead("Computation of income tax");
  lay.table(
    yearCols(report, "Particulars"),
    [
      yearRow(report, "Profit before tax (books)", (i) => y[i].profitBeforeTax),
      yearRow(report, "Add: book depreciation and write-off", (i) => y[i].depreciation + y[i].preliminaryWrittenOff),
      yearRow(report, "Less: tax depreciation and §35D write-off", (i) => -(report.taxDepreciation[i] + y[i].preliminaryWrittenOff)),
      yearRow(report, "Taxable business income", (i) => y[i].taxableIncome, { total: true }),
      yearRow(report, "Less: losses brought forward set off", (i) => -y[i].lossSetOff),
      yearRow(report, "Income tax payable", (i) => y[i].tax, { total: true }),
    ],
    { size: 8.4 },
  );
  lay.note(`${report.taxBasis.description} Tax is assumed paid within the year.`);
}

function balanceSheet(lay: Layout, report: DprReport) {
  lay.section("Projected Balance Sheet", { fresh: true, unit: true });
  const y = report.years;
  const subsidy = y.some((r) => r.subsidyReserve > 0);
  lay.subhead("Capital and liabilities");
  lay.table(
    yearCols(report, "As at year end"),
    [
      yearRow(report, "Capital introduced by promoter", (i) => y[i].capital),
      yearRow(report, "Reserves and surplus (retained profit)", (i) => y[i].reserves),
      ...(subsidy ? [yearRow(report, "Capital subsidy reserve", (i) => y[i].subsidyReserve)] : []),
      yearRow(report, "Term loan (incl. current maturities)", (i) => y[i].termLoanOutstanding),
      ...(y.some((r) => r.ccLoan > 0) ? [yearRow(report, "Cash credit (working capital)", (i) => y[i].ccLoan)] : []),
      ...(y.some((r) => r.otherFunding > 0) ? [yearRow(report, "Unsecured loans", (i) => y[i].otherFunding)] : []),
      yearRow(report, "Sundry creditors", (i) => y[i].creditors),
      yearRow(report, "Total", (i) => y[i].totalLiabilities, { total: true }),
    ],
    { size: 8.4 },
  );
  lay.subhead("Assets");
  lay.table(
    yearCols(report, "As at year end"),
    [
      yearRow(report, "Gross block", (i) => y[i].grossBlock),
      yearRow(report, "Less: accumulated depreciation", (i) => -y[i].accumulatedDepreciation),
      yearRow(report, "Net block", (i) => y[i].netFixedAssets, { total: true }),
      ...(y.some((r) => r.deposits > 0) ? [yearRow(report, "Security deposits", (i) => y[i].deposits)] : []),
      ...(y.some((r) => r.preliminaryUnamortised > 0) ? [yearRow(report, "Preliminary expenses not written off", (i) => y[i].preliminaryUnamortised)] : []),
      ...(subsidy ? [yearRow(report, "Subsidy held in TDR (restricted)", (i) => y[i].subsidyDeposit)] : []),
      yearRow(report, "Raw material stock", (i) => y[i].rawMaterialStock),
      ...(y.some((r) => r.workInProgress > 0) ? [yearRow(report, "Work in progress", (i) => y[i].workInProgress)] : []),
      yearRow(report, "Finished goods", (i) => y[i].finishedGoods),
      yearRow(report, "Sundry debtors", (i) => y[i].debtorsBalance),
      yearRow(report, "Cash and bank balance", (i) => y[i].cash),
      yearRow(report, "Total", (i) => y[i].totalAssets, { total: true }),
    ],
    { size: 8.4 },
  );
  lay.note(
    `Cash and bank balance is the closing cash of the cash flow statement; it is not a balancing figure. ${report.checks.balanceSheetBalances ? "Total assets equal total capital and liabilities in every year." : "WARNING: the balance sheet does not balance — the report is not final."}`,
  );
}

function cashFlow(lay: Layout, input: DprInput, report: DprReport) {
  lay.section("Cash Flow Statement", { fresh: true, unit: true });
  const all = [report.implementation, ...report.cashFlow];
  const cols: Column[] = [{ label: "Particulars", width: 31 }, { label: "Set-up", width: 11.5, align: "right" }, ...report.cashFlow.map((_, i) => ({ label: roman(i), width: 11.5, align: "right" as Align }))];
  const row = (label: string, pick: (f: (typeof all)[number]) => number, extra: Partial<Row> = {}): Row => ({ cells: [label, ...all.map((f) => L(pick(f)))], ...extra });
  const any = (pick: (f: (typeof all)[number]) => number) => all.some((f) => Math.abs(pick(f)) >= 500);
  lay.table(
    cols,
    [
      { cells: ["A. Operating activities", ...all.map(() => "")], muted: true },
      row("Net profit after tax", (f) => f.netProfit),
      row("Add: depreciation and write-off", (f) => f.depreciation),
      row("(Increase) in inventory", (f) => f.changeInInventory),
      row("(Increase) in sundry debtors", (f) => f.changeInDebtors),
      row("Increase in sundry creditors", (f) => f.changeInCreditors),
      row("Net cash from operating activities", (f) => f.operating, { total: true }),
      { cells: ["B. Investing activities", ...all.map(() => "")], muted: true },
      row("Fixed assets, pre-operative and deposits", (f) => f.capitalExpenditure),
      ...(any((f) => f.subsidyPlacedInTdr) ? [row("Subsidy placed in TDR", (f) => f.subsidyPlacedInTdr), row("TDR released at end of lock-in", (f) => f.subsidyReleased)] : []),
      row("Net cash from investing activities", (f) => f.investing, { total: true }),
      { cells: ["C. Financing activities", ...all.map(() => "")], muted: true },
      row("Promoter's contribution", (f) => f.promoterContribution),
      row("Term loan disbursed", (f) => f.termLoanDisbursed),
      ...(any((f) => f.ccDrawn) ? [row("Cash credit drawn", (f) => f.ccDrawn)] : []),
      ...(any((f) => f.otherFunding) ? [row("Unsecured loans", (f) => f.otherFunding)] : []),
      ...(any((f) => f.subsidyReceived) ? [row("Subsidy received", (f) => f.subsidyReceived), row("Subsidy adjusted against term loan", (f) => f.subsidyAdjustedAgainstLoan)] : []),
      row("Term loan repaid", (f) => f.principalRepaid),
      ...(input.drawingsPerYear > 0 ? [row("Drawings", (f) => f.drawings)] : []),
      row("Net cash from financing activities", (f) => f.financing, { total: true }),
      row("Net change in cash (A + B + C)", (f) => f.netChange),
      row("Opening cash and bank", (f) => f.openingCash),
      row("Closing cash and bank", (f) => f.closingCash, { total: true }),
    ],
    { size: 7.8 },
  );
  lay.note(`Opening cash + net change = closing cash in every period, and closing cash agrees with the balance sheet. ${report.checks.cashFlowReconciles ? "" : "WARNING: the cash flow does not reconcile."}`);
}

function ratios(lay: Layout, report: DprReport) {
  lay.section("DSCR, Current Ratio and Key Ratios", { fresh: true, unit: true });
  const y = report.years;
  lay.subhead("Debt service coverage ratio");
  lay.table(
    yearCols(report, "Year"),
    [
      yearRow(report, "Cash accruals (PAT + dep. + write-off)", (i) => y[i].cashAccrual),
      yearRow(report, "Add: interest on term loan (net)", (i) => y[i].termLoanInterest - (y[i].interestSubvention && y[i].termLoanInterest + y[i].ccInterest > 0 ? (y[i].interestSubvention * y[i].termLoanInterest) / (y[i].termLoanInterest + y[i].ccInterest) : 0)),
      yearRow(report, "Term loan instalments (principal)", (i) => y[i].principalRepaid),
      { cells: ["DSCR", ...y.map((r) => ratio(r.dscr))], total: true },
    ],
    { size: 8.4 },
  );
  lay.tiles([
    ["Average DSCR", ratio(report.averageDscr)],
    ["Minimum DSCR", ratio(report.minimumDscr)],
    ["Payback period", report.paybackYears === null ? "-" : `${report.paybackYears.toFixed(1)} years`],
  ]);
  lay.note(
    "DSCR = (PAT + depreciation + write-offs + interest on term loan) ÷ (interest on term loan + principal instalments). Average DSCR = total of the numerators ÷ total of the denominators over the years with debt service (not a simple average of yearly ratios). The subsidy adjusted against the loan is not part of debt service, as it is not paid from cash accruals.",
  );

  lay.subhead("Current ratio");
  lay.table(
    yearCols(report, "Year"),
    [
      yearRow(report, "Inventory", (i) => y[i].stock),
      yearRow(report, "Sundry debtors", (i) => y[i].debtorsBalance),
      yearRow(report, "Cash and bank", (i) => Math.max(0, y[i].cash)),
      yearRow(report, "A. Current assets", (i) => y[i].currentAssets, { total: true }),
      yearRow(report, "Sundry creditors", (i) => y[i].creditors),
      ...(y.some((r) => r.ccLoan > 0) ? [yearRow(report, "Cash credit", (i) => y[i].ccLoan)] : []),
      yearRow(report, "Term loan instalments due within 12 months", (i) => y[i].currentMaturities),
      yearRow(report, "B. Current liabilities", (i) => y[i].currentLiabilities, { total: true }),
      { cells: ["Current ratio (A / B)", ...y.map((r) => ratio(r.currentRatio))], total: true },
    ],
    { size: 8.4 },
  );
  lay.note("Current liabilities include term loan instalments due within the next 12 months (as in CMA Form IV). The subsidy TDR is restricted and excluded from current assets.");

  lay.subhead("Key financial ratios");
  const p = (v: number | null) => pct(v, 1);
  lay.table(yearCols(report, "Ratio"), [
    { cells: ["Gross profit margin (GP / net sales)", ...y.map((r) => p(r.grossMarginPct))] },
    { cells: ["EBITDA margin", ...y.map((r) => p(r.ebitdaMarginPct))] },
    { cells: ["Net profit margin (PAT / net sales)", ...y.map((r) => p(r.netMarginPct))] },
    { cells: ["ROCE (EBIT / capital employed)", ...y.map((r) => p(r.rocePct))] },
    { cells: ["Debt-equity (term debt / tangible net worth)", ...y.map((r) => ratio(r.debtEquity))] },
  ]);
}

function breakEvenAndSensitivity(lay: Layout, input: DprInput, report: DprReport) {
  lay.section("Break-even Analysis", { fresh: true, unit: true });
  const b = report.breakEven;
  if (b) {
    lay.subhead(`Year ${roman(report.years.findIndex((y) => y.fyStart === b.fyStart))} — classification of costs`);
    lay.table(
      [{ label: "Cost head", width: 56 }, { label: "Nature", width: 20 }, { label: "Amount", width: 24, align: "right" }],
      [
        ...b.classification.map((c) => ({ cells: [c.head, c.nature === "variable" ? "Variable" : "Fixed", L(c.amount)] })),
        { cells: ["Net sales", "", L(report.years.find((y) => y.fyStart === b.fyStart)?.sales ?? 0)], total: true },
        { cells: ["Contribution (net sales - variable costs)", "", L(b.contribution)], total: true },
        { cells: ["Break-even sales (fixed costs ÷ P/V ratio)", "", L(b.bepSales)], total: true },
      ],
    );
    lay.tiles([
      ["Break-even (% of capacity)", pct(b.bepCapacityPct, 2)],
      ["Cash break-even (% of capacity)", pct(b.cashBepCapacityPct, 2)],
    ]);
    lay.note("Break-even % of installed capacity = fixed costs ÷ contribution × utilisation of that year. Cash break-even leaves out depreciation and write-offs.");
  }
  lay.section("Sensitivity Analysis");
  const cases = sensitivityOf(input);
  lay.table(
    [{ label: "Scenario", width: 40 }, { label: "Avg DSCR", width: 15, align: "right" }, { label: "Min DSCR", width: 15, align: "right" }, { label: "Year I PAT (lakh)", width: 15, align: "right" }, { label: "Break-even", width: 15, align: "right" }],
    cases.map((c, i) => ({ cells: [c.label, ratio(c.averageDscr), ratio(c.minimumDscr), L(c.firstYearProfit), c.breakEvenPct !== null && c.breakEvenPct > 100 ? "Above 100%" : pct(c.breakEvenPct, 1)], total: i === 0 })),
  );
  const worst = cases.at(-1);
  lay.note(
    worst && worst.averageDscr !== null && worst.averageDscr >= 1.25
      ? "Even with lower volumes and higher running costs together, the projected cash accruals cover debt service."
      : "The project is sensitive to a combined fall in volumes and rise in costs; sales and running costs need close monitoring.",
  );
}

function assumptionsAndGaps(lay: Layout, input: DprInput, report: DprReport) {
  lay.section("Annexure B — Basis of Projections", { fresh: true });
  lay.para(
    [
      `• The projections cover ${report.years.length} years from FY ${fyLabel(input.startFy)}, the first year of commercial operation. Loans are taken as disbursed and assets put to use at the start of year I.`,
      `• Capacity utilisation: ${input.utilisationPct.slice(0, report.years.length).join("%, ")}% in successive years. Sales are of saleable quantity after process loss and rejections.`,
      `• Selling prices ${input.priceGrowthPct ? `increase by ${input.priceGrowthPct}% a year` : "are held constant"}; raw material rates move with them. Salaries and running costs increase by ${input.costGrowthPct}% a year; costs that vary with output follow utilisation.`,
      `• Working capital: raw material ${input.rawMaterialDays} days, work in progress ${input.workInProgressDays} days, finished goods ${input.finishedGoodsDays} days, debtors ${input.debtorDays} days, supplier credit ${input.creditorDays} days, minimum cash ${input.minimumCashDays} days of cash expenses.`,
      `• Term loan interest ${input.termLoanInterestPct}% and cash credit interest ${input.ccInterestPct}% per annum; tenure ${input.tenureYears} years including ${input.moratoriumMonths} months' moratorium; ${input.repaymentFrequency} ${input.repaymentMethod === "emi" ? "EMI" : "equal principal"} repayment.`,
      `• Depreciation: ${report.depreciationMethod === "SLM" ? "straight line (Companies Act useful lives)" : "written down value (Income-tax rates)"} in the books; Income-tax WDV for tax. Preliminary expenses and licences are written off over ${input.preliminaryWriteOffYears} years.`,
      `• Income tax: ${report.taxBasis.description}`,
      `• GST is a pass-through and is excluded from sales and costs.`,
      `• All figures are estimates based on current market rates and the promoter's information; actual results may vary.`,
    ].join("\n"),
  );
  lay.section("Annexure C — Assumptions to be Confirmed and Data Gaps");
  lay.para(report.dataGaps.length ? report.dataGaps.map((g) => `• ${g}`).join("\n") : "• None: every input required for the projections has been furnished.");
}

function annexureRepayment(lay: Layout, input: DprInput, report: DprReport) {
  lay.section("Annexure A — Month-wise Repayment Schedule", { fresh: true });
  const rows = report.monthly;
  const adj = rows.some((r) => r.subsidyAdjusted > 0);
  lay.note(`Term loan Rs. ${rupees(report.means.termLoan)} at ${input.termLoanInterestPct}% p.a.; moratorium ${input.moratoriumMonths} months; amounts in rupees.`);
  lay.table(
    [
      { label: "Month", width: 9, align: "right" },
      { label: "Opening", width: 19, align: "right" },
      { label: "Interest", width: 15, align: "right" },
      { label: "Principal", width: 15, align: "right" },
      ...(adj ? [{ label: "Subsidy adj.", width: 15, align: "right" as Align }] : []),
      { label: "Instalment", width: 15, align: "right" },
      { label: "Closing", width: 19, align: "right" },
    ],
    rows.map((r) => ({ cells: [String(r.month), rupees(r.opening), rupees(r.interest), rupees(r.principal), ...(adj ? [r.subsidyAdjusted ? rupees(r.subsidyAdjusted) : "-"] : []), rupees(r.instalment), rupees(r.closing)] })),
    { size: 7.6 },
  );
}

function documentChecklist(lay: Layout, input: DprInput, report: DprReport) {
  const rule = SCHEME_RULES[input.scheme];
  const common = [
    "Aadhaar card and PAN card of the promoter(s)",
    "Two recent passport-size photographs",
    "Proof of residence of the promoter",
    "Proof of unit premises: ownership document / rent or lease agreement / consent of owner",
    "Quotations for machinery and equipment from suppliers (with GST number)",
    "Educational qualification and experience / training certificates",
    "Caste / category certificate (if claiming special category)",
    "Bank statement of the promoter for the last 6 months",
    "Udyam Registration certificate (or undertaking to obtain it)",
    "This Detailed Project Report signed by the promoter",
  ];
  const schemeDocs = rule?.documents ?? [];
  const approvals = complianceFor(input, report).filter((c) => c.level === "mandatory" && !/^PAN|Udyam/.test(c.name));
  const items = [...common.filter((c) => !(/^Caste/.test(c) && schemeDocs.some((d) => /^Caste/.test(d)))), ...schemeDocs, ...approvals.map((a) => `${a.name} (or application for it)`)];
  lay.section("Annexure D — Documents Checklist", { fresh: true });
  lay.note("Documents to be attached with the loan application. Tick each one as it is collected.");
  lay.table(
    [{ label: "#", width: 6 }, { label: "Document", width: 80 }, { label: "Attached", width: 14, align: "center" }],
    items.map((item, i) => ({ cells: [String(i + 1), item, "[   ]"] })),
  );
}

function declaration(lay: Layout, input: DprInput) {
  const doc = lay.doc;
  lay.ensure(200);
  lay.subhead("Declaration");
  lay.para(
    "I / We hereby declare that the information furnished in this project report is true and correct to the best of my / our knowledge and belief, and that the projections are based on assumptions I / we consider reasonable. I / We undertake to bring in the promoter's contribution, to use the loan only for the purpose stated, and to furnish supplier quotations and any document marked as pending.",
  );
  const w = contentWidth(doc);
  const y = doc.y + 40;
  const name = input.promoters.find((p) => p.name.trim())?.name ?? "";
  doc.font(SANS).fontSize(9).fillColor(BODY).text(`Place: ${input.district || "____________"}`, M, y, { width: w / 2 });
  doc.text("Date: ____________", M, y + 16, { width: w / 2 });
  doc.moveTo(M + w - 190, y + 10).lineTo(M + w, y + 10).lineWidth(0.6).strokeColor(INK).stroke();
  doc.font(SANS_BOLD).fontSize(9.5).fillColor(INK).text(name || "Signature of promoter", M + w - 190, y + 16, { width: 190, align: "center" });
  doc.font(SANS).fontSize(8).fillColor(MUTED).text(`For ${input.businessName}`, M + w - 190, doc.y + 2, { width: 190, align: "center" });
  doc.y = Math.max(doc.y, y + 50) + 20;
  lay.note("This report has been prepared from information furnished by the promoter. It is not an audit or a certification by a Chartered Accountant, and does not represent a sanction by any bank or government agency.");
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
    doc.text(`Page ${i + 1} of ${range.count}`, M, fy, { width: w, align: "right", lineBreak: false });
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
  summary(lay, text, report); // 1
  glance(lay, input, report); // 2
  promoterProfile(lay, input, text); // 3
  schemeEligibility(lay, input, report); // 4
  lay.section("Project Profile", { fresh: true }); // 5
  textBlock(lay, text, ["introduction", "project", "employment"]);
  lay.section("Market Analysis"); // 6
  textBlock(lay, text, ["market", "marketing"]);
  lay.section("Manufacturing / Service Process", { fresh: true }); // 7
  lay.para(text.process);
  lay.section("Machinery and Equipment"); // 8
  machineryDetails(lay, input, text);
  productionAndMaterials(lay, input, report, text); // 9
  statutoryCompliance(lay, input, report); // 10
  costAndMeans(lay, input, report); // 11, 12
  workingCapital(lay, input, report); // 13
  employees(lay, input, report); // 14
  repaymentAndDepreciation(lay, input, report); // 15, 16
  profitability(lay, report); // 17
  balanceSheet(lay, report); // 18
  cashFlow(lay, input, report); // 19
  ratios(lay, report); // 20
  breakEvenAndSensitivity(lay, input, report); // 21, 22
  lay.section("Risk Analysis and SWOT", { fresh: true }); // 23
  textBlock(lay, text, ["risks", "swot"]);
  lay.section("Implementation Schedule"); // 24
  lay.para(text.implementation);
  lay.section("Conclusion and Declaration", { fresh: true }); // 25
  lay.para(text.conclusion);
  declaration(lay, input);
  annexureRepayment(lay, input, report); // 26
  assumptionsAndGaps(lay, input, report); // 27, 28
  documentChecklist(lay, input, report); // 29

  doc.switchToPage(1);
  contents(doc, lay.toc);
  decorate(doc, record);
  return buffer(doc);
}
