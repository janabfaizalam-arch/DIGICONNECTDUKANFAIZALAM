import { describe, expect, it } from "vitest";

import {
  AGENCY_PARTNER_EXPORT_HEADERS,
  agencyPartnerExportFileName,
  buildAgencyPartnerExportRow,
  buildAgencyPartnerWorkbook,
} from "./agency-partner-export";
import {
  filterAgencyPartners,
  matchesAgencyPartnerSearch,
  parseAgencyPartnerFilters,
} from "./agency-partner-filters";
import type { APListItem } from "@/lib/ap-types";
import { readCode } from "@/lib/testing/source";

function makePartner(overrides: Partial<APListItem> = {}): APListItem {
  return {
    id: "2b7f2f34-1b8a-4a6c-9a2f-4a4d6a9c1111",
    user_id: "9c1d2f34-1b8a-4a6c-9a2f-4a4d6a9c2222",
    partner_code: "CEO-DP-0001-T029",
    full_name: "Ayaz Khan",
    business_name: "SK Enterprises",
    partner_type: "field_executive",
    mobile: "8931816137",
    whatsapp: "8931816137",
    email: "ayazkhan089318161@gmail.com",
    address: "Civil Lines",
    state: "Uttar Pradesh",
    district: "Jalaun",
    pin: "285001",
    aadhaar_number: "123412341234",
    pan_number: "ABCDE1234F",
    gstin: null,
    bank_account_name: "Ayaz Khan",
    bank_account_number: "50100123456789",
    bank_ifsc: "HDFC0001234",
    bank_name: "HDFC Bank",
    upi_id: "ayaz@upi",
    emergency_contact: "7000000000",
    nominee_name: null,
    nominee_relation: null,
    referral_source: "Walk-in",
    profile_photo_url: null,
    profile_photo_path: null,
    tier_id: null,
    commission_plan: "Standard",
    commission_type: "percentage",
    commission_value: 0,
    commission_rate: 12.5,
    status: "active",
    kyc_status: "approved",
    kyc_verified_at: "2026-02-11T09:30:00.000Z",
    kyc_verified_by: null,
    admin_notes: null,
    created_at: "2026-01-05T06:15:00.000Z",
    updated_at: "2026-02-11T09:30:00.000Z",
    activated_at: "2026-01-06T05:00:00.000Z",
    suspended_at: null,
    blacklisted_at: null,
    created_by_user_id: null,
    tier: { name: "DC Starter" } as APListItem["tier"],
    totalApplications: 4,
    pendingApplications: 1,
    completedApplications: 3,
    pendingCommission: 750.25,
    totalPaidCommission: 1200,
    customerCount: 0,
    ...overrides,
  } as APListItem;
}

/** Read a header's value out of a built row by name, so column order can move. */
function cellFor(row: ReturnType<typeof buildAgencyPartnerExportRow>, header: string) {
  const index = AGENCY_PARTNER_EXPORT_HEADERS.indexOf(header);
  expect(index).toBeGreaterThanOrEqual(0);
  return row[index];
}

