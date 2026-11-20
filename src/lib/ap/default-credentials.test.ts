/**
 * The credentials a partner is given, and the nag that replaces them.
 *
 * Two things here are worth a test. One: the password must satisfy Supabase's
 * policy on this project — lowercase, uppercase, digit and symbol — because a
 * password it refuses is a partner who cannot be approved at all, which is
 * exactly the failure that blocked approvals once already. Two: it must be
 * derived from the number and nothing else, so the person on the phone can
 * read it out without looking anything up.
 */

import { describe, expect, it } from "vitest";

import { readCode } from "@/lib/testing/source";
import {
  defaultPartnerPassword,
  defaultPartnerUsername,
  describeDefaultCredentials,
  isDefaultPartnerPassword,
} from "./default-credentials";

describe("the username is the mobile number", () => {
  it("is exactly the ten digits", () => {
    expect(defaultPartnerUsername("9876543210")).toBe("9876543210");
  });

  it("survives the ways a number gets typed", () => {
    for (const written of ["+91 98765 43210", "+919876543210", "098765 43210", "98765-43210"]) {
      expect(defaultPartnerUsername(written), written).toBe("9876543210");
    }
  });

  it("refuses a number that is not an Indian mobile", () => {
    // Provisioning an account nobody can sign in to is worse than refusing.
    for (const bad of ["", "12345", "1234567890", "5000000000", null, undefined, "abcdefghij"]) {
      expect(defaultPartnerUsername(bad), String(bad)).toBeNull();
    }
  });
});

describe("the password Supabase will actually accept", () => {
  const password = defaultPartnerPassword("9876543210");

  it("is the number behind a fixed prefix", () => {
    expect(password).toBe("Dc@9876543210");
  });

  it("carries all four character classes the policy demands", () => {
    // A bare ten-digit number has only one of these, which is why it is
    // rejected outright by auth.admin.createUser on this project.
    expect(password).toMatch(/[a-z]/);
    expect(password).toMatch(/[A-Z]/);
    expect(password).toMatch(/\d/);
    expect(password).toMatch(/[^A-Za-z0-9]/);
  });

  it("is long enough for every policy minimum in play", () => {
    expect(password!.length).toBeGreaterThanOrEqual(12);
  });

  it("is different for every partner", () => {
    expect(defaultPartnerPassword("9876543210")).not.toBe(defaultPartnerPassword("9876543211"));
  });

  it("is null rather than a shared fallback when the number is unusable", () => {
    // Returning a prefix-only string would give every broken record the same
    // password.
    expect(defaultPartnerPassword("")).toBeNull();
    expect(defaultPartnerPassword("not a number")).toBeNull();
  });
});

describe("what the admin reads out", () => {
  it("spells the password rather than assuming it is obvious", () => {
    const described = describeDefaultCredentials("9876543210");
    expect(described?.username).toBe("9876543210");
    expect(described?.password).toBe("Dc@9876543210");
    expect(described?.spoken).toContain("9876543210");
  });

  it("is null for a partner with no usable number", () => {
    expect(describeDefaultCredentials("123")).toBeNull();
  });
});

describe("recognising the password we handed out", () => {
  it("matches the default and nothing else", () => {
    expect(isDefaultPartnerPassword("Dc@9876543210", "9876543210")).toBe(true);
    expect(isDefaultPartnerPassword("something-they-chose", "9876543210")).toBe(false);
    expect(isDefaultPartnerPassword("Dc@9876543210", "9000000000")).toBe(false);
  });

  it("is false when the number is unusable, rather than true by accident", () => {
    expect(isDefaultPartnerPassword("", "")).toBe(false);
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   Where it is wired in
   ───────────────────────────────────────────────────────────────────────── */

describe("every way a partner account is created", () => {
  it("the approved signup gets number-based credentials", () => {
    const approve = readCode("src/app/api/admin/partner-applications/[id]/route.ts");
    expect(approve).toContain("defaultPartnerPassword(application.mobile)");
    expect(approve).not.toContain("generateTemporaryPassword()");
    // A partner with no usable number must be refused, not given a half-built
    // password nobody can sign in with.
    expect(approve).toMatch(/if \(!temporaryPassword\)/);
  });

  it("an admin-created partner falls back to the number", () => {
    const create = readCode("src/app/api/admin/agency-partners/create/route.ts");
    expect(create).toContain("defaultPartnerUsername(body.mobile)");
    expect(create).toContain("defaultPartnerPassword(body.mobile)");
  });

  it("the username provisioning picks is the mobile number", () => {
    const provision = readCode("src/lib/ap/provision-partner.ts");
    expect(provision).toContain("input.mobile");
    // Only a password the partner did not choose has to be replaced.
    expect(provision).toContain("must_change_password: !selfPassword");
  });
});

describe("the prompt that asks for a real password", () => {
  const prompt = readCode("src/components/ap/password-setup-prompt.tsx");
  const layout = readCode("src/app/dc-partner/layout.tsx");

  it("sits above every panel screen, not on one of them", () => {
    expect(layout).toContain("PasswordSetupPrompt");
    expect(layout).toContain("must_change_password");
  });

  it("offers both now and later", () => {
    expect(prompt).toContain("Abhi banayein");
    expect(prompt).toContain("Baad mein");
    expect(prompt).toContain("/dc-partner/change-password");
  });

  it("comes back on the next sign-in after a later", () => {
    // Dismissal is per session and every login clears it, so "later" cannot
    // turn into "never".
    expect(prompt).toContain("sessionStorage");
    expect(prompt).toContain("rearmPasswordPrompt");

    for (const form of [
      "src/components/auth/ap-login-form.tsx",
      "src/components/auth/unified-login.tsx",
    ]) {
      expect(readCode(form), form).toContain("rearmPasswordPrompt()");
    }
  });

  it("decides visibility after mount, so the server and browser agree", () => {
    expect(prompt).toContain("useEffect");
  });

  it("stops once the partner sets their own password", () => {
    const change = readCode("src/app/api/auth/ap/change-password/route.ts");
    expect(change).toContain("must_change_password: false");
  });
});

describe("bringing existing partners onto number logins", () => {
  const reset = readCode("src/app/api/admin/agency-partners/reset-to-default/route.ts");

  it("is admin-only and audited", () => {
    expect(reset).toContain("isAdminRole");
    expect(reset).toContain("logAuditEvent");
  });

  it("works in slices, because the Auth API is called once per partner", () => {
    expect(reset).toContain("nextOffset");
    expect(reset).toContain("MAX_LIMIT");
  });

  it("refuses to hand two partners the same username", () => {
    // The login route resolves a username to one account; a duplicate would
    // send someone into the wrong panel.
    expect(reset).toMatch(/\.neq\("id", partner\.id\)/);
  });

  it("flags every account it touches, so the prompt follows", () => {
    expect(reset).toContain("must_change_password: true");
  });

  it("reports what it skipped instead of pretending it succeeded", () => {
    expect(reset).toContain("skipped");
  });
});
