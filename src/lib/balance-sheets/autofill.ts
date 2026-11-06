import { z } from "zod";

import type { DetailKey, FieldKey } from "@/lib/balance-sheets/checks";

/**
 * Filling the balance sheet form from a customer's documents.
 *
 * The server reads an uploaded ITR, AIS, TIS, Form 26AS, tax computation or
 * DPR and asks Gemini which figures it contains. What comes back is treated
 * as a suggestion, never as a fact: every value is checked here (known box,
 * sane number, PAN in the right shape, a quote from the document), the
 * admin sees each one beside its source and ticks what to use, and boxes
 * filled this way stay marked until somebody edits them. Nothing is
 * calculated by the model; it only reports figures printed in the document.
 *
 * Shared by the server route and the browser, so it holds no secrets.
 */

export const DOC_TYPES = ["itr", "ais", "tis", "form26as", "computation", "dpr", "financials", "other"] as const;
export type DocType = (typeof DOC_TYPES)[number];

export const DOC_LABELS: Record<DocType, string> = {
  itr: "ITR",
  ais: "AIS",
  tis: "TIS",
  form26as: "Form 26AS",
  computation: "Tax computation",
  dpr: "DPR / project report",
  financials: "Balance sheet / P&L",
  other: "Document",
};

/** Boxes a document can fill, with what to look for, for the model's instructions. */
export const FILLABLE: Partial<Record<FieldKey | "baseYear" | "natureOfBusiness" | "address" | "city" | "state" | "udyamNumber" | "bankName" | "loanPurpose", string>> = {
  businessName: "Trade name / name of the business or firm.",
  ownerName: "Name of the assessee, proprietor, partners or directors.",
  pan: "PAN of the assessee (10 characters).",
  gstin: "GSTIN (15 characters), if shown.",
  mobile: "Mobile number of the assessee.",
  email: "Email address of the assessee.",
  address: "Address line (flat / door, road, area), without city, state and pincode.",
  city: "Town or city.",
  state: "State.",
  pincode: "6-digit pincode.",
  natureOfBusiness: "Nature of business or profession, in a few words.",
  udyamNumber: "Udyam registration number, if shown.",
  bankName: "Bank and branch the loan is being applied to (DPR only).",
  loanPurpose: "Purpose of the loan (DPR only).",
  loanAmount: "Total loan applied for (DPR only).",
  baseYear: "The financial year the figures are for, as its starting calendar year: FY 2024-25 (AY 2025-26) is 2024.",
  "actual.sales": "Gross turnover / gross receipts / sales for the year (ITR P&L, ITR-4 presumptive turnover, computation).",
  "actual.otherIncome": "Other income credited to P&L (interest, commission, rent received).",
  "actual.openingStock": "Opening stock.",
  "actual.purchases": "Purchases (net of returns).",
  "actual.directExpenses": "Direct expenses: freight inward, wages, power and fuel, other manufacturing expenses.",
  "actual.closingStock": "Closing stock / inventory / stock-in-trade at year end.",
  "actual.salaries": "Salaries and wages to employees (indirect).",
  "actual.rent": "Rent.",
  "actual.adminExpenses": "Office, administrative, electricity, telephone, printing and stationery expenses.",
  "actual.otherExpenses": "Other indirect expenses not listed above (repairs, insurance, travel, professional fees).",
  "actual.interest": "Interest on loans / finance cost.",
  "actual.depreciation": "Depreciation for the year.",
  "actual.tax": "Income tax payable / tax on total income for the year.",
  "actual.openingCapital": "Proprietor's / partners' capital at the start of the year.",
  "actual.capitalIntroduced": "Capital introduced during the year.",
  "actual.drawings": "Drawings during the year.",
  "actual.fixedAssets": "Net block of fixed assets at year end.",
  "actual.investments": "Investments at year end.",
  "actual.debtors": "Sundry debtors / trade receivables at year end.",
  "actual.cashAndBank": "Cash in hand plus bank balances at year end.",
  "actual.otherCurrentAssets": "Loans and advances, deposits and other current assets at year end.",
  "actual.termLoan": "Secured loans / term loans from banks outstanding at year end.",
  "actual.unsecuredLoans": "Unsecured loans at year end.",
  "actual.creditors": "Sundry creditors / trade payables at year end.",
  "actual.otherCurrentLiabilities": "Other current liabilities and provisions at year end.",
  "projection.year1Sales": "Projected sales for the first year (DPR).",
  "projection.newFixedAssets": "Cost of plant, machinery and other fixed assets in the project (DPR).",
  "projection.workingCapitalNeed": "Working capital in the project cost (DPR).",
  "projection.capitalIntroducedYear1": "Promoter's / own contribution in the means of finance (DPR).",
  "projection.newTermLoan": "Term loan in the means of finance (DPR).",
  "projection.ccLimit": "Cash credit / working capital loan in the means of finance (DPR).",
  "projection.loanInterestPct": "Interest rate on the term loan, percent (DPR).",
  "projection.loanTenureYears": "Repayment period of the term loan, years (DPR).",
  "projection.ccInterestPct": "Interest rate on the cash credit, percent (DPR).",
  "projection.subsidyAmount": "Margin money / capital subsidy under a scheme (DPR).",
};

