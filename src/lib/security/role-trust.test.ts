import { readFileSync } from "fs";
import { join } from "path";
import type { User } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

// getCurrentUserRole falls back to the database; no database in unit tests.
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin: () => null }));

import { getCurrentUserRole, isAdminUser, trustedTokenRole } from "@/lib/auth";
import { resolveAdminMembershipFromHints } from "@/lib/auth/memberships";

function user(overrides: Partial<User>): User {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    email: "someone@example.test",
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: new Date().toISOString(),
    ...overrides,
  } as User;
}

describe("a role in user_metadata grants nothing", () => {
  const forgedAdmin = user({ user_metadata: { role: "admin" } });
  const forgedPartner = user({ user_metadata: { role: "agency_partner" } });

  it("is ignored by trustedTokenRole", () => {
    expect(trustedTokenRole(forgedAdmin)).toBeNull();
  });

  it("does not make isAdminUser true", () => {
    expect(isAdminUser(forgedAdmin)).toBe(false);
  });

  it("does not make getCurrentUserRole admin or partner", async () => {
    expect(await getCurrentUserRole(forgedAdmin)).toBe("customer");
    expect(await getCurrentUserRole(forgedPartner)).toBe("customer");
  });

  it("does not grant admin membership", () => {
    expect(
      resolveAdminMembershipFromHints({ email: "someone@example.test", metadataRole: "admin", profileRole: "customer" }).ok,
    ).toBe(false);
  });
});

describe("trusted sources still work", () => {
  it("app_metadata (service-role only) is honoured", async () => {
    const admin = user({ app_metadata: { role: "admin" } });
    expect(isAdminUser(admin)).toBe(true);
    expect(await getCurrentUserRole(admin)).toBe("admin");
    expect(await getCurrentUserRole(user({ app_metadata: { role: "agency_partner" } }))).toBe("agency_partner");
  });

  it("a profiles-table admin role is honoured", () => {
    expect(resolveAdminMembershipFromHints({ email: "x@example.test", profileRole: "admin" }).ok).toBe(true);
  });
});

describe("no server authorisation path reads a role from user_metadata", () => {
  const files = [
    "src/lib/auth.ts",
    "src/middleware.ts",
    "src/app/api/customer/lookup/route.ts",
    "src/app/api/csc-olympiad/certificate/route.ts",
    "src/app/api/csc-olympiad/prep-material/route.ts",
    "src/app/api/csc-olympiad/admit-card/route.ts",
  ];
  for (const file of files) {
    it(file, () => {
      const source = readFileSync(join(process.cwd(), file), "utf8");
      expect(source).not.toMatch(/user_metadata\??\.role/);
    });
  }
});
