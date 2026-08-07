import { describe, expect, it, vi } from "vitest";

import { resolveCustomerIdForUser } from "@/lib/customer-identity";

type Row = { id: string } | null;

const MISSING_COLUMN = { code: "42703", message: 'column customers.user_id does not exist' };

/**
 * Minimal PostgREST-shaped stub. `results` is consumed one entry per
 * `.from("customers")` chain, in call order.
 */
function stubSupabase(results: Array<{ data: Row; error?: unknown }>) {
  const filters: string[] = [];
  let call = 0;

  const chain = () => {
    const self = {
      select: () => self,
      eq: (column: string) => {
        filters.push(column);
        return self;
      },
      limit: () => self,
      maybeSingle: async () => {
        const result = results[call] ?? { data: null };
        call += 1;
        return { data: result.data, error: result.error ?? null };
      },
    };
    return self;
  };

  return {
    supabase: { from: vi.fn(() => chain()) } as never,
    filters,
    callCount: () => call,
  };
}

const user = { id: "auth-user-1", phone: "+919876543210", user_metadata: {} };

describe("resolveCustomerIdForUser", () => {
  it("resolves customers.id == auth user id first", async () => {
    const { supabase, filters, callCount } = stubSupabase([{ data: { id: "auth-user-1" } }]);

    await expect(resolveCustomerIdForUser(supabase, user)).resolves.toBe("auth-user-1");
    expect(filters).toEqual(["id"]);
    expect(callCount()).toBe(1);
  });

  it("falls back to the normalised 10-digit mobile", async () => {
    const { supabase, filters } = stubSupabase([{ data: null }, { data: { id: "cust-by-mobile" } }]);

    await expect(resolveCustomerIdForUser(supabase, user)).resolves.toBe("cust-by-mobile");
    expect(filters).toEqual(["id", "mobile"]);
  });

  it("tolerates the legacy user_id column being absent", async () => {
    // This is the production schema: the third probe errors with 42703 and must
    // resolve to null rather than throwing or surfacing a 500.
    const { supabase } = stubSupabase([
      { data: null },
      { data: null },
      { data: null, error: MISSING_COLUMN },
    ]);

    await expect(resolveCustomerIdForUser(supabase, user)).resolves.toBeNull();
  });

  it("still resolves via user_id on legacy deployments that have the column", async () => {
    const { supabase, filters } = stubSupabase([
      { data: null },
      { data: null },
      { data: { id: "legacy-cust" } },
    ]);

    await expect(resolveCustomerIdForUser(supabase, user)).resolves.toBe("legacy-cust");
    expect(filters).toEqual(["id", "mobile", "user_id"]);
  });

  it("skips the mobile probe when the user has no phone", async () => {
    const { supabase, filters } = stubSupabase([{ data: null }, { data: null, error: MISSING_COLUMN }]);

    await expect(
      resolveCustomerIdForUser(supabase, { id: "auth-user-2", phone: null, user_metadata: {} }),
    ).resolves.toBeNull();
    expect(filters).toEqual(["id", "user_id"]);
  });

  it("propagates genuine database failures instead of reporting no customer", async () => {
    const { supabase } = stubSupabase([{ data: null, error: { code: "08006", message: "connection failure" } }]);

    await expect(resolveCustomerIdForUser(supabase, user)).rejects.toMatchObject({ code: "08006" });
  });
});