export type FillableKey = keyof typeof FILLABLE;
export const FILLABLE_KEYS = Object.keys(FILLABLE) as FillableKey[];

const TEXT_KEYS = new Set<FillableKey>([
  "businessName",
  "ownerName",
  "pan",
  "gstin",
  "mobile",
  "email",
  "address",
  "city",
  "state",
  "pincode",
  "natureOfBusiness",
  "udyamNumber",
  "bankName",
  "loanPurpose",
]);

export const CONFIDENCE = ["high", "medium", "low"] as const;
export type Confidence = (typeof CONFIDENCE)[number];

/** One figure found in one document. */
export type Suggestion = {
  field: FillableKey;
  value: string;
  docType: DocType;
  fileName: string;
  /** Up to ~160 characters copied from the document, so the admin can see where it came from. */
  evidence: string;
  confidence: Confidence;
};

export type DocumentInfo = { fileName: string; docType: DocType; period: string | null; summary: string };

export type ExtractResult = { documents: DocumentInfo[]; suggestions: Suggestion[]; notes: string[] };

/** What the model is asked to return. Loose on purpose: validation below decides. */
export const modelReplySchema = z.object({
  documents: z
    .array(z.object({ docType: z.string(), period: z.string().nullish(), summary: z.string().nullish() }))
    .default([]),
  fields: z
    .array(
      z.object({
        field: z.string(),
        value: z.union([z.string(), z.number()]),
        evidence: z.string().nullish(),
        confidence: z.string().nullish(),
      }),
    )
    .default([]),
  notes: z.array(z.string()).default([]),
});

/** JSON schema handed to Gemini as the response shape. */
export const MODEL_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    documents: {
      type: "array",
      items: {
        type: "object",
        properties: {
          docType: { type: "string", enum: [...DOC_TYPES] },
          period: { type: "string", description: "Financial or assessment year, e.g. FY 2024-25 / AY 2025-26." },
          summary: { type: "string", description: "One short line on what the document is." },
        },
        required: ["docType"],
      },
    },
    fields: {
      type: "array",
      items: {
        type: "object",
        properties: {
          field: { type: "string", enum: FILLABLE_KEYS },
          value: { type: "string", description: "The figure exactly as printed, digits only for amounts (no commas or Rs.)." },
          evidence: { type: "string", description: "The words and figure as printed in the document, at most 160 characters." },
          confidence: { type: "string", enum: [...CONFIDENCE] },
        },
        required: ["field", "value", "evidence", "confidence"],
      },
    },
    notes: { type: "array", items: { type: "string" } },
  },
  required: ["documents", "fields"],
} as const;

const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

/** Turn "Rs. 21,50,000.00" or "(12,000)" into "2150000" / null for a negative. */
export function cleanAmount(raw: string | number): string | null {
  const text = String(raw).trim();
  if (/^\(.*\)$/.test(text) || /^-/.test(text)) return null; // negatives do not belong in these boxes
  const digits = text.replace(/rs\.?|inr|₹|,|\s/gi, "");
  if (!/^\d+(\.\d+)?$/.test(digits)) return null;
  const value = Number(digits);
  if (!Number.isFinite(value) || value < 0 || value > 1e12) return null;
  return String(Math.round(value * 100) / 100);
}

/**
 * Keep only suggestions that are about a known box and hold a value that
 * box can take. Anything else the model says is dropped, not repaired.
 */
