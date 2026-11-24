import "server-only";

import { loadPdfParse } from "@/lib/balance-sheets/pdf-text";

export class PdfPagesError extends Error {
  constructor(public reason: "password" | "unreadable") {
    super(reason);
  }
}

/**
 * Pages in a PDF, counted by a real PDF parser.
 *
 * The old counter searched the raw bytes for "/Type /Page". Most PDFs made
 * today (phones, Word, Chrome's "Save as PDF") keep their page objects inside
 * compressed object streams, where that text never appears — so it found
 * nothing, said 1, and a long document was charged as a single page while
 * the printer printed all of it.
 *
 * The byte scan is kept only as a floor: the larger of the two answers wins,
 * so a parser hiccup can never make a job cheaper.
 */
export async function countPdfPages(bytes: Buffer): Promise<number> {
  const scanned = scanPageCount(bytes);

  const { PDFParse } = await loadPdfParse();
  const parser = new PDFParse({ data: new Uint8Array(bytes) });
  try {
    const info = (await parser.getInfo()) as { total?: number };
    const total = Math.floor(Number(info?.total) || 0);
    return Math.max(1, total, scanned);
  } catch (caught) {
    const name = caught instanceof Error ? caught.name : "";
    if (name === "PasswordException") throw new PdfPagesError("password");
    if (scanned > 0) return scanned;
    throw new PdfPagesError("unreadable");
  } finally {
    await parser.destroy().catch(() => undefined);
  }
}

/** The byte-scan count: page objects, or the largest /Count in a page tree. */
export function scanPageCount(bytes: Buffer): number {
  const text = bytes.toString("latin1");
  const pages = (text.match(/\/Type\s*\/Page(?![s\w])/g) ?? []).length;
  let largestCount = 0;
  for (const match of text.matchAll(/\/Type\s*\/Pages[\s\S]{0,200}?\/Count\s+(\d+)/g)) {
    largestCount = Math.max(largestCount, Number(match[1]));
  }
  return Math.max(pages, largestCount);
}
