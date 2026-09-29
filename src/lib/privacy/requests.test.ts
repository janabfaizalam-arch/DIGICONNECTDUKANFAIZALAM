import type { User } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { FakeSupabase } from "@/test/fake-supabase";
import { allowedPrivacyTransitions, newPrivacyReference, redactIdentifiers } from "@/lib/privacy/requests";

const CUSTOMER = "aaaaaaaa-0000-4000-8000-00000000000a";
const ADMIN = "cccccccc-0000-4000-8000-00000000000c";
const REQUEST = "eeeeeeee-0000-4000-8000-00000000000e";

let db: FakeSupabase;
let sessionUser: User | null = null;

vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin: () => db }));
vi.mock("@/lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth")>();
  return { ...actual, getCurrentUser: async () => sessionUser };
});

function as(id: string | null) {
  sessionUser = id ? ({ id, email: `${id}@example.test`, app_metadata: {}, user_metadata: {} } as User) : null;
}

let ipCounter = 0;
const request = (url: string, method: string, body: unknown) =>
  new Request(`http://localhost${url}`, {
    method,
    headers: { "content-type": "application/json", "x-forwarded-for": `10.9.${ipCounter++}.1` },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  as(null);
  db = new FakeSupabase({
    profiles: [
      { id: CUSTOMER, role: "customer" },
      { id: ADMIN, role: "admin" },
    ],
    users: [],
    privacy_requests: [],
    admin_notifications: [],
  });
});

describe("workflow rules", () => {
  it("closed requests cannot move again", () => {
    expect(allowedPrivacyTransitions("completed")).toEqual([]);
    expect(allowedPrivacyTransitions("rejected")).toEqual([]);
  });

  it("references are unguessable-looking and unambiguous", () => {
    const refs = new Set(Array.from({ length: 200 }, () => newPrivacyReference()));
    expect(refs.size).toBe(200);
    for (const ref of refs) expect(ref).toMatch(/^PR-[A-HJ-NP-Z2-9]{8}$/);
  });

  it("strips Aadhaar and PAN numbers people type into the details box", () => {
    expect(redactIdentifiers("My aadhaar 1234 5678 9012 and PAN abcde1234f are wrong")).toBe(
      "My aadhaar [number removed] and PAN [PAN removed] are wrong",
    );
  });
});

describe("POST /api/privacy-requests", () => {
  it("records a minimal request and returns only a reference", async () => {
    const { POST } = await import("@/app/api/privacy-requests/route");
    const res = await POST(
      request("/api/privacy-requests", "POST", {
        requestType: "erasure",
        name: "Asha",
        mobile: "+91 98765 43210",
        details: "Please close my account. PAN ABCDE1234F",
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Object.keys(body).sort()).toEqual(["ok", "reference"]);
    const row = db.tables.privacy_requests[0];
    expect(row).toMatchObject({ request_type: "erasure", requester_mobile: "9876543210", user_id: null });
    expect(row.details).toBe("Please close my account. PAN [PAN removed]");
    // The notification carries no name or number.
    expect(JSON.stringify(db.tables.admin_notifications)).not.toMatch(/Asha|9876543210/);
  });

  it("attaches the signed-in account", async () => {
    const { POST } = await import("@/app/api/privacy-requests/route");
    as(CUSTOMER);
    await POST(request("/api/privacy-requests", "POST", { requestType: "access", name: "A", mobile: "9876543211" }));
    expect(db.tables.privacy_requests[0].user_id).toBe(CUSTOMER);
  });

  it("validates the request type and mobile number", async () => {
    const { POST } = await import("@/app/api/privacy-requests/route");
    expect((await POST(request("/api/privacy-requests", "POST", { requestType: "drop_table", name: "A", mobile: "9876543210" }))).status).toBe(400);
    expect((await POST(request("/api/privacy-requests", "POST", { requestType: "access", name: "A", mobile: "12345" }))).status).toBe(400);
    expect(db.tables.privacy_requests).toHaveLength(0);
  });

  it("limits requests per mobile number, whatever the IP", async () => {
    const { POST } = await import("@/app/api/privacy-requests/route");
    const statuses = [];
    for (let i = 0; i < 4; i += 1) {
      statuses.push((await POST(request("/api/privacy-requests", "POST", { requestType: "access", name: "A", mobile: "9000000001" }))).status);
    }
    expect(statuses).toEqual([200, 200, 200, 429]);
  });
});

describe("PATCH /api/admin/privacy-requests/[id]", () => {
  const seed = (overrides: Record<string, unknown> = {}) =>
    db.tables.privacy_requests.push({
      id: REQUEST,
      reference: "PR-ABCDEFGH",
      status: "in_review",
      verification_status: "unverified",
      admin_notes: null,
      ...overrides,
    });
  const patch = (body: unknown) =>
    import("@/app/api/admin/privacy-requests/[id]/route").then(({ PATCH }) =>
      PATCH(request(`/api/admin/privacy-requests/${REQUEST}`, "PATCH", body), { params: Promise.resolve({ id: REQUEST }) }),
    );

  it("is admin-only", async () => {
    seed();
    as(CUSTOMER);
    expect((await patch({ status: "completed" })).status).toBe(403);
    as(null);
    expect((await patch({ status: "completed" })).status).toBe(403);
  });

  it("refuses a demoted admin even when their token still says admin", async () => {
    seed();
    sessionUser = { id: ADMIN, email: "dgcntdkn@gmail.com", app_metadata: { role: "admin" }, user_metadata: {} } as User;
    expect((await patch({ verificationStatus: "verified" })).status).toBe(403);
    expect(db.tables.privacy_requests[0].verification_status).toBe("unverified");
  });

  it("refuses to complete a request whose requester has not been verified", async () => {
    seed();
    as(ADMIN);
    const res = await patch({ status: "completed", notes: "done" });
    expect(res.status).toBe(409);
    expect(db.tables.privacy_requests[0].status).toBe("in_review");
  });

  it("refuses transitions outside the workflow", async () => {
    seed({ status: "completed", verification_status: "verified" });
    as(ADMIN);
    expect((await patch({ status: "pending" })).status).toBe(409);
    expect((await patch({ status: "in_review" })).status).toBe(409);
    expect((await patch({ status: "archived" })).status).toBe(400);
    expect(db.tables.privacy_requests[0].status).toBe("completed");
  });

  it("completes a verified request, timestamps it, and appends notes", async () => {
    seed({ admin_notes: "[earlier] first note" });
    as(ADMIN);
    expect((await patch({ verificationStatus: "verified" })).status).toBe(200);
    expect((await patch({ status: "completed", notes: "Data exported and sent." })).status).toBe(200);
    const row = db.tables.privacy_requests[0];
    expect(row.status).toBe("completed");
    expect(row.resolved_at).toBeTruthy();
    expect(String(row.admin_notes)).toMatch(/^\[earlier\] first note\n\[.+UTC · .+\] Data exported and sent\.$/);
  });
});
