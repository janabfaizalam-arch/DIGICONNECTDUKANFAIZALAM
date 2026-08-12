import { describe, expect, it } from "vitest";

import {
  checkPasswordStrength,
  describeAuthError,
  isValidEmail,
  normalizeEmail,
  resolveIdentifier,
  validateSignup,
} from "@/lib/auth/customer-account-core";
import { isValidPincode, parsePincodeResponse } from "@/lib/geo/pincode-core";

const VALID_SIGNUP = {
  fullName: "Faiz Alam",
  email: "Faiz@Example.COM",
  mobile: "9876543210",
  password: "digi9connect",
  confirmPassword: "digi9connect",
  address: "12 Station Road",
  pincode: "226001",
  city: "Lucknow GPO",
  district: "Lucknow",
  state: "Uttar Pradesh",
};

describe("password strength", () => {
  it("requires length, a letter and a number", () => {
    expect(checkPasswordStrength("short1").ok).toBe(false);
    expect(checkPasswordStrength("alllettersonly").ok).toBe(false);
    expect(checkPasswordStrength("12345678").ok).toBe(false);
    expect(checkPasswordStrength("passw0rdish").ok).toBe(true);
  });

  it("rejects the passwords attackers try first", () => {
    expect(checkPasswordStrength("password123").ok).toBe(false);
    expect(checkPasswordStrength("Password123").ok).toBe(false); // case-insensitive
    expect(checkPasswordStrength("digiconnect1").ok).toBe(false);
  });

  it("rejects a single repeated character", () => {
    expect(checkPasswordStrength("aaaaaaaaa").ok).toBe(false);
  });

  it("rejects anything bcrypt would silently truncate", () => {
    expect(checkPasswordStrength(`${"a1".repeat(40)}`).ok).toBe(false);
  });

  it("does not throw on non-strings", () => {
    expect(checkPasswordStrength(null).ok).toBe(false);
    expect(checkPasswordStrength(12345678).ok).toBe(false);
  });
});

describe("email handling", () => {
  it("lowercases and trims", () => {
    expect(normalizeEmail("  Faiz@Example.COM ")).toBe("faiz@example.com");
  });

  it("does not collapse dots or plus tags into one account", () => {
    // Treating a.b@gmail and ab@gmail as the same address would let one person
    // take over another's signup. Different strings stay different accounts.
    expect(normalizeEmail("a.b@example.com")).not.toBe(normalizeEmail("ab@example.com"));
    expect(normalizeEmail("a+tag@example.com")).not.toBe(normalizeEmail("a@example.com"));
  });

  it("accepts ordinary addresses and rejects malformed ones", () => {
    expect(isValidEmail("faiz@example.com")).toBe(true);
    expect(isValidEmail("faiz@example")).toBe(false);
    expect(isValidEmail("faiz example@x.com")).toBe(false);
    expect(isValidEmail("@example.com")).toBe(false);
    expect(isValidEmail("")).toBe(false);
  });
});

describe("login identifier", () => {
  it("recognises an email", () => {
    expect(resolveIdentifier(" Faiz@Example.com ")).toEqual({
      kind: "email",
      email: "faiz@example.com",
    });
  });

  it("recognises an Indian mobile in several written forms", () => {
    for (const written of ["9876543210", "+91 98765 43210", "919876543210", "09876543210"]) {
      expect(resolveIdentifier(written)).toEqual({ kind: "mobile", mobile: "9876543210" });
    }
  });

  it("rejects numbers that are not Indian mobiles", () => {
    expect(resolveIdentifier("1234567890").kind).toBe("invalid");
    expect(resolveIdentifier("98765").kind).toBe("invalid");
    expect(resolveIdentifier("").kind).toBe("invalid");
  });

  it("does not mistake a malformed email for a mobile", () => {
    expect(resolveIdentifier("faiz@").kind).toBe("invalid");
  });
});

