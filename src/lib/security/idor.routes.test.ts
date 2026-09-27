/**
 * Cross-customer access (IDOR) and payment tampering, against the real route
 * handlers.
 *
 * Only two things are replaced: who the session says the caller is
 * (getCurrentUser) and the database (an in-memory FakeSupabase that genuinely
 * applies each route's filters). Ownership checks, status codes and amounts
 * all come from the production code.
 */

import crypto from "crypto";
import type { User } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { FakeSupabase } from "@/test/fake-supabase";

const A = "aaaaaaaa-0000-4000-8000-00000000000a";
const B = "bbbbbbbb-0000-4000-8000-00000000000b";
const ADMIN = "cccccccc-0000-4000-8000-00000000000c";

let db: FakeSupabase;
let sessionUser: User | null = null;
const razorpayOrders: { amount: number }[] = [];

vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin: () => db }));
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: async () => ({
    ...db,
    from: db.from.bind(db),
    auth: { getUser: async () => ({ data: { user: sessionUser }, error: null }) },
  }),
}));
vi.mock("@/lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth")>();
  return { ...actual, getCurrentUser: async () => sessionUser };
});
vi.mock("@/lib/razorpay", () => ({
  getRazorpayClient: () => ({
    orders: {
      create: async ({ amount }: { amount: number }) => {
        razorpayOrders.push({ amount });
        return { id: `order_${razorpayOrders.length}`, amount, currency: "INR", status: "created" };
      },
    },
  }),
  getRazorpayKeyId: () => "rzp_test_key",
  getRazorpayKeySecret: () => "test_secret",
}));
vi.mock("@/lib/crmSync", () => ({ scheduleCrmSync: vi.fn(), scheduleCrmSyncMany: vi.fn() }));
vi.mock("@/lib/admin-notifications", () => ({ createAdminNotification: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

function as(id: string | null, extra: Partial<User> = {}) {
  sessionUser = id
    ? ({ id, email: `${id}@example.test`, app_metadata: {}, user_metadata: {}, ...extra } as User)
    : null;
}

beforeEach(() => {
  razorpayOrders.length = 0;
  db = new FakeSupabase({
    profiles: [
      { id: A, role: "customer" },
      { id: B, role: "customer" },
      { id: ADMIN, role: "admin" },
    ],
    users: [],
    credit_reports: [
      { id: "report-a", customer_id: A, full_name: 'Asha "A" \u0906\u0936\u093e', pan: "AAAAA1111A", report_pdf_url: `${A}/report.pdf`, status: "completed" },
      { id: "report-b", customer_id: B, pan: "BBBBB2222B", report_pdf_url: `${B}/report.pdf`, status: "completed" },
    ],
    credit_audit_logs: [],
    applications: [
      { id: "app-a", user_id: A, customer_id: A, payment_status: "pending", fresh_payable_amount: 499, total_amount: 499, amount: 499, razorpay_order_id: "order_a" },
      { id: "app-b", user_id: B, customer_id: B, payment_status: "pending", fresh_payable_amount: 999, total_amount: 999, amount: 999, razorpay_order_id: "order_b" },
    ],
    application_documents: [],
    payments: [],
  });
  db.storageObjects.push(
    { bucket: "credit-reports", path: `${A}/report.pdf`, body: new TextEncoder().encode("%PDF-A") },
    { bucket: "credit-reports", path: `${B}/report.pdf`, body: new TextEncoder().encode("%PDF-B") },
  );
});

const req = (url: string, init?: RequestInit) => new Request(`http://localhost${url}`, init);

describe("credit report download", () => {
  it("refuses an anonymous caller", async () => {
    const { GET } = await import("@/app/api/credit/download/route");
    as(null);
    expect((await GET(req("/api/credit/download?id=report-a"))).status).toBe(401);
  });

  it("gives customer A their own report", async () => {
    const { GET } = await import("@/app/api/credit/download/route");
    as(A);
    const res = await GET(req("/api/credit/download?id=report-a"));
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("%PDF-A");
    expect(res.headers.get("content-disposition")).toBe('attachment; filename="credit-report-Asha_A.pdf"');
    expect(res.headers.get("cache-control")).toBe("private, no-store");
  });

  it("does not give customer A customer B's report, nor confirm it exists", async () => {
    const { GET } = await import("@/app/api/credit/download/route");
    as(A);
    const res = await GET(req("/api/credit/download?id=report-b"));
    expect(res.status).toBe(404);
    const missing = await GET(req("/api/credit/download?id=does-not-exist"));
    expect(await res.json()).toEqual(await missing.json());
  });

  it("does not let a forged user_metadata admin role through", async () => {
    const { GET } = await import("@/app/api/credit/download/route");
    as(A, { user_metadata: { role: "admin" } });
    expect((await GET(req("/api/credit/download?id=report-b"))).status).toBe(404);
  });

  it("lets a database admin download any report", async () => {
    const { GET } = await import("@/app/api/credit/download/route");
    as(ADMIN);
    expect((await GET(req("/api/credit/download?id=report-b"))).status).toBe(200);
  });
});

describe("credit report details", () => {
  it("does not return customer B's report (or PAN) to customer A", async () => {
    const { GET } = await import("@/app/api/credit/report/route");
    as(A);
    const res = await GET(req("/api/credit/report?id=report-b"));
    expect(res.status).toBe(404);
    expect(JSON.stringify(await res.json())).not.toContain("BBBBB2222B");
  });
});

describe("customer document upload", () => {
  const pdf = () => {
    const form = new FormData();
    form.set("documentType", "PAN");
    form.set("file", new File([new TextEncoder().encode("%PDF-1.7 test")], "pan.pdf", { type: "application/pdf" }));
    return form;
  };

  it("refuses to attach a file to another customer's application", async () => {
    const { POST } = await import("@/app/api/customer/applications/[id]/documents/route");
    as(A);
    const res = await POST(req("/api/customer/applications/app-b/documents", { method: "POST", body: pdf() }), {
      params: Promise.resolve({ id: "app-b" }),
    });
    expect(res.status).toBe(404);
    expect(db.storageObjects.filter((o) => o.bucket === "documents")).toHaveLength(0);
  });

  it("stores the owner's file privately and signs it for a limited time", async () => {
    const { POST } = await import("@/app/api/customer/applications/[id]/documents/route");
    as(A);
    const res = await POST(req("/api/customer/applications/app-a/documents", { method: "POST", body: pdf() }), {
      params: Promise.resolve({ id: "app-a" }),
    });
    expect(res.status).toBe(200);
    const stored = db.storageObjects.filter((o) => o.bucket === "documents");
    expect(stored).toHaveLength(1);
    expect(stored[0].path).toMatch(/^applications\/app-a\/customer-documents\//);
    expect(db.signedUrls.every((s) => s.expiresIn <= 60 * 60)).toBe(true);
  });

  it("rejects a file whose content is not what its type claims", async () => {
    const { POST } = await import("@/app/api/customer/applications/[id]/documents/route");
    as(A);
    const form = new FormData();
    form.set("file", new File([new TextEncoder().encode("<svg onload=alert(1)>")], "x.pdf", { type: "application/pdf" }));
    const res = await POST(req("/api/customer/applications/app-a/documents", { method: "POST", body: form }), {
      params: Promise.resolve({ id: "app-a" }),
    });
    expect(res.status).toBe(400);
  });
});

describe("payment order creation", () => {
  const order = (body: unknown) =>
    req("/api/create-order", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

  it("will not price an order from the client amount alone", async () => {
    const { POST } = await import("@/app/api/create-order/route");
    as(null);
    const res = await POST(order({ amount: 100 }));
    expect(res.status).toBe(400);
    expect(razorpayOrders).toHaveLength(0);
  });

  it("will not create an order for another customer's application", async () => {
    const { POST } = await import("@/app/api/create-order/route");
    as(A);
    const res = await POST(order({ applicationId: "app-b" }));
    expect(res.status).toBe(404);
    expect(razorpayOrders).toHaveLength(0);
  });

  it("rejects a tampered amount", async () => {
    const { POST } = await import("@/app/api/create-order/route");
    as(A);
    const res = await POST(order({ applicationId: "app-a", amount: 100 }));
    expect(res.status).toBe(400);
    expect(razorpayOrders).toHaveLength(0);
  });

  it("charges the server-side price when the client sends none", async () => {
    const { POST } = await import("@/app/api/create-order/route");
    as(A);
    const res = await POST(order({ applicationId: "app-a" }));
    expect(res.status).toBe(200);
    expect(razorpayOrders).toEqual([{ amount: 49_900 }]);
  });

  it("refuses to take a second payment for an application already paid", async () => {
    const { POST } = await import("@/app/api/create-order/route");
    db.tables.applications[0].payment_status = "verified";
    as(A);
    const res = await POST(order({ applicationId: "app-a" }));
    expect(res.status).toBe(400);
  });
});

describe("payment verification", () => {
  const sign = (orderId: string, paymentId: string) =>
    crypto.createHmac("sha256", "test_secret").update(`${orderId}|${paymentId}`).digest("hex");
  const verify = (body: unknown) =>
    req("/api/verify-payment", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

  it("rejects a forged signature", async () => {
    const { POST } = await import("@/app/api/verify-payment/route");
    as(A);
    const res = await POST(
      verify({ razorpay_order_id: "order_a", razorpay_payment_id: "pay_1", razorpay_signature: "ab".repeat(32), application_id: "app-a" }),
    );
    expect(res.status).toBe(400);
    expect(db.tables.applications[0].payment_status).toBe("pending");
  });

  it("does not mark customer B's application paid with customer A's genuine payment", async () => {
    const { POST } = await import("@/app/api/verify-payment/route");
    as(A);
    const res = await POST(
      verify({
        razorpay_order_id: "order_a",
        razorpay_payment_id: "pay_1",
        razorpay_signature: sign("order_a", "pay_1"),
        application_id: "app-b",
      }),
    );
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(db.tables.applications[1].payment_status).toBe("pending");
  });

  it("does not accept a valid payment for a different order", async () => {
    const { POST } = await import("@/app/api/verify-payment/route");
    as(A);
    const res = await POST(
      verify({
        razorpay_order_id: "order_other",
        razorpay_payment_id: "pay_1",
        razorpay_signature: sign("order_other", "pay_1"),
        application_id: "app-a",
      }),
    );
    expect(res.status).toBe(400);
    expect(db.tables.applications[0].payment_status).toBe("pending");
  });
});

describe("partner customer lookup", () => {
  it("is refused to a customer who set role=agency_partner on themselves", async () => {
    const { GET } = await import("@/app/api/customer/lookup/route");
    as(A, { user_metadata: { role: "agency_partner" } });
    const res = await GET(req("/api/customer/lookup?mobile=9876543210"));
    expect(res.status).toBe(403);
  });
});
