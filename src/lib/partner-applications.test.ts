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
    businessName: "Alam Digital Seva",
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
    // Name, mobile, shop name. Nothing else is worth turning a partner away
    // over before anybody has even read their application.
    const result = validatePartnerApplication(baseApplication());
    expect(result.ok).toBe(true);
  });

  it("requires a usable name and mobile", () => {
    expect(validatePartnerApplication(baseApplication({ fullName: "Fa" })).ok).toBe(false);
    expect(validatePartnerApplication(baseApplication({ mobile: "12345" })).ok).toBe(false);
  });

  it("does not require an email at all", () => {
    /*
      The form used to demand one and call it the login. The login is a
      username built from the mobile; plenty of shop owners have WhatsApp and
      no working email, and the field was turning them away at the first
      screen for something nothing depended on.
    */
    expect(validatePartnerApplication(baseApplication({ email: "" })).ok).toBe(true);
    const result = validatePartnerApplication(baseApplication({ email: undefined }));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.email).toBeNull();
  });

  it("still catches a typo in an email that was offered", () => {
    expect(validatePartnerApplication(baseApplication({ email: "not-an-email" })).ok).toBe(false);
    const good = validatePartnerApplication(baseApplication({ email: "Faiz@Example.com" }));
    expect(good.ok).toBe(true);
    if (good.ok) expect(good.value.email).toBe("faiz@example.com");
  });

  it("asks a shop for its name, and a field executive for nothing of the kind", () => {
    expect(
      validatePartnerApplication(baseApplication({ businessName: "" })),
    ).toMatchObject({ ok: false, field: "businessName" });

    expect(
      validatePartnerApplication({
        fullName: "Faiz Alam",
        mobile: "9876543210",
        partnerType: "field_executive",
      }).ok,
    ).toBe(true);
  });

  it("refuses the two types nobody may claim for themselves", () => {
    /*
      Company Partner is a commercial arrangement and Office Staff is an
      employee: both are created by an admin or from /ap/team. Offering them
      on a public form let anyone register as a strategic partner of the
      company by changing one field in the request.
    */
    for (const partnerType of ["company_partner", "office_staff"]) {
      expect(
        validatePartnerApplication(baseApplication({ partnerType })),
        `${partnerType} was accepted from the public form`,
      ).toMatchObject({ ok: false, field: "partnerType" });
    }
  });

  it("names the field that failed so the form can point at it", () => {
    const result = validatePartnerApplication(baseApplication({ mobile: "5555555555" }));
    expect(result).toMatchObject({ ok: false, field: "mobile" });
  });

  it("rejects a partner type outside the vocabulary", () => {
    expect(validatePartnerApplication(baseApplication({ partnerType: "reseller" })).ok).toBe(false);
  });

  it("validates optional fields only when they are given", () => {
    expect(validatePartnerApplication(baseApplication({ whatsapp: "" })).ok).toBe(true);
    expect(validatePartnerApplication(baseApplication({ whatsapp: "12345" })).ok).toBe(false);
    expect(validatePartnerApplication(baseApplication({ whatsapp: "9876543211" })).ok).toBe(true);

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

  it("no longer asks a stranger for their documents", () => {
    /*
      PAN, Aadhaar and GSTIN were on a form filled in by someone who had not
      yet been told whether we wanted them. They belong to KYC, which happens
      after approval and before any money moves.
    */
    const form = readSrc("src/components/partner/partner-application-form.tsx");
    for (const field of ["panNumber", "aadhaarNumber", "gstin", "referralSource"]) {
      expect(form, `${field} is still on the public form`).not.toContain(field);
    }
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

/* ─────────────────────────────────────────────────────────────────────────
   Approving somebody has to leave them able to log in
   ───────────────────────────────────────────────────────────────────────── */

/**
 * It did not. Approving a signup created an auth user at the applicant's own
 * email address and set no username anywhere — while /api/auth/ap/login looks
 * a partner up by `username` and signs in as <username>@agency.rnos.internal.
 * So every self-signup that an admin approved got a partner code, a temporary
 * password, and no way into the panel; the admin screen did not even have a
 * username to read out. Partners created at /admin/agency-partners/new have
 * always worked, because that route does what this now does.
 */
describe("an approved partner can actually sign in", () => {
  const provision = readSrc("src/lib/ap/provision-partner.ts");
  const login = readSrc("src/app/api/auth/ap/login/route.ts");
  const adminCreate = readSrc("src/app/api/admin/agency-partners/create/route.ts");
  const actions = readSrc("src/components/admin/partner-application-actions.tsx");

  it("provisions the username the login route searches on", () => {
    expect(login).toContain('.eq("username", username)');
    expect(provision).toContain("username,");
    expect(provision).toMatch(/agency_partners[\s\S]{0,400}username/);
  });

  it("creates the auth user at the address the login route builds", () => {
    // Not the applicant's own email: that address is never signed in with.
    expect(login).toContain("agencyInternalEmail(username)");
    expect(provision).toContain("agencyInternalEmail(username)");
    expect(provision).toContain("email: loginEmail");
    expect(adminCreate).toContain("agencyInternalEmail(username)");
  });

  it("does not need an email to provision anybody", () => {
    expect(provision).toContain("email?: string | null");
    expect(provision).toContain("contactEmail || loginEmail");
  });

  it("forces the read-out-loud password to be changed", () => {
    expect(provision).toContain("must_change_password: true");
  });

  it("shows the admin the username, not just a partner code", () => {
    // A partner code is not a login. The box used to offer only that.
    expect(actions).toContain("Username:");
    expect(actions).toContain("credentials.username");
  });

  it("refuses rather than provisioning a login nobody can find", () => {
    expect(provision).toContain("Could not allocate a partner username.");
  });
});
