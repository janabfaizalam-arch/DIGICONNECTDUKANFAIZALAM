import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import { derivePinPassword, getAuthHmacSecret, validateCustomerPin } from "@/lib/auth/pin";

const root = process.cwd();

function readSrc(relativePath: string) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

describe("Walk-in PIN security surfaces", () => {
  it("requires AUTH_HMAC_SECRET without a production fallback for derivePinPassword", () => {
    const previous = process.env.AUTH_HMAC_SECRET;
    try {
      delete process.env.AUTH_HMAC_SECRET;
      expect(() => getAuthHmacSecret()).toThrow(/AUTH_HMAC_SECRET/);
      expect(() => derivePinPassword("9876543210", "482913")).toThrow(/AUTH_HMAC_SECRET/);
    } finally {
      if (previous === undefined) delete process.env.AUTH_HMAC_SECRET;
      else process.env.AUTH_HMAC_SECRET = previous;
    }
  });

  it("does not log or persist temporary PIN in walk-in create / application modules", () => {
    const walkIn = readSrc("src/lib/crm/walk-in.ts");
    const walkInApp = readSrc("src/lib/crm/walk-in-application.ts");
    const walkInRoute = readSrc("src/app/api/admin/customers/walk-in/route.ts");
    const appRoute = readSrc("src/app/api/admin/crm/walk-in-application/route.ts");

    for (const source of [walkIn, walkInApp, walkInRoute, appRoute]) {
      expect(source).not.toMatch(/console\.(log|info|error|warn|debug)\([^)]*temporaryPin/);
      expect(source).not.toMatch(/localStorage|sessionStorage/);
    }

    expect(walkIn).toMatch(/hashPin\(temporaryPin\)/);
    expect(walkIn).toMatch(/hashed_pin:\s*hashedPin/);
    expect(walkIn).toMatch(/Never store temporaryPin|Never include temporaryPin/);
    expect(walkInRoute).toMatch(/Never log temporaryPin/);
    expect(appRoute).toMatch(/Never log temporaryPin/);
  });

  it("does not put temporary PIN in URL/query construction", () => {
    const walkInRoute = readSrc("src/app/api/admin/customers/walk-in/route.ts");
    const wizard = readSrc("src/components/admin/walk-in-customer-wizard.tsx");
    expect(walkInRoute).toMatch(/selectServiceHref:.*customerId=/);
    expect(walkInRoute).not.toMatch(/temporaryPin=/);
    expect(wizard).not.toMatch(/temporaryPin=/);
    expect(wizard).not.toMatch(/searchParams.*PIN|PIN.*searchParams/i);
  });

  it("rejects weak PINs before issuance", () => {
    expect(validateCustomerPin("123456", "9876543210").ok).toBe(false);
    expect(validateCustomerPin("654321", "9876543210").ok).toBe(false);
    expect(validateCustomerPin("987654", "9876543210").ok).toBe(false);
  });
});
