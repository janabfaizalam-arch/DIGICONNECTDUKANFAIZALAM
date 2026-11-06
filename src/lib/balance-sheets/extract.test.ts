import PDFDocument from "pdfkit";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { readCode } from "@/lib/testing/source";

const readDocumentsAsJson = vi.fn();
vi.mock("@/lib/ai/gemini", async (original) => ({
  ...(await original<typeof import("@/lib/ai/gemini")>()),
  readDocumentsAsJson: (...args: unknown[]) => readDocumentsAsJson(...args),
}));

const { ExtractError, extractFromUpload, instruction, partsFor, resultFromReply } = await import("@/lib/balance-sheets/extract");

function pdf(text: string, password?: string): Promise<Uint8Array> {
  return new Promise((resolve) => {
    const doc = new PDFDocument(password ? { userPassword: password, ownerPassword: "owner", pdfVersion: "1.7" } : {});
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(new Uint8Array(Buffer.concat(chunks))));
    doc.text(text);
    doc.end();
  });
}

const AIS_TEXT = `Annual Information Statement (AIS) Financial Year 2024-25 Assessment Year 2025-26
PAN ABCDE1234F Name RAMESH KUMAR. Part B: GST turnover reported by GSTN, GSTR-3B: 21,50,000.
Interest from savings bank account: 4,250. ${"Information reported by sources. ".repeat(8)}`;

describe("preparing an upload for the model", () => {
  it("sends the text of a text-layer PDF, not the file", async () => {
    const { parts, mode } = await partsFor({ name: "ais.pdf", type: "application/pdf", bytes: await pdf(AIS_TEXT) });
    expect(mode).toBe("text");
    expect(JSON.stringify(parts)).toContain("GST turnover reported by GSTN");
  });

  it("opens a password-locked AIS PDF only with the password", async () => {
    const bytes = await pdf(AIS_TEXT, "abcde1234f01011990");
    await expect(partsFor({ name: "ais.pdf", type: "application/pdf", bytes })).rejects.toMatchObject({ failure: "needs_password" });
    await expect(partsFor({ name: "ais.pdf", type: "application/pdf", bytes }, "wrong")).rejects.toMatchObject({ failure: "wrong_password" });
    const { parts } = await partsFor({ name: "ais.pdf", type: "application/pdf", bytes }, "abcde1234f01011990");
    expect(JSON.stringify(parts)).toContain("21,50,000");
  });

  it("sends a scan (a PDF with no text) as the file itself", async () => {
    const { parts, mode } = await partsFor({ name: "scan.pdf", type: "application/pdf", bytes: await pdf(" ") });
    expect(mode).toBe("file");
    expect(parts[0]).toHaveProperty("inlineData.mimeType", "application/pdf");
  });

  it("reads an ITR JSON as text and a photo as an image", async () => {
    const json = new TextEncoder().encode(JSON.stringify({ ITR: { ITR4: { PersonalInfo: { PAN: "ABCDE1234F" } } } }));
    expect((await partsFor({ name: "itr.json", type: "application/json", bytes: json })).mode).toBe("text");
    const image = await partsFor({ name: "photo.jpg", type: "image/jpeg", bytes: new Uint8Array([255, 216, 255]) });
    expect(image.parts[0]).toHaveProperty("inlineData.mimeType", "image/jpeg");
  });

  it("refuses other file types and empty files", async () => {
    await expect(partsFor({ name: "sheet.xlsx", type: "application/vnd.ms-excel", bytes: new Uint8Array([1]) })).rejects.toBeInstanceOf(ExtractError);
    await expect(partsFor({ name: "a.txt", type: "text/plain", bytes: new Uint8Array() })).rejects.toMatchObject({ failure: "empty" });
  });
});

describe("the instruction", () => {
  it("forbids calculating and lists every fillable box", () => {
    const text = instruction("itr.pdf");
    expect(text).toMatch(/Never calculate, total, estimate or guess/);
    expect(text).toContain("actual.closingStock");
    expect(text).toContain("projection.ccLimit");
  });
});

