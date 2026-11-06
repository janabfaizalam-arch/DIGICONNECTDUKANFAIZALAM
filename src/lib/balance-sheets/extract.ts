import "server-only";

import { PDFParse } from "pdf-parse";

import { GeminiError, classify, readDocumentsAsJson, redactSecrets, type DocumentPart, type GeminiFailure } from "@/lib/ai/gemini";
import {
  DOC_TYPES,
  FILLABLE,
  MODEL_RESPONSE_SCHEMA,
  modelReplySchema,
  validateSuggestion,
  type DocType,
  type ExtractResult,
} from "@/lib/balance-sheets/autofill";

/**
 * Read one uploaded document and return the figures it holds.
 *
 * Text is pulled out of a PDF on this server first (with the password the
 * admin gives, for AIS / 26AS PDFs, which the Income Tax portal locks), and
 * only the text goes to Gemini. A scanned PDF with no text layer, or a
 * photo, goes as the file itself. Nothing is written to disk or to the
 * database, and the content is never logged.
 */

export type ExtractFailure =
  | "too_large"
  | "unsupported"
  | "needs_password"
  | "wrong_password"
  | "unreadable"
  | "empty"
  | GeminiFailure;

export class ExtractError extends Error {
  constructor(readonly failure: ExtractFailure) {
    super(failure);
    this.name = "ExtractError";
  }
}

const MAX_TEXT_CHARS = 120_000;
/** Less text than this from a PDF means a scan: send the file instead. */
const MIN_TEXT_CHARS = 200;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type Upload = { name: string; type: string; bytes: Uint8Array };

function kindOf(upload: Upload): "pdf" | "text" | "image" | null {
  const name = upload.name.toLowerCase();
  if (upload.type === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (IMAGE_TYPES.has(upload.type) || /\.(jpe?g|png|webp)$/.test(name)) return "image";
  if (/^(text\/|application\/(json|xml))/.test(upload.type) || /\.(json|txt|csv|xml)$/.test(name)) return "text";
  return null;
}

async function pdfText(bytes: Uint8Array, password: string | undefined) {
  const parser = new PDFParse({ data: bytes, password: password || undefined });
  try {
    const result = await parser.getText();
    return result.text ?? "";
  } catch (caught) {
    const name = caught instanceof Error ? caught.name : "";
    const message = caught instanceof Error ? caught.message : "";
    if (name === "PasswordException") throw new ExtractError(/incorrect/i.test(message) ? "wrong_password" : "needs_password");
    throw new ExtractError("unreadable");
  } finally {
    await parser.destroy().catch(() => undefined);
  }
}

/** The parts sent to Gemini for one upload. Exported for tests. */
export async function partsFor(upload: Upload, password?: string): Promise<{ parts: DocumentPart[]; mode: "text" | "file" }> {
  const kind = kindOf(upload);
  if (!kind) throw new ExtractError("unsupported");

  if (kind === "text") {
    const text = new TextDecoder("utf-8", { fatal: false }).decode(upload.bytes).trim();
    if (!text) throw new ExtractError("empty");
    return { parts: [{ text: `File "${upload.name}":\n${text.slice(0, MAX_TEXT_CHARS)}` }], mode: "text" };
  }

  if (kind === "image") {
    return {
      parts: [{ inlineData: { mimeType: upload.type || "image/jpeg", data: Buffer.from(upload.bytes).toString("base64") } }],
      mode: "file",
    };
  }

  // pdf-parse consumes the buffer it is given; keep the original for a scan.
  const text = (await pdfText(upload.bytes.slice(), password)).replace(/\n{3,}/g, "\n\n").trim();
  if (text.length >= MIN_TEXT_CHARS) {
    return { parts: [{ text: `File "${upload.name}" (text taken from the PDF):\n${text.slice(0, MAX_TEXT_CHARS)}` }], mode: "text" };
  }
  if (password) {
    // A locked scan: Gemini cannot open an encrypted PDF, and there is no text to send.
    throw new ExtractError("unreadable");
  }
  return { parts: [{ inlineData: { mimeType: "application/pdf", data: Buffer.from(upload.bytes).toString("base64") } }], mode: "file" };
}

export function instruction(fileName: string) {
  const fields = Object.entries(FILLABLE)
    .map(([key, meaning]) => `- ${key}: ${meaning}`)
    .join("\n");
  return `
You read Indian tax and business documents for a chartered accountant's office that is preparing a bank loan file.
The document above is "${fileName}". It is one of: ITR (acknowledgement, full return PDF or the JSON from the
Income Tax utility; ITR-3 Part A-P&L / Part A-BS, ITR-4 "financial particulars of the business"), AIS, TIS,
Form 26AS, a tax computation, a DPR / project report, a balance sheet / P&L, or something else.

Rules:
1. Report only figures that are printed in the document. Never calculate, total, estimate or guess.
   If a figure is not there, leave it out. An empty list is a correct answer.
2. Amounts in rupees, digits only (2150000, not "21.5 lakh" or "21,50,000"). Percentages and years as plain numbers.
3. For every figure give "evidence": the label and figure as printed, at most 160 characters.
4. confidence: "high" when the label clearly matches; "medium" when the label is close; "low" when unsure.
5. AIS / TIS / 26AS show what others reported (GST turnover, TDS receipts, interest). Report GST or business
   turnover there as actual.sales and interest as actual.otherIncome; do not put TDS or tax deducted anywhere.
6. A DPR's projections and means of finance go in the projection.* fields; its past figures, if any, in actual.*.
7. In "documents" name the document type and its period (e.g. "AY 2025-26" or "FY 2024-25").
8. In "notes", in simple Hinglish, mention anything the CA should check (e.g. ITR filed under 44AD, so no books;
   figures are provisional; two years in one document). Keep each note under 200 characters.

Fields you may fill:
${fields}
`.trim();
}

const DOC_TYPE_SET = new Set<string>(DOC_TYPES);

/** Validate the model's reply for one file. Exported for tests. */
export function resultFromReply(reply: unknown, fileName: string): ExtractResult {
  const parsed = modelReplySchema.safeParse(reply);
  if (!parsed.success) throw new ExtractError("upstream");
  const doc = parsed.data.documents[0];
  const docType: DocType = doc && DOC_TYPE_SET.has(doc.docType) ? (doc.docType as DocType) : "other";
  const suggestions = parsed.data.fields
    .map((field) => validateSuggestion(field, docType, fileName))
    .filter((suggestion): suggestion is NonNullable<typeof suggestion> => suggestion !== null);
  return {
    documents: [{ fileName, docType, period: doc?.period?.trim() || null, summary: (doc?.summary ?? "").trim().slice(0, 200) }],
    suggestions,
    // Cross-document checks run in the browser, where every file's figures meet.
    notes: parsed.data.notes.map((note) => note.trim().slice(0, 240)).filter(Boolean).slice(0, 6),
  };
}

export async function extractFromUpload(upload: Upload, password?: string): Promise<ExtractResult> {
  const { parts } = await partsFor(upload, password);
  try {
    const reply = await readDocumentsAsJson({ parts, instruction: instruction(upload.name), responseSchema: MODEL_RESPONSE_SCHEMA });
    return resultFromReply(reply, upload.name);
  } catch (caught) {
    if (caught instanceof ExtractError) throw caught;
    const failure = caught instanceof GeminiError ? caught.failure : classify(caught);
    // The failure kind only: the message can carry a request URL.
    console.error("[balance-sheets] document read failed", failure, redactSecrets(caught instanceof Error ? caught.name : "error"));
    throw new ExtractError(failure);
  }
}
