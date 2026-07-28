import { describe, expect, it } from "vitest";

import {
  isCustomerPaymentSettled,
  resolveCustomerNextAction,
} from "@/lib/applications/customer-next-action";

describe("resolveCustomerNextAction", () => {
  it("shows Pay Now for unpaid pending payment", () => {
    const action = resolveCustomerNextAction({
      applicationId: "app-1",
      status: "submitted",
      paymentStatus: "pending",
    });
    expect(action.key).toBe("pay_now");
    expect(action.label).toBe("Pay Now");
    expect(action.href).toBe("/pay/application/app-1");
  });

  it("hides Pay Now when payment is paid/verified", () => {
    expect(isCustomerPaymentSettled("paid")).toBe(true);
    expect(isCustomerPaymentSettled("verified")).toBe(true);
    const action = resolveCustomerNextAction({
      applicationId: "app-1",
      status: "submitted",
      paymentStatus: "paid",
    });
    expect(action.key).not.toBe("pay_now");
  });

  it("shows Upload Documents when documents are pending", () => {
    const action = resolveCustomerNextAction({
      applicationId: "app-2",
      status: "documents_required",
      paymentStatus: "verified",
      missingDocuments: true,
    });
    expect(action.key).toBe("upload_documents");
    expect(action.href).toContain("#documents");
  });

  it("shows View & Respond for objection", () => {
    const action = resolveCustomerNextAction({
      applicationId: "app-3",
      status: "objection",
      paymentStatus: "verified",
    });
    expect(action.key).toBe("view_respond");
  });

  it("shows Track Progress for in-process statuses", () => {
    const action = resolveCustomerNextAction({
      applicationId: "app-4",
      status: "in_process",
      paymentStatus: "verified",
    });
    expect(action.key).toBe("track_progress");
    expect(action.href).toBe("/customer/applications/app-4");
  });

  it("completed prefers invoice and never final-document download", () => {
    const withInvoice = resolveCustomerNextAction({
      applicationId: "app-5",
      status: "completed",
      paymentStatus: "verified",
      invoiceId: "inv-1",
    });
    expect(withInvoice.key).toBe("view_invoice");
    expect(withInvoice.href).toBe("/invoice/inv-1");
    expect(withInvoice.href).not.toContain("final");

    const withoutInvoice = resolveCustomerNextAction({
      applicationId: "app-5",
      status: "completed",
      paymentStatus: "verified",
    });
    expect(withoutInvoice.key).toBe("view_status");
    expect(withoutInvoice.href).toBe("/customer/applications/app-5");
  });

  it("cancelled shows View Details", () => {
    const action = resolveCustomerNextAction({
      applicationId: "app-6",
      status: "cancelled",
      paymentStatus: "pending",
    });
    expect(action.key).toBe("view_details");
  });
});
