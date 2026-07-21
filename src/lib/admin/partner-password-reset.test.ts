import { describe, expect, it } from "vitest";

import {
  PARTNER_PASSWORD_RESET_MESSAGES,
  validatePartnerPasswordInput,
} from "./partner-password-reset";

describe("validatePartnerPasswordInput", () => {
  it("accepts matching passwords of sufficient length", () => {
    expect(validatePartnerPasswordInput("password1", "password1")).toEqual({
      ok: true,
      password: "password1",
    });
  });

  it("rejects short, mismatched, and empty passwords before Supabase is called", () => {
    expect(validatePartnerPasswordInput("short", "short").ok).toBe(false);
    expect(validatePartnerPasswordInput("password1", "password2")).toMatchObject({
      ok: false,
      code: "mismatch",
    });
    expect(validatePartnerPasswordInput("", "")).toMatchObject({ ok: false, code: "empty" });
  });
});

describe("partner password reset messaging", () => {
  it("never uses the legacy Agent could not be updated copy", () => {
    const messages = Object.values(PARTNER_PASSWORD_RESET_MESSAGES);
    for (const message of messages) {
      expect(message).not.toMatch(/Agent could not be updated/i);
    }
  });

  it("explains missing auth linkage clearly", () => {
    expect(PARTNER_PASSWORD_RESET_MESSAGES.missing_user_id).toMatch(/not linked/i);
    expect(PARTNER_PASSWORD_RESET_MESSAGES.service_unavailable).toMatch(/SERVICE_ROLE/i);
  });
});
