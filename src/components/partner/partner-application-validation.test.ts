/**
 * The browser runs the server's rules, and runs them on the right field.
 *
 * The point of checking in the browser is that a typo costs nothing. The point
 * of doing it through `validatePartnerApplication` is that there is no second
 * copy of the rules to drift from the route's — so the tests that matter here
 * are the ones that would catch drift, and the one that catches the skeleton
 * going stale.
 */

import { describe, expect, it } from "vitest";

import { readCode } from "@/lib/testing/source";
import { validatePartnerApplication } from "@/lib/partner-applications";
import {
  errorForField,
  firstError,
  VALID_SKELETON,
  type ApplicationFields,
} from "./partner-application-validation";

const filled = (overrides: Partial<ApplicationFields> = {}): ApplicationFields => ({
  ...VALID_SKELETON,
  ...overrides,
});

describe("the skeleton the blur checks are measured against", () => {
  it("passes every rule the server has", () => {
    // If a new required field is added to validatePartnerApplication and the
    // skeleton is not updated, blur checks would quietly stop reporting
    // anything. This fails the build instead.
    expect(validatePartnerApplication(VALID_SKELETON).ok).toBe(true);
  });
});

describe("errorForField", () => {
  it("reports the field being checked", () => {
    expect(errorForField("mobile", filled({ mobile: "123" }))).toMatch(/10-digit/);
    expect(errorForField("fullName", filled({ fullName: "Jo" }))).toMatch(/full name/i);
    expect(errorForField("email", filled({ email: "not-an-email" }))).toMatch(/email/i);
  });

  it("says nothing about a field that is fine", () => {
    expect(errorForField("mobile", filled({ mobile: "9876543210" }))).toBeNull();
    expect(errorForField("email", filled({ email: "" }))).toBeNull();
    expect(errorForField("whatsapp", filled({ whatsapp: "" }))).toBeNull();
  });

  it("does not report another field's problem", () => {
    // Leaving the mobile box while the name is still empty must not say
    // "Enter your full name" under the mobile box.
    const form = filled({ fullName: "", mobile: "9876543210" });
    expect(errorForField("mobile", form)).toBeNull();
  });

  it("asks a shop for a shop name, and a field executive for none", () => {
    expect(
      errorForField("businessName", filled({ partnerType: "business_partner", businessName: "" })),
    ).toMatch(/shop or business/i);

    expect(
      errorForField("businessName", filled({ partnerType: "field_executive", businessName: "" })),
    ).toBeNull();
  });

  it("uses the same verdict as the server, field by field", () => {
    // Drift check: whatever the route would reject, the browser rejects too.
    const cases: Array<[keyof ApplicationFields, string]> = [
      ["mobile", "1234567890"],
      ["mobile", "98765432"],
      ["email", "a@b"],
      ["fullName", "ab"],
      ["pin", "12345"],
      ["whatsapp", "5000000000"],
    ];

    for (const [field, value] of cases) {
      const form = filled({ [field]: value } as Partial<ApplicationFields>);
      const server = validatePartnerApplication(form);
      expect(server.ok, `server should reject ${field}=${value}`).toBe(false);
      expect(errorForField(field, form), `browser should reject ${field}=${value}`).toBe(
        server.ok ? null : server.error,
      );
    }
  });
});

describe("firstError", () => {
  it("is null for a form the server would accept", () => {
    expect(firstError(filled())).toBeNull();
  });

  it("names the field so the form can focus it", () => {
    const problem = firstError(filled({ fullName: "" }));
    expect(problem?.field).toBe("fullName");
    expect(problem?.message).toBeTruthy();
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   What the form does with the answers
   ───────────────────────────────────────────────────────────────────────── */

describe("the application form", () => {
  const form = readCode("src/components/partner/partner-application-form.tsx");

  it("checks before it sends, so a typo costs no round trip", () => {
    expect(form).toContain("firstError(form)");
    // The check must sit before the request, not beside it.
    expect(form.indexOf("firstError(form)")).toBeLessThan(
      form.indexOf('fetch("/api/partner-applications"'),
    );
  });

  it("brings the applicant to the field that is wrong", () => {
    // A red message about a box three scrolls up is not an error message.
    expect(form).toContain("revealField");
    expect(form).toContain("scrollIntoView");
    expect(form).toContain("preventScroll: true");
  });

  it("focuses the field the server rejected too", () => {
    expect(form).toMatch(/result\.field[\s\S]{0,400}revealField\(field\)/);
  });

  it("ends properly when an application already exists", () => {
    // The 409 carries the tracking code; it used to be thrown away and the
    // applicant got a red toast with nothing to act on.
    expect(form).toMatch(/response\.status === 409 && result\.trackingCode/);
    expect(form).toContain("alreadyApplied: true");
  });

  it("keeps a draft and drops it once the application is in", () => {
    expect(form).toContain("saveDraft(form)");
    expect(form.match(/clearDraft\(\)/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it("holds no second copy of a validation rule", () => {
    // An inline regex here is the start of the browser and the server
    // disagreeing about what a valid number is.
    expect(form).toContain("isValidMobile(form.mobile)");
    expect(form).not.toMatch(/\[6-9\]\\d\{9\}/);
  });

  it("lets a failed PIN lookup be retried", () => {
    // The ref used to record the attempt, so the same six digits could never
    // be tried again after a dropped connection.
    expect(form).toContain("resolved.current = pin");
    expect(form.indexOf("setPinState(\"found\")")).toBeGreaterThan(form.indexOf("resolved.current = pin"));
  });
});

describe("the draft", () => {
  const draft = readCode("src/components/partner/partner-application-draft.ts");

  it("survives storage being unavailable", () => {
    // Private windows throw on access; the form must still work.
    expect(draft.match(/catch/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it("expires, so a shared shop phone does not keep someone's details", () => {
    expect(draft).toContain("MAX_AGE_MS");
    expect(draft).toContain("clearDraft()");
  });

  it("only restores fields the form still asks for", () => {
    expect(draft).toContain("Object.keys(shape)");
  });
});

describe("what an approved applicant is told", () => {
  const status = readCode("src/components/partner/partner-application-status.tsx");

  it("names the mobile number as the login, not the email", () => {
    // provisionPartnerAccount makes the mobile the username, and email is
    // optional on the form — so "sign in with the email you applied with"
    // stranded anyone who left it blank.
    expect(status).toMatch(/mobile number as the username/i);
    expect(status).not.toMatch(/Sign in with the email you applied with/i);
  });

  it("does not promise a password message that nothing sends", () => {
    // Approving returns the password once, to the admin, who passes it on.
    expect(status).not.toMatch(/sent your password separately/i);
  });
});
