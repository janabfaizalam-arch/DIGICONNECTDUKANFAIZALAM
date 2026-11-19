/**
 * A successful sign-in must look successful to the form that asked for it.
 *
 * `postJson` deliberately requires more than HTTP 200: the body has to carry
 * `ok: true` or `success: true`. That rule exists so an OTP screen cannot open
 * on a response that merely did not error.
 *
 * `/api/auth/agent-login` did not send it. Every partner signing in at
 * /ap/login therefore got a 200 that the form read as a failure — and because
 * it was neither a 403 nor a timeout, the form fell through to its Supabase
 * fallback, which signs in with the identifier as an email address. A partner
 * typing their mobile number was told "Invalid username or password" by a
 * sign-in that had already succeeded and set their session; closing the page
 * and reopening it dropped them straight into the panel.
 *
 * These pin both halves: the routes send the flag, and the form stops rather
 * than reaching for another mechanism once the server has answered.
 */

import { describe, expect, it } from "vitest";

import { readCode } from "@/lib/testing/source";

/** Every auth route a form posts to with `postJson`. */
const LOGIN_ROUTES = [
  "src/app/api/auth/agent-login/route.ts",
  "src/app/api/auth/admin/login/route.ts",
  "src/app/api/auth/ap/login/route.ts",
];

describe("what postJson accepts", () => {
  it("requires an explicit flag, not just a 200", () => {
    const request = readCode("src/components/auth/ui/request.ts");
    expect(request).toContain("isExplicitSuccessPayload");
    expect(request).toMatch(/ok:\s*response\.ok && explicitOk/);
  });
});

describe("every login route answers in the shape the forms read", () => {
  for (const route of LOGIN_ROUTES) {
    it(`${route.split("/").slice(-2)[0]} returns the success flag`, () => {
      const source = readCode(route);
      expect(source).toMatch(/ok:\s*true/);
    });
  }

  it("agent-login sends it alongside the destination the form navigates to", () => {
    // Both are needed: the flag to be believed, the destination to go anywhere.
    const source = readCode("src/app/api/auth/agent-login/route.ts");
    expect(source).toMatch(/ok:\s*true[\s\S]{0,200}destination:\s*"\/ap\/dashboard"/);
  });
});

describe("the partner login form", () => {
  const form = readCode("src/components/auth/ap-login-form.tsx");

  it("does not try another mechanism once the server has answered 2xx", () => {
    expect(form).toMatch(/agent\.status >= 200 && agent\.status < 300/);
  });

  it("stops before the Supabase fallback in that case", () => {
    // The guard has to sit above the fallback, or it guards nothing.
    expect(form.indexOf("agent.status >= 200")).toBeLessThan(
      form.indexOf("supabase.auth.signInWithPassword"),
    );
  });

  it("still refuses an explicit denial without falling back", () => {
    expect(form).toContain("agent.status === 403");
    expect(form.indexOf("agent.status === 403")).toBeLessThan(
      form.indexOf("supabase.auth.signInWithPassword"),
    );
  });
});
