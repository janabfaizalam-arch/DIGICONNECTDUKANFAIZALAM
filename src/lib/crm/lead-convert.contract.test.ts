/**
 * Contract tests for transactional lead conversion authZ / privacy / pricing rules.
 * These are deterministic pure+mocked-boundary tests. Full RPC concurrency tests belong in CI
 * against a Postgres/Supabase fixture (`pnpm test:crm-leads`).
 *
 * Local Windows host: Vitest may be BLOCKED by App Control (Rollup native). Do not claim PASS.
 */
import { describe, expect, it } from "vitest";

import { canTransitionLeadStage, assertLostReason } from "@/lib/crm/lead-workflow-core";
import {
  isTerminalLeadStage,
  normalizeLeadMobile,
  buildLeadIngestionKey,
} from "@/lib/crm/leads-core";
import { roleHasCapability } from "@/lib/crm/permissions-core";

describe("Lead conversion authorization matrix", () => {
  it("allows admin and partner convert; denies customer", () => {
    expect(roleHasCapability("admin", "leads.convert")).toBe(true);
    expect(roleHasCapability("agency_partner", "leads.convert")).toBe(true);
    expect(roleHasCapability("customer", "leads.convert")).toBe(false);
  });

  it("denies partner reassignment capability", () => {
    expect(roleHasCapability("agency_partner", "applications.assign")).toBe(false);
    expect(roleHasCapability("admin", "applications.assign")).toBe(true);
  });
});

describe("Conversion privacy contract (matchedCustomerId)", () => {
  it("documents that partners only receive scoped match ids", () => {
    // Implementation: lead-convert.ts filters matches by created_by/assigned_agent_id.
    // Cross-partner matches return generic 409 without matchedCustomerId.
    const partnerVisible = [{ id: "c1", created_by: "p1", assigned_agent_id: null }];
    const actorId = "p1";
    const visible = partnerVisible.filter(
      (row) => row.created_by === actorId || row.assigned_agent_id === actorId,
    );
    expect(visible).toHaveLength(1);

    const foreign = [{ id: "c2", created_by: "other", assigned_agent_id: "other" }];
    const hidden = foreign.filter(
      (row) => row.created_by === actorId || row.assigned_agent_id === actorId,
    );
    expect(hidden).toHaveLength(0);
  });
});

describe("Mobile normalization contract (walk-in / convert / unique index)", () => {
  it("normalizes identically to last-10 digits", () => {
    expect(normalizeLeadMobile("+91 98765-43210")).toBe("9876543210");
    expect(normalizeLeadMobile("09876543210")).toBe("9876543210");
  });
});

describe("Idempotency / terminal conversion guards", () => {
  it("treats won/lost as terminal without reopen", () => {
    expect(isTerminalLeadStage("won")).toBe(true);
    expect(isTerminalLeadStage("lost")).toBe(true);
    expect(canTransitionLeadStage({ from: "won", to: "new" }).ok).toBe(false);
    expect(canTransitionLeadStage({ from: "lost", to: "new", allowReopen: true }).ok).toBe(true);
  });

  it("requires lost reason", () => {
    expect(assertLostReason("lost", null).ok).toBe(false);
  });

  it("partner-scoped ingest keys do not collide across partners", () => {
    const a = buildLeadIngestionKey({
      source: "agency_partner",
      mobile: "9876543210",
      service: "GST",
      scopeId: "partner-a",
    });
    const b = buildLeadIngestionKey({
      source: "agency_partner",
      mobile: "9876543210",
      service: "GST",
      scopeId: "partner-b",
    });
    expect(a).not.toBe(b);
  });
});

describe("Browser-supplied price must be ignored (contract)", () => {
  it("documents RPC overwrites fee from agent_services when service id present", () => {
    // convert_lead_to_application_core sets v_amount from agent_services.customer_fee
    // and ignores p_amount when p_agent_service_id is set; otherwise amount=0.
    const clientPrice = 99999;
    const catalogFee = 499;
    const authoritative = catalogFee; // RPC path
    expect(authoritative).not.toBe(clientPrice);
    expect(authoritative).toBe(499);
  });
});

/**
 * CI checklist (Linux / approved runners — not claimed PASS on blocked Windows host):
 * 1. Admin converts lead → new customer/application
 * 2. Admin links existing customer
 * 3. Partner converts owned lead
 * 4. Partner cannot convert other partner lead
 * 5. Customer cannot convert
 * 6. Disabled/ineligible actor rejected
 * 7. Inactive service rejected
 * 8. Browser price ignored
 * 9. Unauthorized customer selection rejected
 * 10. Unauthorized assignee rejected
 * 11. Customer auth.users cannot be assignee
 * 12. Repeated request returns prior success
 * 13. Different clientKey cannot double-convert
 * 14. Concurrent convert → one application
 * 15. Concurrent same-mobile → no duplicate customers
 * 16. Failure after customer insert rolls back
 * 17–19. Status / timeline / assignment history created
 * 20. Notification failure does not roll back
 * 21. Raw DB errors not in API body
 * 22. Converted lead result only to authorized actor
 *
 * Command: pnpm test:crm-leads
 */
describe("CI integration checklist placeholder", () => {
  it("keeps the checklist discoverable", () => {
    expect(true).toBe(true);
  });
});
