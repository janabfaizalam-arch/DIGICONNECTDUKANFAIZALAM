/**
 * Signing a partner in with a WhatsApp code.
 *
 * What is worth pinning here is not the OTP machinery — that is
 * `auth_otp_requests` and has been carrying customer codes for months — but
 * the three things this feature adds and could get wrong:
 *
 *  - the code is spent before anything else happens, so it cannot be replayed;
 *  - a suspended partner cannot walk in through the WhatsApp door after being
 *    refused at the password one;
 *  - the send endpoint answers the same whether or not the number belongs to a
 *    partner, so it cannot be used to find out who sells for us.
 */

import { describe, expect, it } from "vitest";

import { readCode } from "@/lib/testing/source";
import { resolveOtpTemplate } from "@/lib/whatsapp/client";

const lib = readCode("src/lib/auth/partner-otp.ts");
const send = readCode("src/app/api/auth/ap/otp/send/route.ts");
const verify = readCode("src/app/api/auth/ap/otp/verify/route.ts");
const migration = readCode("supabase/migrations/20261119090000_partner_login_otp.sql");

describe("the purpose the database accepts", () => {
  it("is allowed by the constraint", () => {
    // The purpose column is a closed list; a value it refuses means no code is
    // ever written, and the partner waits for a message that cannot be sent.
    expect(migration).toContain("'partner_login'");
  });

  it("is its own value, not borrowed from a customer flow", () => {
    // Rate limits, the resend cooldown and "invalidate the previous code" are
    // all per purpose. Sharing one would let a partner's login request cancel
    // a customer's half-finished signup on the same number.
    expect(lib).toContain('PARTNER_LOGIN_OTP_PURPOSE = "partner_login"');
    expect(send).toContain("PARTNER_LOGIN_OTP_PURPOSE");
    expect(verify).toContain("PARTNER_LOGIN_OTP_PURPOSE");
  });
});

describe("the WhatsApp template", () => {
  it("resolves for the partner login purpose", () => {
    // An unmapped purpose returns OTP_PROVIDER_CONFIG_MISSING and nothing is
    // ever delivered.
    const resolved = resolveOtpTemplate("partner_login", {} as NodeJS.ProcessEnv);
    expect(resolved.ok).toBe(true);
    if (resolved.ok) expect(resolved.key).toBe("login_otp");
  });

  it("can be pointed at another template without a code change", () => {
    const resolved = resolveOtpTemplate("partner_login", {
      WHATSAPP_TEMPLATE_LOGIN_OTP: "dcp_login_code",
    } as unknown as NodeJS.ProcessEnv);
    expect(resolved.ok).toBe(true);
    if (resolved.ok) expect(resolved.templateName).toBe("dcp_login_code");
  });
});

describe("the code is spent before anything else", () => {
  it("verifies before it looks the partner up or mints a session", () => {
    // verifyOtpRequest burns the request. Doing it first means a code cannot
    // be retried against a later attempt, whatever fails afterwards.
    const verifyAt = verify.indexOf("verifyOtpRequest(");
    expect(verifyAt).toBeGreaterThan(-1);
    expect(verifyAt).toBeLessThan(verify.indexOf("findPartnerForLogin("));
    expect(verifyAt).toBeLessThan(verify.indexOf("mintSessionToken("));
  });

  it("stops on a failed code rather than continuing", () => {
    expect(verify).toMatch(/if \(!verified\.ok\)[\s\S]{0,120}return/);
  });
});

describe("the WhatsApp door is not a way around the access check", () => {
  it("runs the same check the password login runs", () => {
    expect(verify).toContain("getAgentAccessStatus(");
  });

  it("signs a refused partner out instead of leaving them holding a session", () => {
    expect(verify).toMatch(/if \(!access\.ok\)[\s\S]{0,200}signOut\(\)/);
  });

  it("checks access before handing the session back", () => {
    // Against the call site, not the helper's definition further up the file.
    expect(verify.indexOf("getAgentAccessStatus(")).toBeLessThan(
      verify.indexOf("return setPortalCookie("),
    );
  });
});

describe("the send endpoint does not say who is a partner", () => {
  it("answers the same when no partner owns the number", () => {
    // Otherwise the form is a tool for discovering who sells for us, one
    // number at a time.
    expect(send).toMatch(/if \(!partner\)[\s\S]{0,200}ok: true/);
    expect(send).toContain("SENT_MESSAGE");
  });

  it("still rejects a number that is not a number", () => {
    // A malformed number carries no information about who is registered.
    expect(send).toMatch(/if \(!phone\.ok\)[\s\S]{0,200}400/);
  });

  it("is rate limited on its own, not only inside the OTP store", () => {
    // The store counts codes it actually sent; this also covers the requests
    // that are turned away.
    expect(send).toContain("checkRateLimit(");
  });
});

describe("which partner a number belongs to", () => {
  it("refuses a number held by two records rather than guessing", () => {
    // Guessing would sign somebody into another partner's panel.
    expect(lib).toContain("ambiguous_number");
    expect(lib).toMatch(/rows\.length === 1 \? rows\[0\] : null/);
  });

  it("prefers the record that answers to the number as a login", () => {
    expect(lib).toMatch(/String\(row\.username \?\? ""\) === mobileLocal/);
  });

  it("ignores a partner record with no login attached", () => {
    expect(lib).toMatch(/filter\(\(row\) => Boolean\(row\.user_id\)\)/);
  });
});

describe("the session", () => {
  it("comes from a one-time token, not from a password we guessed", () => {
    expect(lib).toContain('type: "magiclink"');
    expect(lib).toContain("hashed_token");
    expect(verify).toMatch(/verifyOtp\(\{[\s\S]{0,120}token_hash/);
  });

  it("is reported in the shape the login forms read", () => {
    // postJson treats a 200 without this as a failure — the bug that made a
    // successful login say "Invalid username or password".
    expect(verify).toMatch(/ok: true/);
    expect(verify).toContain('destination: "/ap/dashboard"');
  });
});
