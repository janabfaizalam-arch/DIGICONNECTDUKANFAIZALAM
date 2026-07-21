import { describe, expect, it, vi, beforeEach } from "vitest";

const getPartnerMembership = vi.fn();
const getSupabaseAdmin = vi.fn();

vi.mock("@/lib/auth/memberships", async () => {
  const actual = await vi.importActual<typeof import("./memberships")>("@/lib/auth/memberships");
  return {
    ...actual,
    getPartnerMembership: (...args: unknown[]) => getPartnerMembership(...args),
  };
});

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: () => getSupabaseAdmin(),
}));

import { getAgentAccessStatus } from "@/lib/auth";
import type { User } from "@supabase/supabase-js";

function fakeUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-ap-1",
    email: "partner@example.com",
    app_metadata: {},
    user_metadata: { role: "agency_partner" },
    aud: "authenticated",
    created_at: new Date().toISOString(),
    ...overrides,
  } as User;
}

describe("getAgentAccessStatus membership-first", () => {
  beforeEach(() => {
    getPartnerMembership.mockReset();
    getSupabaseAdmin.mockReset();
  });

  it("allows active approved AP even when profiles.role would be admin (membership wins)", async () => {
    getPartnerMembership.mockResolvedValue({
      ok: true,
      reason: "active_approved_ap",
      partnerId: "ap-1",
      status: "active",
      kycStatus: "approved",
    });

    const access = await getAgentAccessStatus(
      fakeUser({
        email: "partner@example.com",
        user_metadata: { role: "admin" },
      }),
    );

    expect(access.ok).toBe(true);
    if (access.ok) expect(access.reason).toBe("active_approved_ap");
  });

  it("denies admin-only users without agency_partners membership", async () => {
    getPartnerMembership.mockResolvedValue({ ok: false, reason: "not_linked" });
    getSupabaseAdmin.mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: { id: "user-admin", role: "admin", kyc_status: "pending" }, error: null }),
          }),
        }),
      }),
    });

    const access = await getAgentAccessStatus(
      fakeUser({
        id: "user-admin",
        email: "janabfaizalam@gmail.com",
        user_metadata: { role: "admin" },
      }),
    );

    expect(access.ok).toBe(false);
    if (!access.ok) expect(access.reason).toBe("admin_portal_only");
  });

  it("denies inactive partner membership clearly", async () => {
    getPartnerMembership.mockResolvedValue({
      ok: false,
      reason: "ap_not_active",
      partnerId: "ap-1",
      status: "suspended",
      kycStatus: "approved",
    });

    const access = await getAgentAccessStatus(fakeUser());
    expect(access.ok).toBe(false);
    if (!access.ok) expect(access.reason).toBe("ap_not_active");
  });

  it("denies unapproved KYC clearly", async () => {
    getPartnerMembership.mockResolvedValue({
      ok: false,
      reason: "kyc_not_approved",
      partnerId: "ap-1",
      status: "active",
      kycStatus: "pending",
    });

    const access = await getAgentAccessStatus(fakeUser());
    expect(access.ok).toBe(false);
    if (!access.ok) expect(access.reason).toBe("kyc_not_approved");
  });
});
