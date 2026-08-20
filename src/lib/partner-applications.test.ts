import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

import { DIGI_PARTNER_TYPE_VALUES } from "@/lib/ap/partner-type";
import {
  PARTNER_APPLICATION_STATUSES,
  allowedApplicationTransitions,
  canTransitionApplication,
  generateTrackingCode,
  isOpenApplicationStatus,
  isPartnerApplicationStatus,
  isValidMobile,
  isValidPan,
  normalizeMobile,
  toApplicationRow,
  validatePartnerApplication,
} from "@/lib/partner-applications";

const root = process.cwd();
const readSrc = (rel: string) => readFileSync(join(root, rel), "utf8");

const migration = readSrc("supabase/migrations/20260820100000_partner_signup_applications.sql");

function baseApplication(overrides: Record<string, unknown> = {}) {
  return {
    fullName: "Faiz Alam",
    mobile: "9876543210",
    email: "faiz@example.com",
    partnerType: "business_partner",
    ...overrides,
  };
}

describe("application vocabulary matches the table", () => {
  it("uses the statuses the check constraint allows", () => {
    // Drift here means the API accepts a status the database will reject.
    for (const status of PARTNER_APPLICATION_STATUSES) {
      expect(migration).toContain(`'${status}'`);
    }
  });

  it("offers only partner types the check constraint allows", () => {
    for (const type of DIGI_PARTNER_TYPE_VALUES) {
      expect(migration).toContain(`'${type}'`);
    }
  });

  it("rejects statuses outside the vocabulary", () => {
    expect(isPartnerApplicationStatus("approved")).toBe(true);
    expect(isPartnerApplicationStatus("cancelled")).toBe(false);
    expect(isPartnerApplicationStatus(null)).toBe(false);
  });
});

describe("review lifecycle", () => {
  it("lets a pending application be reviewed, approved or rejected", () => {
    expect(allowedApplicationTransitions("pending")).toEqual(["under_review", "approved", "rejected"]);
  });

  it("treats approved and rejected as terminal", () => {
    // Re-approving would provision a second partner account for one person;
    // un-rejecting would leave a live login behind a rejected application.
    expect(allowedApplicationTransitions("approved")).toEqual([]);
    expect(allowedApplicationTransitions("rejected")).toEqual([]);
    expect(canTransitionApplication("approved", "rejected")).toBe(false);
    expect(canTransitionApplication("rejected", "approved")).toBe(false);
  });

  it("knows which statuses still hold the one-open-application slot", () => {
    expect(isOpenApplicationStatus("pending")).toBe(true);
    expect(isOpenApplicationStatus("under_review")).toBe(true);
    expect(isOpenApplicationStatus("approved")).toBe(false);
    expect(isOpenApplicationStatus("rejected")).toBe(false);
  });

  it("enforces one open application per mobile in the database", () => {
    // The app-level check races; the partial unique index does not.
    expect(migration).toContain("ap_applications_one_open_per_mobile_idx");
    expect(migration).toMatch(/where status in \('pending', 'under_review'\)/);
  });
});

describe("validatePartnerApplication", () => {
  it("accepts a minimal application", () => {
    // Someone filling this on a phone should not be blocked on a GSTIN.
    const result = validatePartnerApplication(baseApplication());
    expect(result.ok).toBe(true);
  });

  it("requires a usable name, mobile and email", () => {
    expect(validatePartnerApplication(baseApplication({ fullName: "Fa" })).ok).toBe(false);
    expect(validatePartnerApplication(baseApplication({ mobile: "12345" })).ok).toBe(false);
    expect(validatePartnerApplication(baseApplication({ email: "not-an-email" })).ok).toBe(false);
  });

  it("names the field that failed so the form can point at it", () => {
    const result = validatePartnerApplication(baseApplication({ mobile: "5555555555" }));
    expect(result).toMatchObject({ ok: false, field: "mobile" });
  });

  it("rejects a partner type outside the vocabulary", () => {
    expect(validatePartnerApplication(baseApplication({ partnerType: "reseller" })).ok).toBe(false);
  });

  it("validates optional fields only when they are given", () => {
    expect(validatePartnerApplication(baseApplication({ panNumber: "" })).ok).toBe(true);
    expect(validatePartnerApplication(baseApplication({ panNumber: "NOTAPAN" })).ok).toBe(false);
    expect(validatePartnerApplication(baseApplication({ panNumber: "ABCDE1234F" })).ok).toBe(true);

    expect(validatePartnerApplication(baseApplication({ aadhaarNumber: "1234" })).ok).toBe(false);
    expect(validatePartnerApplication(baseApplication({ aadhaarNumber: "123456789012" })).ok).toBe(true);

    expect(validatePartnerApplication(baseApplication({ pin: "12" })).ok).toBe(false);
    expect(validatePartnerApplication(baseApplication({ pin: "800001" })).ok).toBe(true);
  });

  it("normalises the mobile the way the rest of the app stores it", () => {
    // Everything else keys partners on the last 10 digits, so "+91 98765 43210"
    // and "9876543210" must not become two different people.
    expect(normalizeMobile("+91 98765 43210")).toBe("9876543210");
    const result = validatePartnerApplication(baseApplication({ mobile: "+91 98765 43210" }));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.mobile).toBe("9876543210");
  });

  it("uppercases PAN and GSTIN", () => {
    const result = validatePartnerApplication(
      baseApplication({ panNumber: "abcde1234f", gstin: "10abcde1234f1z5" }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.panNumber).toBe("ABCDE1234F");
    expect(result.value.gstin).toBe("10ABCDE1234F1Z5");
  });
});

