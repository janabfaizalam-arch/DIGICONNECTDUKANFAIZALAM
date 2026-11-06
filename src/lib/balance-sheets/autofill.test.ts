import { describe, expect, it } from "vitest";

import { FIELD_LABELS } from "@/lib/balance-sheets/checks";
import { FIELD_GUIDE } from "@/lib/balance-sheets/field-guide";
import {
  FILLABLE_KEYS,
  MODEL_RESPONSE_SCHEMA,
  cleanAmount,
  crossCheckNotes,
  mergeSuggestions,
  validateSuggestion,
  type Suggestion,
} from "@/lib/balance-sheets/autofill";

const s = (field: Suggestion["field"], value: string, docType: Suggestion["docType"], confidence: Suggestion["confidence"] = "high"): Suggestion => ({
  field,
  value,
  docType,
  fileName: `${docType}.pdf`,
  evidence: "",
  confidence,
});

describe("amounts from documents", () => {
  it("reads the ways an amount is printed", () => {
    expect(cleanAmount("Rs. 21,50,000.00")).toBe("2150000");
    expect(cleanAmount("₹ 1,20,000")).toBe("120000");
    expect(cleanAmount(345678)).toBe("345678");
    expect(cleanAmount("12.5")).toBe("12.5");
  });

  it("refuses negatives, words and nonsense", () => {
    for (const bad of ["(12,000)", "-500", "21.5 lakh", "nil", "", "1e13"]) expect(cleanAmount(bad)).toBeNull();
  });
});

describe("validating what the model says", () => {
  it("keeps a known box with a sane value", () => {
    expect(validateSuggestion({ field: "actual.sales", value: "21,50,000", evidence: "Gross turnover 2150000", confidence: "high" }, "itr", "itr.pdf")).toMatchObject({
      field: "actual.sales",
      value: "2150000",
      confidence: "high",
    });
  });

  it("drops unknown boxes and bad identifiers", () => {
    expect(validateSuggestion({ field: "actual.tds", value: "5000" }, "ais", "ais.pdf")).toBeNull();
    expect(validateSuggestion({ field: "pan", value: "ABC1234" }, "itr", "itr.pdf")).toBeNull();
    expect(validateSuggestion({ field: "gstin", value: "09ABCDE1234F" }, "itr", "itr.pdf")).toBeNull();
    expect(validateSuggestion({ field: "mobile", value: "12345" }, "itr", "itr.pdf")).toBeNull();
    expect(validateSuggestion({ field: "projection.loanInterestPct", value: "85" }, "dpr", "dpr.pdf")).toBeNull();
    expect(validateSuggestion({ field: "projection.loanTenureYears", value: "4.5" }, "dpr", "dpr.pdf")).toBeNull();
  });

  it("normalises PAN, mobile and the financial year", () => {
    expect(validateSuggestion({ field: "pan", value: "abcde 1234 f" }, "itr", "x")?.value).toBe("ABCDE1234F");
    expect(validateSuggestion({ field: "mobile", value: "+91 98765 43210" }, "itr", "x")?.value).toBe("9876543210");
    expect(validateSuggestion({ field: "baseYear", value: "FY 2024-25" }, "itr", "x")?.value).toBe("2024");
  });

  it("treats a missing or odd confidence as low, and trims the evidence", () => {
    const result = validateSuggestion({ field: "actual.rent", value: "60000", confidence: "certain", evidence: "x".repeat(400) }, "itr", "x");
    expect(result?.confidence).toBe("low");
    expect(result?.evidence.length).toBe(160);
  });
});

describe("merging several documents", () => {
  it("believes the ITR over AIS for the actual year, and keeps the other value visible", () => {
    const [sales] = mergeSuggestions([s("actual.sales", "2000000", "ais"), s("actual.sales", "2150000", "itr")]);
    expect(sales.value).toBe("2150000");
    expect(sales.docType).toBe("itr");
    expect(sales.alternatives.map((other) => other.value)).toEqual(["2000000"]);
  });

  it("believes the DPR for projections", () => {
    const [loan] = mergeSuggestions([s("projection.newTermLoan", "700000", "itr", "low"), s("projection.newTermLoan", "720000", "dpr")]);
    expect(loan.docType).toBe("dpr");
  });

  it("does not list an agreeing document as an alternative", () => {
    const [pan] = mergeSuggestions([s("pan", "ABCDE1234F", "itr"), s("pan", "ABCDE1234F", "ais")]);
    expect(pan.alternatives).toEqual([]);
  });

  it("notes when ITR sales and AIS turnover differ by more than 10%", () => {
    expect(crossCheckNotes([s("actual.sales", "2000000", "itr"), s("actual.sales", "2500000", "ais")])[0]).toMatch(/Bank ye farak poochhega/);
    expect(crossCheckNotes([s("actual.sales", "2000000", "itr"), s("actual.sales", "2100000", "ais")])).toEqual([]);
  });
});

describe("the fillable list", () => {
  it("only names boxes the form has, each with a guide", () => {
    for (const key of FILLABLE_KEYS) {
      expect(key in FIELD_LABELS || key in FIELD_GUIDE, key).toBe(true);
    }
  });

  it("is the enum the model must answer with", () => {
    expect(MODEL_RESPONSE_SCHEMA.properties.fields.items.properties.field.enum).toEqual(FILLABLE_KEYS);
  });
});