export function validateSuggestion(
  raw: { field: string; value: string | number; evidence?: string | null; confidence?: string | null },
  docType: DocType,
  fileName: string,
): Suggestion | null {
  const field = raw.field as FillableKey;
  if (!(field in FILLABLE)) return null;
  const confidence = (CONFIDENCE as readonly string[]).includes(raw.confidence ?? "") ? (raw.confidence as Confidence) : "low";
  const evidence = String(raw.evidence ?? "").replace(/\s+/g, " ").trim().slice(0, 160);
  let value: string | null;

  if (TEXT_KEYS.has(field)) {
    value = String(raw.value).replace(/\s+/g, " ").trim().slice(0, 200);
    if (!value) return null;
    if (field === "pan") {
      value = value.toUpperCase().replace(/\s/g, "");
      if (!PAN_RE.test(value)) return null;
    }
    if (field === "gstin") {
      value = value.toUpperCase().replace(/\s/g, "");
      if (!GSTIN_RE.test(value)) return null;
    }
    if (field === "mobile") {
      value = value.replace(/\D/g, "").slice(-10);
      if (!/^[6-9]\d{9}$/.test(value)) return null;
    }
    if (field === "pincode") {
      value = value.replace(/\D/g, "");
      if (!/^[1-9]\d{5}$/.test(value)) return null;
    }
    if (field === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) return null;
  } else if (field === "baseYear") {
    const year = Number(String(raw.value).match(/\d{4}/)?.[0]);
    if (!Number.isInteger(year) || year < 2000 || year > 2100) return null;
    value = String(year);
  } else {
    value = cleanAmount(raw.value);
    if (value === null) return null;
    const n = Number(value);
    if ((field === "projection.loanInterestPct" || field === "projection.ccInterestPct") && (n <= 0 || n > 40)) return null;
    if (field === "projection.loanTenureYears" && (n < 1 || n > 30 || !Number.isInteger(n))) return null;
  }

  return { field, value, docType, fileName, evidence, confidence };
}

/** Which document to believe first for a box, when two disagree. */
const PRIORITY: Record<"details" | "actual" | "projection", DocType[]> = {
  details: ["itr", "computation", "financials", "dpr", "ais", "tis", "form26as", "other"],
  actual: ["financials", "itr", "computation", "tis", "ais", "form26as", "dpr", "other"],
  projection: ["dpr", "other", "financials", "itr", "computation", "ais", "tis", "form26as"],
};
const CONFIDENCE_RANK: Record<Confidence, number> = { high: 0, medium: 1, low: 2 };

function group(field: FillableKey) {
  if (field.startsWith("actual.")) return "actual" as const;
  if (field.startsWith("projection.")) return "projection" as const;
  return "details" as const;
}

export type MergedSuggestion = Suggestion & { alternatives: Suggestion[] };

/**
 * One suggestion per box across every document read: the best source wins,
 * and the others are kept beside it so a disagreement is visible.
 */
export function mergeSuggestions(all: Suggestion[]): MergedSuggestion[] {
  const byField = new Map<FillableKey, Suggestion[]>();
  for (const suggestion of all) byField.set(suggestion.field, [...(byField.get(suggestion.field) ?? []), suggestion]);

  const merged: MergedSuggestion[] = [];
  for (const [field, list] of byField) {
    const order = PRIORITY[group(field)];
    const sorted = [...list].sort(
      (a, b) => order.indexOf(a.docType) - order.indexOf(b.docType) || CONFIDENCE_RANK[a.confidence] - CONFIDENCE_RANK[b.confidence],
    );
    const [best, ...rest] = sorted;
    merged.push({ ...best, alternatives: rest.filter((other) => other.value !== best.value) });
  }
  return merged.sort((a, b) => FILLABLE_KEYS.indexOf(a.field) - FILLABLE_KEYS.indexOf(b.field));
}

/** Cross-checks a CA would make between documents, in Hinglish. */
export function crossCheckNotes(all: Suggestion[]): string[] {
  const notes: string[] = [];
  const sales = all.filter((s) => s.field === "actual.sales");
  const books = sales.find((s) => s.docType === "itr" || s.docType === "financials" || s.docType === "computation");
  const reported = sales.find((s) => s.docType === "ais" || s.docType === "tis" || s.docType === "form26as");
  if (books && reported) {
    const a = Number(books.value);
    const b = Number(reported.value);
    if (a > 0 && Math.abs(a - b) / a > 0.1) {
      notes.push(
        `${DOC_LABELS[books.docType]} ki sales Rs. ${a.toLocaleString("en-IN")} hai par ${DOC_LABELS[reported.docType]} mein Rs. ${b.toLocaleString("en-IN")}. Bank ye farak poochhega; dono milayein.`,
      );
    }
  }
  return notes;
}

export const isDetailKey = (key: FillableKey): key is DetailKey =>
  (["businessName", "ownerName", "pan", "gstin", "mobile", "pincode", "email", "loanAmount"] as string[]).includes(key);

/** Upload limits. Vercel refuses request bodies over 4.5 MB, so one file per request, under 4 MB. */
export const UPLOAD_MAX_BYTES = 4 * 1024 * 1024;
export const UPLOAD_MAX_FILES = 8;
export const UPLOAD_ACCEPT = ".pdf,.json,.txt,.csv,.xml,.jpg,.jpeg,.png,.webp";
