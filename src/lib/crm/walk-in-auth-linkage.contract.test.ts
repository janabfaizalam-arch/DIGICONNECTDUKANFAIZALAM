import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

import {
  classifyWalkInCleanupOutcome,
  resolveApplicationAuthUserId,
  walkInReconciliationClientError,
} from "@/lib/crm/walk-in-application-core";

const root = process.cwd();

function readSrc(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

describe("Walk-in production customer schema contracts", () => {
  const migration = readSrc("supabase/migrations/20260805120000_crm_walk_in_application_foundation.sql");
  const walkInApp = readSrc("src/lib/crm/walk-in-application.ts");
  const walkIn = readSrc("src/lib/crm/walk-in.ts");

  it("1. production-style customer schema uses customers.name in M7 SQL", () => {
    expect(migration).toMatch(/c\.name/);
    expect(migration).toMatch(/coalesce\(nullif\(trim\(c\.name\), ''\), 'Customer'\)/);
  });

  it("2. no reference to customers.full_name in M7 / walk-in paths", () => {
    expect(migration).not.toMatch(/c\.full_name/);
    expect(migration).not.toMatch(/customers\.full_name/);
    expect(walkInApp).not.toMatch(/full_name/);
    // walk-in Auth user_metadata may still set full_name for GoTrue metadata only.
    expect(walkIn).not.toMatch(/\.select\([^)]*full_name/);
    expect(walkIn).toMatch(/\.select\("id, name, mobile/);
  });

  it("3. no reference to nonexistent customers.user_id in M7 / walk-in loaders", () => {
    expect(migration).not.toMatch(/c\.user_id/);
    expect(migration).toMatch(/no customers\.user_id/);
    expect(walkInApp).not.toMatch(/select\("id, user_id/);
    expect(walkInApp).toMatch(/select\("id, name, mobile/);
  });

  it("4. existing customer with canonical auth linkage sets applications.user_id = customer.id", () => {
    const resolved = resolveApplicationAuthUserId({
      customerId: "11111111-1111-1111-1111-111111111111",
      customerIdIsAuthUser: true,
      actorId: "22222222-2222-2222-2222-222222222222",
    });
    expect(resolved).toEqual({
      ok: true,
      userId: "11111111-1111-1111-1111-111111111111",
    });
  });

  it("5. existing customer without Auth linkage keeps applications.user_id null", () => {
    const resolved = resolveApplicationAuthUserId({
      customerId: "11111111-1111-1111-1111-111111111111",
      customerIdIsAuthUser: false,
      actorId: "22222222-2222-2222-2222-222222222222",
    });
    expect(resolved).toEqual({ ok: true, userId: null });
  });

  it("6. new walk-in customer Auth linkage requires customer.id == auth user id", () => {
    const ok = resolveApplicationAuthUserId({
      customerId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      customerIdIsAuthUser: true,
      serverResolvedAuthUserId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      actorId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    });
    expect(ok).toEqual({
      ok: true,
      userId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    });

    const mismatch = resolveApplicationAuthUserId({
      customerId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      customerIdIsAuthUser: false,
      serverResolvedAuthUserId: "cccccccc-cccc-cccc-cccc-cccccccccccc",
      actorId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    });
    expect(mismatch).toEqual({ ok: false, error: "customer_auth_user_mismatch" });
  });

  it("7. browser cannot choose another auth.users id", () => {
    const blocked = resolveApplicationAuthUserId({
      customerId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      customerIdIsAuthUser: true,
      browserProvidedAuthUserId: "dddddddd-dddd-dddd-dddd-dddddddddddd",
    });
    expect(blocked).toEqual({ ok: false, error: "browser_cannot_choose_auth_user" });
  });

  it("8–9. customer_id ownership and nullable user_id contract are documented in RPC", () => {
    expect(migration).toMatch(/customer_id,/);
    expect(migration).toMatch(/v_user_id,/);
    expect(migration).toMatch(/leaves null when customer has no Auth row/);
    expect(migration).toMatch(/p_customer_auth_user_id/);
  });

  it("10–11. portal isolation remains customer_id / auth.uid based (no actor ownership)", () => {
    const actorAsOwner = resolveApplicationAuthUserId({
      customerId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      customerIdIsAuthUser: true,
      serverResolvedAuthUserId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      actorId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    });
    expect(actorAsOwner).toEqual({ ok: false, error: "actor_cannot_own_customer_application" });

    // The PIN login that minted `sub: customer.id` is gone. The same guarantee
    // now comes from signup writing the customers row keyed on the auth user
    // id, so the session subject and customers.id stay the same value.
    expect(readSrc("src/lib/auth/customer-account.ts")).toMatch(/id: input\.userId/);
    // Vault rows stay scoped to the signed-in user's own customer id, however
    // that id is resolved (customers.id == auth user, mobile, or legacy user_id).
    const vault = readSrc("src/app/api/customer/vault/route.ts");
    expect(vault).toMatch(/\.eq\("customer_id", (customer\.id|customerId)\)/);
    expect(vault).toMatch(/resolveCustomerIdForUser\(supabase, user\)|\.eq\("user_id", user\.id\)/);
  });

  it("12. Auth/customer create rolls back orphan auth on failure", () => {
    expect(walkIn).toMatch(/deleteUser\(requestCreatedAuthUserId\)/);
    expect(walkIn).toMatch(/requestCreatedCustomerId/);
    expect(walkIn).toMatch(/skipCustomers:\s*true/);
    expect(walkIn).toMatch(/HIGH_SEVERITY_ORPHAN_RECONCILIATION/);
    expect(walkIn).toMatch(/findAuthUserByEmailOrMobile/);
  });

  it("13. temporary PIN remains hashed and is not logged", () => {
    expect(walkIn).toMatch(/hashPin\(temporaryPin\)/);
    expect(walkIn).toMatch(/hashed_pin:\s*hashedPin/);
    expect(walkIn).toMatch(/Never include temporaryPin/);
    expect(walkIn).not.toMatch(/console\.(log|info|error|warn)\([^)]*temporaryPin/);
    expect(migration).not.toMatch(/temporaryPin|temporary_pin|plain.?pin/i);
  });

  it("14. partial cleanup failure requires reconciliation (not clean failure)", () => {
    const partial = classifyWalkInCleanupOutcome({
      customerCleanup: "deleted",
      authCleanup: "failed",
    });
    expect(partial).toEqual({
      clean: false,
      reconciliationRequired: true,
      severity: "high",
      code: "cleanup_reconciliation_required",
    });
    const bothOk = classifyWalkInCleanupOutcome({
      customerCleanup: "deleted",
      authCleanup: "deleted",
    });
    expect(bothOk.clean).toBe(true);
    const client = walkInReconciliationClientError("corr-1");
    expect(client.reconciliationRequired).toBe(true);
    expect(client.correlationId).toBe("corr-1");
    expect(client.error.toLowerCase()).not.toMatch(/pin|hash|email|phone|secret/);
  });

  it("15. idempotent retry detects walk-in Auth remnant without minting another user", () => {
    expect(walkIn).toMatch(/admin_walk_in/);
    expect(walkIn).toMatch(/remnantAuth/);
    expect(walkIn).toMatch(/Auth remnant without customer row/);
  });

  it("16. PIN portal scopes applications by authenticated customer_id", () => {
    const dashboard = readSrc("src/app/api/customer-auth/dashboard/route.ts");
    expect(dashboard).toMatch(/session\.payload\.sub/);
    expect(dashboard).toMatch(/\.eq\("customer_id", customerId\)/);
  });

  it("17. Auth upload paths require applications.user_id = auth user (unavailable when null)", () => {
    const docs = readSrc("src/app/api/customer/applications/[id]/documents/route.ts");
    expect(docs).toMatch(/\.eq\("user_id", user\.id\)/);
  });

  it("18. RPC grants/search_path/old signature drop", () => {
    expect(migration).toMatch(/set search_path = ''/);
    expect(migration).toMatch(
      /drop function if exists public\.create_walk_in_application_core\(\s*uuid, text, uuid, uuid, text, uuid, text, boolean, numeric, text, text\s*\)/,
    );
    expect(migration).toMatch(
      /grant execute on function public\.create_walk_in_application_core\(\s*uuid, text, uuid, uuid, text, uuid, text, boolean, numeric, text, text, uuid\s*\)\s*to service_role/,
    );
    expect(migration).toMatch(/from anon, authenticated/);
    expect(migration).toMatch(/customer_auth_user_mismatch/);
  });
});