describe("checking the reply", () => {
  it("keeps valid figures, drops the rest, and passes the model's notes on", () => {
    const result = resultFromReply(
      {
        documents: [{ docType: "ais", period: "AY 2025-26", summary: "AIS for FY 2024-25" }],
        fields: [
          { field: "actual.sales", value: "2150000", evidence: "GST turnover 21,50,000", confidence: "high" },
          { field: "actual.tds", value: "5000", evidence: "TDS", confidence: "high" },
          { field: "pan", value: "BAD", evidence: "PAN", confidence: "high" },
        ],
        notes: ["Ye AIS hai, books nahi."],
      },
      "ais.pdf",
    );
    expect(result.documents[0]).toMatchObject({ docType: "ais", period: "AY 2025-26" });
    expect(result.suggestions.map((s) => s.field)).toEqual(["actual.sales"]);
    expect(result.notes).toContain("Ye AIS hai, books nahi.");
  });

  it("calls an unknown document type 'other' and a malformed reply a failure", () => {
    expect(resultFromReply({ documents: [{ docType: "passport" }], fields: [] }, "x.pdf").documents[0].docType).toBe("other");
    expect(() => resultFromReply({ fields: "nope" }, "x.pdf")).toThrow(ExtractError);
  });
});

describe("the whole read", () => {
  beforeEach(() => {
    readDocumentsAsJson.mockReset();
  });

  it("passes the document and the schema to the model and returns checked figures", async () => {
    readDocumentsAsJson.mockResolvedValue({
      documents: [{ docType: "ais", period: "AY 2025-26" }],
      fields: [{ field: "actual.otherIncome", value: "4250", evidence: "Interest from savings bank account: 4,250", confidence: "high" }],
    });
    const result = await extractFromUpload({ name: "ais.pdf", type: "application/pdf", bytes: await pdf(AIS_TEXT) });
    expect(result.suggestions).toEqual([expect.objectContaining({ field: "actual.otherIncome", value: "4250", docType: "ais", fileName: "ais.pdf" })]);
    const call = readDocumentsAsJson.mock.calls[0][0];
    expect(JSON.stringify(call.parts)).toContain("Interest from savings bank account");
    expect(call.responseSchema).toHaveProperty("properties.fields");
  });

  it("turns a model failure into a failure code, not the upstream message", async () => {
    readDocumentsAsJson.mockImplementation(() => Promise.reject(Object.assign(new Error("429 RESOURCE_EXHAUSTED key=AIzaSECRET"), { status: 429 })));
    let failure: unknown;
    try {
      await extractFromUpload({ name: "a.txt", type: "text/plain", bytes: new TextEncoder().encode("Turnover 100") });
    } catch (caught) {
      failure = caught;
    }
    expect(failure).toBeInstanceOf(ExtractError);
    expect(failure).toMatchObject({ failure: "rate_limited", message: "rate_limited" });
  });
});

describe("keeping the key and the documents safe", () => {
  const extract = readCode("src/lib/balance-sheets/extract.ts");
  const route = readCode("src/app/api/admin/balance-sheets/extract/route.ts");
  const ui = readCode("src/components/admin/balance-sheet-autofill.tsx");

  it("reaches Gemini only through the server-only module", () => {
    for (const file of [extract, route, ui]) {
      expect(file).not.toContain("GEMINI_API_KEY");
      expect(file).not.toContain("new GoogleGenAI");
    }
    expect(extract.startsWith('import "server-only";')).toBe(true);
    expect(extract).toContain('from "@/lib/ai/gemini"');
  });

  it("is admin-only and answers from a fixed message table", () => {
    expect(route).toContain("requireAdmin()");
    expect(route).toContain("MESSAGES[failure]");
    expect(route).not.toMatch(/message:\s*[a-zA-Z]*\.message/);
  });

  it("never stores or logs the document", () => {
    for (const file of [extract, route]) {
      expect(file).not.toMatch(/writeFile|storage\.from|\.upload\(|insert\(/);
      expect(file).not.toMatch(/console\.(log|error)\([^)]*(text|bytes|parts|reply)/);
    }
  });
});
