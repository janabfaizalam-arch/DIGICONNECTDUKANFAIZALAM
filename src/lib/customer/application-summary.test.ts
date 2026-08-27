import { describe, expect, it } from "vitest";

import { collectTasks, countApplications } from "@/lib/customer/application-summary";

function app(overrides: Partial<Parameters<typeof countApplications>[0][number]> = {}) {
  return {
    id: "a1",
    service_name: "GST Registration",
    status: "in_progress",
    payment_status: "paid",
    created_at: "2026-02-01T00:00:00Z",
    ...overrides,
  };
}

describe("countApplications", () => {
  it("counts an empty list as all zeros", () => {
    expect(countApplications([])).toEqual({
      total: 0,
      active: 0,
      needsDocuments: 0,
      needsPayment: 0,
      completed: 0,
    });
  });

  it("does not count a finished application as active", () => {
    const counts = countApplications([app({ status: "completed" }), app({ id: "a2", status: "delivered" })]);
    expect(counts.completed).toBe(2);
    expect(counts.active).toBe(0);
  });

  it("does not count a cancelled or refunded application as active", () => {
    const counts = countApplications([app({ status: "cancelled" }), app({ id: "a2", status: "refunded" })]);
    expect(counts.active).toBe(0);
    expect(counts.completed).toBe(0);
  });

  it("counts a failed payment as needing payment, not just a pending one", () => {
    const counts = countApplications([
      app({ payment_status: "pending" }),
      app({ id: "a2", payment_status: "failed" }),
      app({ id: "a3", payment_status: "paid" }),
    ]);
    expect(counts.needsPayment).toBe(2);
  });

  it("counts both spellings of a documents-required status", () => {
    const counts = countApplications([
      app({ status: "documents_required" }),
      app({ id: "a2", status: "document_pending" }),
    ]);
    expect(counts.needsDocuments).toBe(2);
  });
});

describe("collectTasks", () => {
  it("returns nothing when no application is waiting on the customer", () => {
    expect(collectTasks([app({ status: "completed" }), app({ id: "a2", status: "in_progress" })])).toEqual([]);
  });

  it("puts an unpaid fee before missing documents", () => {
    const tasks = collectTasks([
      app({ id: "docs", service_name: "Passport", status: "documents_required" }),
      app({ id: "pay", service_name: "ITR Filing", status: "submitted", payment_status: "pending" }),
    ]);
    expect(tasks.map((task) => task.applicationId)).toEqual(["pay", "docs"]);
    expect(tasks[0].action.key).toBe("pay_now");
  });

  it("includes an objection as something to respond to", () => {
    const tasks = collectTasks([app({ status: "objection" })]);
    expect(tasks).toHaveLength(1);
    expect(tasks[0].action.key).toBe("view_respond");
  });

  it("does not invent work out of an application that is simply in progress", () => {
    expect(collectTasks([app({ status: "in_progress", payment_status: "paid" })])).toEqual([]);
  });

  it("orders equally urgent tasks predictably", () => {
    const tasks = collectTasks([
      app({ id: "b", service_name: "Zeta", status: "documents_required" }),
      app({ id: "a", service_name: "Alpha", status: "documents_required" }),
    ]);
    expect(tasks.map((task) => task.serviceName)).toEqual(["Alpha", "Zeta"]);
  });
});
