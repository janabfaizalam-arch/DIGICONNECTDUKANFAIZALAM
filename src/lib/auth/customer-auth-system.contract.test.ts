import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const readSrc = (rel: string) => readFileSync(join(root, rel), "utf8");
const exists = (rel: string) => existsSync(join(root, rel));

describe("retired WhatsApp-OTP / PIN customer auth", () => {
  it("no longer ships any customer PIN or signup-OTP endpoint", () => {
    // These were the entry points of the old system. WhatsApp template
    // rejections made signup OTP undeliverable, so the whole flow was replaced.
    const retired = [
      "src/app/api/auth/customer/login/route.ts",
      "src/app/api/auth/customer/send-signup-otp/route.ts",
      "src/app/api/auth/customer/verify-signup-otp/route.ts",
      "src/app/api/auth/customer/complete-signup/route.ts",
      "src/app/api/auth/customer/forgot-pin/send-otp/route.ts",
      "src/app/api/customer-auth/login/route.ts",
      "src/app/api/customer-auth/set-pin/route.ts",
      "src/app/api/customer-auth/reset-pin/route.ts",
      "src/app/api/customer-auth/send-otp/route.ts",
      "src/app/api/customer-auth/verify-otp/route.ts",
      "src/app/api/customer-auth/refresh/route.ts",
      "src/app/api/auth/send-whatsapp-otp/route.ts",
    ];

    expect(retired.filter(exists)).toEqual([]);
  });

  it("retired the PIN/OTP customer UI", () => {
    const retired = [
      "src/components/auth/customer-pin-login-form.tsx",
      "src/components/auth/customer-signup-flow.tsx",
      "src/components/auth/customer-forgot-pin-flow.tsx",
      "src/components/auth/customer-auth.tsx",
    ];
    expect(retired.filter(exists)).toEqual([]);
  });

  it("keeps old customer auth URLs reachable as redirects", () => {
    // Printed material, WhatsApp messages and bookmarks point at these.
    const redirects: Array<[string, string]> = [
      ["src/app/customer/forgot-pin/page.tsx", "/customer/forgot-password"],
      ["src/app/login/customer/page.tsx", "/customer/login"],
      ["src/app/customer-login/page.tsx", "/customer/login"],
      ["src/app/(auth-v2)/customer-auth-v2/login/page.tsx", "/customer/login"],
      ["src/app/(auth-v2)/customer-auth-v2/signup/page.tsx", "/customer/signup"],
    ];

    for (const [file, destination] of redirects) {
      expect(exists(file), file).toBe(true);
      expect(readSrc(file), file).toContain(`redirect("${destination}")`);
    }
  });
});

describe("email/password customer auth", () => {
  it("ships signup, sign-in, forgot and reset", () => {
    for (const route of [
      "src/app/api/auth/customer/register/route.ts",
      "src/app/api/auth/customer/signin/route.ts",
      "src/app/api/auth/customer/forgot-password/route.ts",
      "src/app/customer/signup/page.tsx",
      "src/app/customer/login/page.tsx",
      "src/app/customer/forgot-password/page.tsx",
      "src/app/customer/reset-password/page.tsx",
    ]) {
      expect(exists(route), route).toBe(true);
    }
  });

  it("keys the customers row on the auth user id", () => {
    // Everything downstream — applications, documents, invoices — resolves the
    // customer by auth user id, so signup must not mint a separate id.
    const account = readSrc("src/lib/auth/customer-account.ts");
    expect(account).toMatch(/id: input\.userId/);
    expect(account).toMatch(/onConflict: "id"/);
  });

  it("answers every sign-in failure identically", () => {
    // Distinguishing "no such account" from "wrong password" turns sign-in into
    // an account-enumeration oracle.
    const signin = readSrc("src/app/api/auth/customer/signin/route.ts");
    expect(signin).toContain("GENERIC_FAILURE");
    // The unknown-mobile branch must return the same constant, not its own text.
    const unknownMobile = signin.slice(signin.indexOf("if (!email)"), signin.indexOf("signInWithPassword"));
    expect(unknownMobile).toContain("GENERIC_FAILURE");
  });

  it("does not confirm whether an address exists on password reset", () => {
    const forgot = readSrc("src/app/api/auth/customer/forgot-password/route.ts");
    expect(forgot).toMatch(/If that account exists/);
    // The provider error is logged, never returned.
    expect(forgot).toMatch(/if \(error\) console\.warn/);
  });

  it("refuses an off-origin redirect after OAuth", () => {
    // `next` arrives from the URL, so an absolute value would make the login
    // flow an open redirect.
    const callback = readSrc("src/app/auth/callback/route.ts");
    expect(callback).toMatch(/startsWith\("\/\/"\)/);
  });

  it("never blocks signup when the pincode lookup is down", () => {
    const form = readSrc("src/components/auth/customer-email-signup-flow.tsx");
    // A free-text city field replaces the dropdown when the lookup returns
    // nothing, so an India Post outage degrades the form instead of closing it.
    expect(form).toMatch(/Manual fallback/);
    expect(form).toMatch(/!location && pincode\.length === 6 && !pincodeBusy/);
    expect(form).toContain("You can type your city below");

    // And the route answers a lookup failure without a 5xx that the form would
    // surface as an error.
    const route = readSrc("src/app/api/geo/pincode/[code]/route.ts");
    expect(route).toContain("Please type your city manually");
  });
});
