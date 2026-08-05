import { describe, expect, it } from "vitest";

import {
  CUSTOMER_MASTER_FIRST_DATA_ROW,
  CUSTOMER_MASTER_HEADER_ROW,
  CUSTOMER_WORK_FIRST_DATA_ROW,
  CUSTOMER_WORK_HEADER_ROW,
  CUSTOMER_WORK_SHEET,
  getSheetLayout,
  isValidSheetDataRow,
} from "@/lib/googleSheetsLayout";
import { resolveCrmPayment } from "@/lib/paymentSync";
import { crmDatesForStatus, mapApplicationStatusToCrm } from "@/lib/statusSync";

describe("CRM payment rules", () => {
  it("marks unpaid when nothing received", () => {
    expect(resolveCrmPayment({ totalFee: 500, amountReceived: 0 })).toEqual({
      totalFee: 500,
      amountReceived: 0,
      balance: 500,
      paymentStatus: "Unpaid",
    });
  });

  it("marks partially paid", () => {
    const result = resolveCrmPayment({ totalFee: 500, amountReceived: 200 });
    expect(result.paymentStatus).toBe("Partially Paid");
    expect(result.balance).toBe(300);
  });

  it("marks paid when verified even if amount fields empty", () => {
    const result = resolveCrmPayment({ totalFee: 500, amountReceived: 0, paymentStatus: "verified" });
    expect(result.paymentStatus).toBe("Paid");
    expect(result.balance).toBe(0);
    expect(result.amountReceived).toBe(500);
  });
});

describe("CRM Customer Work row layout", () => {
  it("keeps headers on row 2 and data from row 3", () => {
    expect(CUSTOMER_WORK_HEADER_ROW).toBe(2);
    expect(CUSTOMER_WORK_FIRST_DATA_ROW).toBe(3);
    const layout = getSheetLayout(CUSTOMER_WORK_SHEET);
    expect(layout.headerRow).toBe(2);
    expect(layout.firstDataRow).toBe(3);
    expect(isValidSheetDataRow(CUSTOMER_WORK_SHEET, 1)).toBe(false);
    expect(isValidSheetDataRow(CUSTOMER_WORK_SHEET, 2)).toBe(false);
    expect(isValidSheetDataRow(CUSTOMER_WORK_SHEET, 3)).toBe(true);
  });

  it("keeps Customer Master header on row 1", () => {
    expect(CUSTOMER_MASTER_HEADER_ROW).toBe(1);
    expect(CUSTOMER_MASTER_FIRST_DATA_ROW).toBe(2);
  });
});

describe("CRM status rules", () => {
  it("maps statuses for office sheet", () => {
    expect(mapApplicationStatusToCrm("payment_pending")).toBe("New");
    expect(mapApplicationStatusToCrm("in_progress")).toBe("In Process");
    expect(mapApplicationStatusToCrm("documents_required")).toBe("Documents Pending");
    expect(mapApplicationStatusToCrm("completed")).toBe("Completed");
    expect(mapApplicationStatusToCrm("cancelled")).toBe("Cancelled");
  });

  it("clears follow-up on completed/cancelled", () => {
    expect(crmDatesForStatus("completed").nextFollowUp).toBe("");
    expect(crmDatesForStatus("cancelled").nextFollowUp).toBe("");
    expect(crmDatesForStatus("completed").completedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(crmDatesForStatus("new").nextFollowUp).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