describe("signup validation", () => {
  it("accepts a complete submission and returns normalised values", () => {
    const result = validateSignup(VALID_SIGNUP);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.email).toBe("faiz@example.com");
    expect(result.value.mobile).toBe("9876543210");
    expect(result.value).not.toHaveProperty("confirmPassword");
  });

  it("names the offending field so the UI can focus it", () => {
    const cases: Array<[Partial<typeof VALID_SIGNUP>, string]> = [
      [{ fullName: "X" }, "fullName"],
      [{ email: "nope" }, "email"],
      [{ mobile: "12345" }, "mobile"],
      [{ password: "weak", confirmPassword: "weak" }, "password"],
      [{ confirmPassword: "different1" }, "confirmPassword"],
      [{ address: "x" }, "address"],
      [{ pincode: "12" }, "pincode"],
      [{ city: "" }, "city"],
    ];

    for (const [override, field] of cases) {
      const result = validateSignup({ ...VALID_SIGNUP, ...override });
      expect(result.ok, `expected ${field} to fail`).toBe(false);
      if (result.ok) continue;
      expect(result.field).toBe(field);
    }
  });

  it("rejects a pincode starting with zero", () => {
    const result = validateSignup({ ...VALID_SIGNUP, pincode: "026001" });
    expect(result.ok).toBe(false);
  });

  it("checks the password before comparing the confirmation", () => {
    // Otherwise a user fixing a mismatch is told the passwords match and then
    // immediately told the password is too weak.
    const result = validateSignup({ ...VALID_SIGNUP, password: "abc", confirmPassword: "xyz" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.field).toBe("password");
  });
});

describe("auth error messages", () => {
  it("does not reveal whether an account exists", () => {
    const message = describeAuthError({ message: "Invalid login credentials" });
    expect(message).toBe("Email/mobile or password is incorrect.");
    expect(message).not.toMatch(/not found|no account|unregistered/i);
  });

  it("tells an unconfirmed user what to do", () => {
    expect(describeAuthError({ message: "Email not confirmed" })).toMatch(/confirm your email/i);
  });

  it("falls back safely on unknown errors without leaking internals", () => {
    const message = describeAuthError({ message: "pgbouncer: FATAL connection slots" });
    expect(message).toBe("Something went wrong. Please try again.");
    expect(message).not.toMatch(/pgbouncer/i);
  });

  it("survives non-object input", () => {
    expect(describeAuthError(null)).toBeTruthy();
    expect(describeAuthError("boom")).toBeTruthy();
  });
});

describe("pincode lookup parsing", () => {
  const success = [
    {
      Message: "Number of pincode(s) found:2",
      Status: "Success",
      PostOffice: [
        { Name: "Lucknow GPO", District: "Lucknow", State: "Uttar Pradesh" },
        { Name: "Aliganj", District: "Lucknow", State: "Uttar Pradesh" },
      ],
    },
  ];

  it("collects every area name for the pincode", () => {
    const result = parsePincodeResponse(success, "226001");
    expect(result).not.toBeNull();
    expect(result?.areas).toEqual(["Aliganj", "Lucknow GPO"]);
    expect(result?.district).toBe("Lucknow");
    expect(result?.state).toBe("Uttar Pradesh");
  });

  it("treats a 200-with-Error body as a miss", () => {
    // India Post answers misses with HTTP 200, so status code alone is useless.
    expect(parsePincodeResponse([{ Status: "Error", PostOffice: null }], "999999")).toBeNull();
    expect(parsePincodeResponse([{ Status: "Success", PostOffice: [] }], "999999")).toBeNull();
  });

  it("does not trust index 0 to be well-formed", () => {
    const ragged = [
      {
        Status: "Success",
        PostOffice: [
          { Name: "Some Branch", District: "", State: "" },
          { Name: "Other Branch", District: "Lucknow", State: "Uttar Pradesh" },
        ],
      },
    ];
    expect(parsePincodeResponse(ragged, "226001")?.district).toBe("Lucknow");
  });

  it("survives junk", () => {
    expect(parsePincodeResponse(null, "226001")).toBeNull();
    expect(parsePincodeResponse("nope", "226001")).toBeNull();
    expect(parsePincodeResponse([], "226001")).toBeNull();
    expect(parsePincodeResponse([{ Status: "Success" }], "226001")).toBeNull();
  });

  it("validates the pincode shape", () => {
    expect(isValidPincode("226001")).toBe(true);
    expect(isValidPincode("026001")).toBe(false);
    expect(isValidPincode("22600")).toBe(false);
    expect(isValidPincode(null)).toBe(false);
  });
});
