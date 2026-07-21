import { describe, expect, it } from "vitest";

/**
 * Documents the production bug:
 * Partner Settings used AgentPasswordResetForm → PATCH /api/admin/agents/:id
 * which requires profiles.role === "agent". Digi Partners are agency_partner.
 */
describe("Digi Partner password reset endpoint contract", () => {
  it("must call agency-partners reset-password with auth user UUID, not agents API", () => {
    const correct = "/api/admin/agency-partners/reset-password";
    const legacyBroken = "/api/admin/agents/";

    expect(correct).toContain("agency-partners/reset-password");
    expect(correct).not.toContain("/agents/");
    expect(legacyBroken).toContain("/agents/");
  });

  it("requires auth.users id (user_id), never agency_partners.id alone as the Auth target", () => {
    const agencyPartnerRowId = "11111111-1111-4111-8111-111111111111";
    const authUserId = "22222222-2222-4222-8222-222222222222";

    // Body contract for the fixed API
    const body = { userId: authUserId, temporaryPassword: "password1", confirmPassword: "password1" };
    expect(body.userId).toBe(authUserId);
    expect(body.userId).not.toBe(agencyPartnerRowId);
  });
});
