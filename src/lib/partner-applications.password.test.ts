import { describe, expect, it } from "vitest";

import { generateTemporaryPassword } from "@/lib/partner-applications";

/**
 * The exact policy the live Supabase project reported when it refused every
 * password this function made:
 *
 *   "Password should contain at least one character of each:
 *    abcdefghijklmnopqrstuvwxyz, ABCDEFGHIJKLMNOPQRSTUVWXYZ, 0123456789,
 *    !@#$%^&*()_+-=[]{};':\"|<>?,./`~."
 */
const REQUIRED = {
  lowercase: /[a-z]/,
  uppercase: /[A-Z]/,
  digit: /[0-9]/,
  symbol: /[!@#$%^&*()_+\-=[\]{};':"|<>?,./`~]/,
} as const;

const SAMPLE = 2000;

describe("generateTemporaryPassword", () => {
  it("satisfies every class the project requires, every time", () => {
    // The old generator had no symbols at all, so this failed on the first
    // draw; and with only 8 digits in a 56-character alphabet, roughly one
    // draw in six also had no digit. A sample of one would have missed that.
    for (let i = 0; i < SAMPLE; i += 1) {
      const password = generateTemporaryPassword();
      for (const [name, pattern] of Object.entries(REQUIRED)) {
        expect(pattern.test(password), `${name} missing from "${password}"`).toBe(true);
      }
    }
  });

  it("is long enough for any sane minimum", () => {
    expect(generateTemporaryPassword().length).toBeGreaterThanOrEqual(12);
  });

  it("leaves out the characters that get misheard down a phone line", () => {
    // The admin reads this out loud; I/l/1 and O/0 are what get written wrong.
    for (let i = 0; i < SAMPLE; i += 1) {
      expect(generateTemporaryPassword()).not.toMatch(/[IlO01]/);
    }
  });

  it("does not leave the classes in a fixed order", () => {
    // Taking one per class and not shuffling would pin the first four
    // positions, giving a third of the password away to anyone who noticed.
    const firstCharClasses = new Set<string>();
    for (let i = 0; i < 200; i += 1) {
      const first = generateTemporaryPassword()[0];
      for (const [name, pattern] of Object.entries(REQUIRED)) {
        if (pattern.test(first)) firstCharClasses.add(name);
      }
    }
    expect(firstCharClasses.size).toBeGreaterThan(1);
  });

  it("does not repeat itself", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 500; i += 1) seen.add(generateTemporaryPassword());
    expect(seen.size).toBe(500);
  });
});
