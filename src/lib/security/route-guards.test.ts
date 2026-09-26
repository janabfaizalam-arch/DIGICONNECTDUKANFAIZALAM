/**
 * Routes that used to accept anonymous callers, and the per-account login
 * lockout — exercised through the real handlers against an in-memory
 * database (see src/test/fake-supabase.ts).
 */

import { readFileSync } from "fs";
import { join } from "path";
import type { User } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { FakeSupabase } from "@/test/fake-supabase";

const CUSTOMER = "aaaaaaaa-0000-4000-8000-00000000000a";
const ADMIN = "cccccccc-0000-4000-8000-00000000000c";
const SERVICE = "dddddddd-0000-4000-8000-00000000000d";

let db: FakeSupabase;
let sessionUser: User | null = null;
const serviceUpdates: { id: string; updates: Record<string, unknown> }[] = [];

vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin: () => db }));
vi.mock("@/lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth")>();
  return { ...actual, getCurrentUser: async () => sessionUser };
});
vi.mock("@/lib/serviceEngineInline", () => ({
  listServices: async () => [],
  createServiceConfig: async () => ({ success: true, serviceId: SERVICE }),
  updateServiceConfig: async (id: string, updates: Record<string, unknown>) => {
    serviceUpdates.push({ id, updates });
    return { success: true };
  },
  deleteServiceConfig: async () => ({ success: true }),
}));

function as(id: string | null) {
  sessionUser = id ? ({ id, email: `${id}@example.test`, app_metadata: {}, user_metadata: {} } as User) : null;
}

const json = (url: string, method: string, body: unknown) =>
  new Request(`http://localhost${url}`, {
    method,
    headers: { "content-type": "application/json", "x-forwarded-for": `10.0.0.${Math.floor(Math.random() * 250)}` },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  serviceUpdates.length = 0;
  db = new FakeSupabase({
    profiles: [
      { id: CUSTOMER, role: "customer" },
      { id: ADMIN, role: "admin" },
    ],
    users: [],
    service_packages: [
      { id: "p1", slug: "combo", name: "Combo", is_active: true, agent_cost: 100, partner_payout: 50, selling_price: 999, original_price: 1200, items: [] },
    ],
    applications: [{ id: "app-1", service_slug: "pan-card", status: "submitted", form_data: { panNumber: "ABCDE1234F" } }],
    leads: [{ id: "lead-1", mobile: "9876543210", service: "GST", name: "Real Name", notes: null }],
    service_clicks_log: [],
    auth_security_events: [],
  });
});

describe("/api/services writes", () => {
  it("refuses an anonymous price change", async () => {
    const { PUT } = await import("@/app/api/services/route");
    as(null);
    const res = await PUT(json("/api/services", "PUT", { serviceId: SERVICE, updates: { customer_fee: 1 } }));
    expect(res.status).toBe(401);
    expect(serviceUpdates).toHaveLength(0);
  });

  it("refuses a customer", async () => {
    const { PUT, DELETE } = await import("@/app/api/services/route");
    as(CUSTOMER);
    expect((await PUT(json("/api/services", "PUT", { serviceId: SERVICE, updates: { customer_fee: 1 } }))).status).toBe(403);
    expect((await DELETE(json("/api/services", "DELETE", { serviceId: SERVICE }))).status).toBe(403);
    expect(serviceUpdates).toHaveLength(0);
  });

  it("lets an admin update, and drops columns outside the editable list", async () => {
    const { PUT } = await import("@/app/api/services/route");
    as(ADMIN);
    const res = await PUT(json("/api/services", "PUT", { serviceId: SERVICE, updates: { customer_fee: 499, id: "x", created_by: "y" } }));
    expect(res.status).toBe(200);
    expect(serviceUpdates).toEqual([{ id: SERVICE, updates: { customer_fee: 499 } }]);
  });
});

describe("/api/admin/packages", () => {
  it("does not show cost and payout columns to the public", async () => {
    const { GET } = await import("@/app/api/admin/packages/route");
    as(null);
    expect((await GET()).status).toBe(403);
  });

  it("the public packages endpoint omits internal columns", async () => {
    const { GET } = await import("@/app/api/packages/route");
    const body = JSON.stringify(await (await GET()).json());
    expect(body).toContain("Combo");
    // The fake returns whole rows; the route's select() names only public
    // columns, which is what Postgres would honour.
    const source = readFileSync(join(process.cwd(), "src/app/api/packages/route.ts"), "utf8");
    expect(source).not.toMatch(/agent_cost|partner_payout/);
  });
});