describe("buildAgencyPartnerExportRow", () => {
  const row = buildAgencyPartnerExportRow(makePartner());

  it("produces exactly one cell per column", () => {
    expect(row).toHaveLength(AGENCY_PARTNER_EXPORT_HEADERS.length);
  });

  it("carries the full partner record, not just what the table shows", () => {
    expect(cellFor(row, "Partner Code")).toBe("CEO-DP-0001-T029");
    expect(cellFor(row, "Full Name")).toBe("Ayaz Khan");
    expect(cellFor(row, "Business / Shop Name")).toBe("SK Enterprises");
    expect(cellFor(row, "Mobile")).toBe("8931816137");
    expect(cellFor(row, "Email")).toBe("ayazkhan089318161@gmail.com");
    expect(cellFor(row, "District")).toBe("Jalaun");
    expect(cellFor(row, "PIN Code")).toBe("285001");
    expect(cellFor(row, "Aadhaar Number")).toBe("123412341234");
    expect(cellFor(row, "PAN Number")).toBe("ABCDE1234F");
    expect(cellFor(row, "Bank Account Number")).toBe("50100123456789");
    expect(cellFor(row, "Bank IFSC")).toBe("HDFC0001234");
    expect(cellFor(row, "UPI ID")).toBe("ayaz@upi");
    expect(cellFor(row, "Tier")).toBe("DC Starter");
  });

  it("writes human labels for status and partner type, without the UI emoji", () => {
    expect(cellFor(row, "Status")).toBe("Active");
    expect(cellFor(row, "KYC Status")).toBe("Approved");
    expect(cellFor(row, "Partner Type")).toBe("Field Executive");
  });

  it("keeps money and counts numeric so Excel can total them", () => {
    expect(cellFor(row, "Total Applications")).toBe(4);
    expect(cellFor(row, "Pending Settlement (Rs)")).toBe(750.25);
    expect(cellFor(row, "Paid Commission (Rs)")).toBe(1200);
    expect(cellFor(row, "Lifetime Commission (Rs)")).toBe(1950.25);
    expect(cellFor(row, "Commission Rate (%)")).toBe(12.5);
  });

  it("formats timestamps as sortable ISO values and blanks the missing ones", () => {
    expect(cellFor(row, "Registered On")).toBe("2026-01-05 06:15");
    expect(cellFor(row, "Activated On")).toBe("2026-01-06 05:00");
    expect(cellFor(row, "Suspended On")).toBe("");
    expect(cellFor(row, "Blacklisted On")).toBe("");
  });

  it("blanks null and unparseable values instead of writing 'null'", () => {
    const sparse = buildAgencyPartnerExportRow(
      makePartner({
        business_name: null,
        gstin: null,
        tier: null,
        created_at: "not-a-date",
        admin_notes: "  ",
      }),
    );
    expect(cellFor(sparse, "Business / Shop Name")).toBe("");
    expect(cellFor(sparse, "GSTIN")).toBe("");
    expect(cellFor(sparse, "Tier")).toBe("");
    expect(cellFor(sparse, "Registered On")).toBe("");
    expect(cellFor(sparse, "Admin Notes")).toBe("");
  });
});

describe("buildAgencyPartnerWorkbook", () => {
  it("builds a downloadable workbook even when no partner matches", () => {
    const empty = buildAgencyPartnerWorkbook([]);
    expect(empty.subarray(0, 2).toString("utf8")).toBe("PK");
    expect(empty.length).toBeGreaterThan(0);
  });

  it("grows with the number of partners it is given", () => {
    const one = buildAgencyPartnerWorkbook([makePartner()]);
    const many = buildAgencyPartnerWorkbook(
      Array.from({ length: 25 }, (_, index) =>
        makePartner({ partner_code: `CEO-DP-0001-T${index}`, full_name: `Partner ${index}` }),
      ),
    );
    expect(many.length).toBeGreaterThan(one.length);
  });
});

describe("agencyPartnerExportFileName", () => {
  it("stamps the download with the export date", () => {
    expect(agencyPartnerExportFileName(new Date("2026-08-26T11:00:00.000Z"))).toBe(
      "digiconnect-digi-partners-2026-08-26.xlsx",
    );
  });
});

