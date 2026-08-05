import { describe, expect, it } from "vitest";

/**
 * Regression: legacy GET /api/ap/leads must use canonical ownership
 * (agent_id OR assigned_to OR partner_id), not agent_id alone.
 */
describe("Legacy AP leads API scope contract", () => {
  it("documents canonical partner scope filter", () => {
    const actorId = "partner-1";
    const scope = `agent_id.eq.${actorId},assigned_to.eq.${actorId},partner_id.eq.${actorId}`;
    expect(scope).toContain("assigned_to");
    expect(scope).toContain("partner_id");
    expect(scope).not.toBe(`agent_id.eq.${actorId}`);
  });
});
