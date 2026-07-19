import { describe, expect, it } from "vitest";

import {
  DEMOTED_ADMIN_EMAILS,
  getAdminEmailAllowlist,
  isAllowlistedAdminEmail,
  isDemotedAdminEmail,
  isPrimaryAdminEmail,
  PRIMARY_ADMIN,
} from "@/lib/auth/primary-admin";

describe("primary admin identity", () => {
  it("locks Faiz Alam as primary admin", () => {
    expect(PRIMARY_ADMIN.fullName).toBe("Faiz Alam");
    expect(PRIMARY_ADMIN.email).toBe("janabfaizalam@gmail.com");
    expect(PRIMARY_ADMIN.mobile).toBe("7007595931");
    expect(isPrimaryAdminEmail("JanabFaizAlam@gmail.com")).toBe(true);
  });

  it("demotes dgcntdkn and excludes from allowlist", () => {
    expect(DEMOTED_ADMIN_EMAILS).toContain("dgcntdkn@gmail.com");
    expect(isDemotedAdminEmail("dgcntdkn@gmail.com")).toBe(true);
    expect(isAllowlistedAdminEmail("dgcntdkn@gmail.com")).toBe(false);
  });

  it("always includes primary email in allowlist", () => {
    const list = getAdminEmailAllowlist();
    expect(list).toContain("janabfaizalam@gmail.com");
    expect(list).not.toContain("dgcntdkn@gmail.com");
  });
});