describe("DC Partner filters", () => {
  const partners = [
    makePartner({ full_name: "Ayaz Khan", partner_type: "field_executive" }),
    makePartner({
      id: "3c8f2f34-1b8a-4a6c-9a2f-4a4d6a9c3333",
      full_name: "Mohd Junaid Khan",
      business_name: "Orai Digi Connect Office",
      partner_code: "CEO-DP-0001-T028",
      mobile: "7985900024",
      partner_type: "business_partner",
    }),
  ];

  it("reads query and partner type off the request, tolerating junk", () => {
    expect(parseAgencyPartnerFilters({ q: "  vikas  ", type: "business_partner" })).toEqual({
      query: "vikas",
      type: "business_partner",
    });
    expect(parseAgencyPartnerFilters({ q: null, type: "not-a-type" })).toEqual({
      query: "",
      type: null,
    });
  });

  it("maps a legacy partner type onto its canonical value", () => {
    expect(parseAgencyPartnerFilters({ type: "shop_owner" }).type).toBe("business_partner");
  });

  it("matches on name, mobile, code, shop and location", () => {
    const ap = partners[1];
    expect(matchesAgencyPartnerSearch(ap, "junaid")).toBe(true);
    expect(matchesAgencyPartnerSearch(ap, "7985900024")).toBe(true);
    expect(matchesAgencyPartnerSearch(ap, "T028")).toBe(true);
    expect(matchesAgencyPartnerSearch(ap, "orai")).toBe(true);
    expect(matchesAgencyPartnerSearch(ap, "Jalaun")).toBe(true);
    expect(matchesAgencyPartnerSearch(ap, "nobody")).toBe(false);
    expect(matchesAgencyPartnerSearch(ap, "   ")).toBe(true);
  });

  it("exports exactly the rows the console is showing", () => {
    const filtered = filterAgencyPartners(
      partners,
      parseAgencyPartnerFilters({ q: "khan", type: "business_partner" }),
    );
    expect(filtered.map((ap) => ap.full_name)).toEqual(["Mohd Junaid Khan"]);
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   Activity, services and wallet — and the printable sheet beside them
   ───────────────────────────────────────────────────────────────────────── */

describe("the columns that say whether a partner is still working", () => {
  const headers = AGENCY_PARTNER_EXPORT_HEADERS;

  it("carries the wallet balance", () => {
    expect(headers).toContain("Wallet Balance (Rs)");
  });

  it("carries when they last applied and for what", () => {
    expect(headers).toContain("Last Application");
    expect(headers).toContain("Last Service Used");
  });

  it("carries every service they have used, and how many", () => {
    expect(headers).toContain("Services Used");
    expect(headers).toContain("Services Count");
  });

  it("carries the last login beside it, not instead of it", () => {
    // last_login_at is blank for anyone who signed in before it was recorded,
    // so on its own it would read as "never worked".
    expect(headers).toContain("Last Login");
    expect(headers.indexOf("Last Application")).toBeLessThan(headers.indexOf("Last Login"));
  });

  it("still carries when the partner opened", () => {
    expect(headers).toContain("Registered On");
  });
});

describe("the printable list", () => {
  const print = readCode("src/app/admin/agency-partners/print/page.tsx");
  const console_ = readCode("src/app/admin/agency-partners/page.tsx");
  const routes = readCode("src/lib/admin/agency-partner-routes.ts");

  it("is admin-only", () => {
    expect(print).toContain("isAdminRole");
    expect(print).toContain('redirect("/dashboard")');
  });

  it("leaves identity and bank details off the paper", () => {
    // The workbook carries them because finance needs them and the download is
    // audited. A printed sheet gets left on a desk.
    for (const field of [
      "aadhaar_number",
      "pan_number",
      "bank_account_number",
      "bank_ifsc",
      "upi_id",
    ]) {
      expect(print, `${field} must not be printed`).not.toContain(field);
    }
  });

  it("prints what was asked for: number, opened, last work, services, wallet", () => {
    expect(print).toContain("partner.mobile");
    expect(print).toContain("partner.created_at");
    expect(print).toContain("lastActivity(partner)");
    expect(print).toContain("formatServicesUsed");
    expect(print).toContain("partner.walletBalance");
  });

  it("honours the console's own filters, so it prints what is on screen", () => {
    expect(print).toContain("parseAgencyPartnerFilters");
    expect(print).toContain("filterAgencyPartners");
    expect(routes).toContain("adminAgencyPartnerPrintPath");
  });

  it("is reachable from the console beside the Excel download", () => {
    expect(console_).toContain("adminAgencyPartnerPrintPath");
    expect(console_).toContain("Print List");
  });

  it("keeps the table header on every page", () => {
    // Otherwise page three is twelve unlabelled columns.
    expect(print).toContain("table-header-group");
  });
});

describe("the login that fills Last Login", () => {
  it("is recorded by the route the partner forms actually post to", () => {
    // profiles.last_login_at was only written by /api/auth/ap/login, which the
    // UI never calls, so the column was null for every partner.
    const login = readCode("src/app/api/auth/agent-login/route.ts");
    expect(login).toContain("last_login_at");
    // After the access check: a refused login is not a login.
    expect(login.indexOf("getAgentAccessStatus")).toBeLessThan(login.indexOf("last_login_at"));
  });
});