describe("/api/applications/check-duplicate", () => {
  it("is not an anonymous PAN/Aadhaar lookup", async () => {
    const { POST } = await import("@/app/api/applications/check-duplicate/route");
    as(null);
    const res = await POST(json("/api/applications/check-duplicate", "POST", { serviceSlug: "pan-card", identifiers: { pan: "ABCDE1234F" } }));
    expect(res.status).toBe(401);
    expect(JSON.stringify(await res.json())).not.toContain("app-1");
  });

  it("is not available to customers either", async () => {
    const { POST } = await import("@/app/api/applications/check-duplicate/route");
    as(CUSTOMER);
    const res = await POST(json("/api/applications/check-duplicate", "POST", { serviceSlug: "pan-card", identifiers: { pan: "ABCDE1234F" } }));
    expect(res.status).toBe(403);
  });

  it("still works for staff", async () => {
    const { POST } = await import("@/app/api/applications/check-duplicate/route");
    as(ADMIN);
    const res = await POST(json("/api/applications/check-duplicate", "POST", { serviceSlug: "pan-card", identifiers: { pan: "ABCDE1234F" } }));
    expect(res.status).toBe(200);
    expect((await res.json()).duplicateFound).toBe(true);
  });
});

describe("/api/crm/event", () => {
  it("rejects unknown event names", async () => {
    const { POST } = await import("@/app/api/crm/event/route");
    const res = await POST(json("/api/crm/event", "POST", { mobile: "9876543210", service: "GST", event: "anything" }));
    expect(res.status).toBe(400);
  });

  it("cannot rename an existing lead, and returns no ids", async () => {
    const { POST } = await import("@/app/api/crm/event/route");
    const res = await POST(json("/api/crm/event", "POST", { mobile: "9876543210", service: "GST", event: "page_visit", name: "Attacker" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(db.tables.leads[0].name).toBe("Real Name");
  });
});

describe("/api/services/track", () => {
  it("stores no IP address", async () => {
    const { POST } = await import("@/app/api/services/track/route");
    const res = await POST(json("/api/services/track", "POST", { click_type: "apply", utm_source: "x".repeat(500) }));
    expect(res.status).toBe(200);
    const row = db.tables.service_clicks_log[0];
    expect(row.ip_address).toBeNull();
    expect(String(row.utm_source).length).toBeLessThanOrEqual(120);
  });
});

describe("per-account login lockout", () => {
  const failures = (n: number, minutesAgo: number) =>
    Array.from({ length: n }, (_, i) => ({
      id: `e${minutesAgo}-${i}`,
      user_id: ADMIN,
      event_type: "admin_login_failed_pin",
      created_at: new Date(Date.now() - minutesAgo * 60_000).toISOString(),
    }));

  it("locks after five recent failures, whatever the IP", async () => {
    const { isAuthLockedOut } = await import("@/lib/auth/security-log");
    db.tables.auth_security_events.push(...failures(4, 1));
    expect(await isAuthLockedOut({ userId: ADMIN, eventTypes: ["admin_login_failed_pin"] })).toBe(false);
    db.tables.auth_security_events.push(...failures(1, 1));
    expect(await isAuthLockedOut({ userId: ADMIN, eventTypes: ["admin_login_failed_pin"] })).toBe(true);
  });

  it("forgets failures older than the window", async () => {
    const { isAuthLockedOut } = await import("@/lib/auth/security-log");
    db.tables.auth_security_events.push(...failures(10, 30));
    expect(await isAuthLockedOut({ userId: ADMIN, eventTypes: ["admin_login_failed_pin"] })).toBe(false);
  });

  it("the admin PIN route checks the lockout before comparing the PIN", () => {
    const source = readFileSync(join(process.cwd(), "src/app/api/auth/admin/login/route.ts"), "utf8");
    const lockout = source.indexOf("isAuthLockedOut(");
    const compare = source.indexOf("verifyPin(body.pin");
    expect(lockout).toBeGreaterThan(-1);
    expect(lockout).toBeLessThan(compare);
  });
});
