import { describe, expect, it } from "vitest";

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
