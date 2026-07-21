import { describe, expect, it } from "vitest";

import {
  buildIdentityLinkageHealth,
  partnerAccessPublicMessage,
  resolveAdminMembershipFromHints,
} from "./memberships";
import { resolvePartnerCtaDestination } from "./partner-access";

describe("partnerAccessPublicMessage", () => {
  it("maps denial reasons to safe public copy", () => {
    expect(partnerAccessPublicMessage("ap_not_active")).toMatch(/inactive/i);
    expect(partnerAccessPublicMessage("kyc_not_approved")).toMatch(/KYC/i);
    expect(partnerAccessPublicMessage("not_linked")).toMatch(/not linked/i);
    expect(partnerAccessPublicMessage("admin_portal_only")).toMatch(/Admin portal/i);
  });
});

describe("resolveAdminMembershipFromHints", () => {
  it("recognizes primary admin email", () => {
    expect(resolveAdminMembershipFromHints({ email: "janabfaizalam@gmail.com" }).ok).toBe(true);
  });

  it("does not treat demoted admin email as admin", () => {
    expect(resolveAdminMembershipFromHints({ email: "dgcntdkn@gmail.com", profileRole: "admin" }).ok).toBe(false);
  });

  it("recognizes profile admin role", () => {
    expect(resolveAdminMembershipFromHints({ email: "other@example.com", profileRole: "admin" }).ok).toBe(true);
  });
});

describe("buildIdentityLinkageHealth", () => {
  it("flags admin profile role on an active approved partner", () => {
    const health = buildIdentityLinkageHealth({
      partnerId: "p1",
      authUserId: "u1",
      partnerStatus: "active",
      partnerKycStatus: "approved",
      profile: { id: "u1", role: "admin", email: "a@x.com" },
      authUser: { email: "b@x.com", last_sign_in_at: null },
    });
    expect(health.healthy).toBe(false);
    expect(health.warnings).toContain("profile_role_admin_with_active_partner_membership");
    expect(health.warnings).toContain("auth_email_and_profile_email_mismatch");
  });

  it("is healthy when auth and profile agree for an agency partner", () => {
    const health = buildIdentityLinkageHealth({
      partnerId: "p1",
      authUserId: "u1",
      partnerStatus: "active",
      partnerKycStatus: "approved",
      profile: { id: "u1", role: "agency_partner", email: "ap@x.com", mobile: "7007595931" },
      authUser: { email: "ap@x.com", phone: null, last_sign_in_at: "2026-07-21T00:00:00Z" },
    });
    expect(health.healthy).toBe(true);
    expect(health.warnings).toEqual([]);
  });

  it("flags missing auth linkage", () => {
    const health = buildIdentityLinkageHealth({
      partnerId: "p1",
      authUserId: null,
      partnerStatus: "active",
      partnerKycStatus: "approved",
    });
    expect(health.warnings).toContain("partner_has_no_auth_user");
  });
});

describe("portal CTA dual membership", () => {
  it("does not trap dual-role admins on /admin when partner membership exists", () => {
    expect(resolvePartnerCtaDestination("admin", { hasPartnerMembership: true }).href).toBe("/ap/dashboard");
  });

  it("sends admin-only users to Digi Partner login for an explicit switch", () => {
    expect(resolvePartnerCtaDestination("admin").href).toBe("/ap/login");
  });
});
