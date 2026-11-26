/**
 * The credentials a partner is given, and the nag that replaces them.
 *
 * Two things here are worth a test. One: the password must satisfy Supabase's
 * policy on this project — lowercase, uppercase, digit and symbol — because a
 * password it refuses is a partner who cannot be approved at all, which is
 * exactly the failure that blocked approvals once already. Two: it must clear
 * the panel's own minimum, so the system never issues a password it would
 * itself reject.
 *
 * The password used to be derived per partner (`Dc@` plus their own number).
 * It is now one fixed string, `Dc@123`, so it can be read down a phone line in
 * one breath. That is a deliberate trade and the tests below pin it as one —
 * including the part that is a cost, so nobody later reads the shared value as
 * a bug and "fixes" it without knowing it was chosen.
 */

import { describe, expect, it } from "vitest";

import { PARTNER_PASSWORD_MIN_LENGTH } from "@/lib/admin/partner-password-reset";
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

  it("is the one fixed string every partner is handed", () => {
    expect(password).toBe("Dc@123");
  });

  it("carries all four character classes the policy demands", () => {
    // A bare number has only one of these, which is why it is rejected
    // outright by auth.admin.createUser on this project. `Dc@123` supplies
    // the other three in six characters.
    expect(password).toMatch(/[a-z]/);
    expect(password).toMatch(/[A-Z]/);
    expect(password).toMatch(/\d/);
    expect(password).toMatch(/[^A-Za-z0-9]/);
  });

  it("clears the panel's own minimum, so the system never issues a password it refuses", () => {
    /*
      This is the assertion that matters most. The default and the floor have
      to move together: raise PARTNER_PASSWORD_MIN_LENGTH back to eight and
      leave this at six, and the panel starts refusing the very password it
      hands out — an admin cannot type a partner back onto the default and the
      partner cannot type it back in either. This fails in that case.
    */
    expect(password!.length).toBeGreaterThanOrEqual(PARTNER_PASSWORD_MIN_LENGTH);
  });

  it("is the same for every partner, which is the cost of saying it on the phone", () => {
    /*
      Pinned as a decision, not an accident. One password opens every partner
      account to anyone who knows a partner's mobile number, and partners run
      wallets and payouts. It was accepted so the credential survives being
      read down a phone line. If this ever has to be undone, the fix is a
      per-partner value here plus a sweep — not a quiet edit to this test.
    */
    expect(defaultPartnerPassword("9876543210")).toBe(defaultPartnerPassword("9000000001"));
  });

  it("is still null when the number is unusable, so no unreachable account is provisioned", () => {
    /*
      The value no longer depends on the number, but the guard still does. The
      username IS the mobile number, so a partner without a valid one cannot
      sign in whatever their password is — and every caller reads a null here
      as "refuse this account" rather than creating one nobody can reach.
    */
    expect(defaultPartnerPassword("")).toBeNull();
    expect(defaultPartnerPassword("not a number")).toBeNull();
    expect(defaultPartnerPassword("1234567890")).toBeNull();
  });
});

describe("what the admin reads out", () => {
  it("spells the password rather than assuming it is obvious", () => {
    const described = describeDefaultCredentials("9876543210");
    expect(described?.username).toBe("9876543210");
    expect(described?.password).toBe("Dc@123");
    // The username still has to be said; the password no longer repeats it.
    expect(described?.spoken).toContain("9876543210");
    expect(described?.spoken).toContain("one-two-three");
  });

  it("is null for a partner with no usable number", () => {
    expect(describeDefaultCredentials("123")).toBeNull();
  });
});

describe("recognising the password we handed out", () => {
  it("matches the default and nothing else", () => {
    expect(isDefaultPartnerPassword("Dc@123", "9876543210")).toBe(true);
    expect(isDefaultPartnerPassword("something-they-chose", "9876543210")).toBe(false);
    // Now true for any partner with a usable number, because the default is
    // shared. The old per-number value is no longer the default for anyone.
    expect(isDefaultPartnerPassword("Dc@123", "9000000000")).toBe(true);
    expect(isDefaultPartnerPassword("Dc@9876543210", "9876543210")).toBe(false);
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

describe("the length floor the default has to clear", () => {
  /*
    The default is six characters. Every place that validates a DC Partner
    password therefore has to read the shared constant rather than carry its
    own number — otherwise one form keeps an eight and starts refusing the
    password the system itself issued, which is a partner who cannot sign in
    and an admin who cannot put them back on the default.

    Customer and agent flows are deliberately NOT in this list: they are other
    roles, they were never lowered, and their own eights are correct.
  */
  const partnerSurface = [
    "src/app/api/auth/ap/change-password/route.ts",
    "src/app/dc-partner/change-password/page.tsx",
    "src/app/dc-partner/reset-password/page.tsx",
    "src/components/admin/create-ap-form.tsx",
    "src/components/admin/partner-password-reset-form.tsx",
    "src/components/auth/ap-forgot-password.tsx",
  ];

  it("is read from one place by every partner password form", () => {
    for (const file of partnerSurface) {
      expect(readCode(file), file).toContain("PARTNER_PASSWORD_MIN_LENGTH");
    }
  });

  it("is not hardcoded alongside it", () => {
    // `minLength={8}`, `length < 8` and "at least 8 characters" are the three
    // spellings this surface actually used before the constant was wired in.
    const hardcoded = /minLength=\{8\}|length < 8|least 8 charact/i;

    for (const file of partnerSurface) {
      expect(readCode(file), file).not.toMatch(hardcoded);
    }
  });
});

describe("what the panel promises the admin", () => {
  /*
    The sweep button tells the admin, in a confirm dialog, which password 47
    partners are about to be put on — and the admin then reads that out. It
    used to spell the value by hand and said `Dc@<number>` long after the
    default stopped being per-number. A wrong promise there is not a cosmetic
    bug: it is the wrong password read down the phone to every partner, and
    47 support calls.
  */
  const button = readCode("src/app/admin/agency-partners/reset-credentials-button.tsx");

  it("reads the password from the one module that defines it", () => {
    expect(button).toContain("DEFAULT_PARTNER_PASSWORD");
    expect(button).toContain('from "@/lib/ap/default-credentials"');
  });

  it("does not spell a password of its own alongside it", () => {
    // Any `Dc@...` literal in this file is a value that can go stale; the
    // interpolated constant cannot.
    expect(button).not.toMatch(/["'`][^"'`]*Dc@[^"'`]*["'`]/);
  });

  it("still warns that a partner's own password will be overwritten", () => {
    // The sweep is not reversible for a partner who had chosen one.
    expect(button).toContain("apna password bana rakha hai");
  });
});