describe("field helpers", () => {
  it("accepts only real Indian mobile prefixes", () => {
    expect(isValidMobile("9876543210")).toBe(true);
    expect(isValidMobile("6123456789")).toBe(true);
    expect(isValidMobile("5123456789")).toBe(false);
    expect(isValidMobile("98765432")).toBe(false);
  });

  it("checks PAN shape", () => {
    expect(isValidPan("ABCDE1234F")).toBe(true);
    expect(isValidPan("ABCD1234EF")).toBe(false);
  });
});

describe("toApplicationRow", () => {
  it("always writes a pending row", () => {
    // The public form must never be able to submit itself as approved.
    const result = validatePartnerApplication(baseApplication());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const row = toApplicationRow(result.value, "DPA-TEST");
    expect(row.status).toBe("pending");
    expect(row.tracking_code).toBe("DPA-TEST");
  });
});

describe("tracking codes", () => {
  it("are prefixed and unguessable rather than sequential", () => {
    // The status route takes this code alone, so a predictable one would let
    // anyone enumerate other people's applications.
    const code = generateTrackingCode(() => "abc123def456");
    expect(code).toBe("DPA-ABC123DEF456");

    const real = new Set(Array.from({ length: 50 }, () => generateTrackingCode()));
    expect(real.size).toBe(50);
  });
});

describe("the signup path is actually wired up", () => {
  it("the AP login CTA opens the application form", () => {
    // It used to link to /services, which starts nothing.
    const loginForm = readSrc("src/components/auth/ap-login-form.tsx");
    expect(loginForm).toContain("/digi-partner/apply");
    expect(loginForm).not.toContain('href="/services"');
  });

  it("the landing page CTA opens the form instead of WhatsApp", () => {
    const landing = readSrc("src/app/digi-partner/page.tsx");
    expect(landing).toContain("DIGI_PARTNER_APPLY_ROUTE");
  });

  it("approving provisions a real partner account", () => {
    const route = readSrc("src/app/api/admin/partner-applications/[id]/route.ts");
    expect(route).toContain("provisionPartnerAccount");
    // Provision first: a failure must leave the application reviewable rather
    // than approved with no account behind it.
    expect(route.indexOf("provisionPartnerAccount(")).toBeLessThan(route.indexOf(".update(updates)"));
  });

  it("a self-signup cannot withdraw before KYC", () => {
    // /api/ap/wallet gates payouts on kyc_status === "approved", so money
    // cannot leave on an identity nobody has checked.
    const route = readSrc("src/app/api/admin/partner-applications/[id]/route.ts");
    expect(route).toContain('kycStatus: "pending"');

    const wallet = readSrc("src/app/api/ap/wallet/route.ts");
    expect(wallet).toContain('kyc_status !== "approved"');
  });

  it("the public form cannot create a partner directly", () => {
    const route = readSrc("src/app/api/partner-applications/route.ts");
    expect(route).toContain("agency_partner_applications");
    expect(route).not.toContain("auth.admin.createUser");
    expect(route).not.toContain("provisionPartnerAccount");
  });

  it("the status route returns no identity documents", () => {
    // The tracking code is the only credential on that route.
    const route = readSrc("src/app/api/partner-applications/status/route.ts");
    expect(route).not.toContain("aadhaar_number");
    expect(route).not.toContain("pan_number");
    expect(route).not.toContain("review_notes");
  });

  it("admins reach the review queue from the nav", () => {
    const nav = readSrc("src/lib/admin/nav.ts");
    expect(nav).toContain("/admin/partner-applications");
  });
});
