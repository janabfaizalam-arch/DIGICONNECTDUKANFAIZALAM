import { describe, expect, it } from "vitest";

import { readCode } from "@/lib/testing/source";

const page = readCode("src/components/services/labour-card/labour-card-page.tsx");
const directory = readCode("src/components/services/labour-card/scheme-directory.tsx");
const benefitLine = readCode("src/components/services/labour-card/benefit-line.tsx");
const checker = readCode("src/components/services/labour-card/eligibility-checker.tsx");
const api = readCode("src/app/api/admin/labour-schemes/route.ts");
const migration = readCode("supabase/migrations/20260904140000_labour_schemes.sql");
const faqs = readCode("src/lib/labour/faqs.ts");

/* ─────────────────────────────────────────────────────────────────────────
   Claims this business cannot make
   ───────────────────────────────────────────────────────────────────────── */

/**
 * A worker who believes this shop is a government agent will expect an
 * approval it cannot give, and will blame it when the department refuses. The
 * page says what the business does and stops there.
 */
describe("no false authority", () => {
  it("never claims to be authorised by, or an agent of, any government body", () => {
    const forbidden = [
      "Government Authorized",
      "Government Authorised",
      "Government Partner",
      "Official Government Agent",
      "sarkari agent",
      "authorised agent",
    ];
    for (const claim of forbidden) {
      expect(page.toLowerCase(), `the page claims "${claim}"`).not.toContain(claim.toLowerCase());
    }
  });

  it("never guarantees an approval", () => {
    for (const promise of ["guaranteed approval", "100% approval", "approval guarantee"]) {
      expect(page.toLowerCase()).not.toContain(promise);
    }
    expect(page).toMatch(/approval ki guarantee nahi/i);
  });

  it("says in the page what the business actually is", () => {
    expect(page).toMatch(/private digital service/i);
    expect(page).toMatch(/approval nahi dete/i);
  });

  it("answers the two awkward questions in the FAQ rather than avoiding them", () => {
    expect(faqs).toMatch(/Kya DigiConnect Dukan sarkari agent hai\?/);
    expect(faqs).toMatch(/Kya DigiConnect Dukan approval dila sakta hai\?/);
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   No figure lives in the page
   ───────────────────────────────────────────────────────────────────────── */

/**
 * The brief's rule, enforced: a rupee amount written into a component is an
 * amount that needs a deploy to correct, and government figures change by
 * notification. Every number comes from the scheme records.
 */
describe("amounts come from data, never from the page", () => {
  it("has no rupee figure hardcoded in any Labour Card component", () => {
    for (const [name, file] of [
      ["the page", page],
      ["the directory", directory],
      ["the checker", checker],
    ] as const) {
      // ₹ followed by digits — the shape of a hardcoded benefit.
      expect(file, `${name} hardcodes an amount`).not.toMatch(/₹\s?\d/);
    }
  });

  it("renders each amount through the benefit line, which formats what it is given", () => {
    expect(benefitLine).toContain("benefit.amount !== null ? formatInr(benefit.amount) : benefit.amountNote");
  });

  it("reads the schemes from the repository, not from an import of the seed", () => {
    expect(page).toContain("getLabourSchemes()");
    expect(page).not.toContain("SEED_SCHEMES");
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   The distinction the whole page rests on
   ───────────────────────────────────────────────────────────────────────── */

describe("cash, deposit and reimbursement look different on screen", () => {
  it("gives each kind its own icon and its own colour", () => {
    for (const kind of ["cash", "fd", "reimbursement", "installment", "pension", "service"]) {
      expect(benefitLine, `${kind} has no icon`).toContain(`${kind}:`);
    }
    expect(benefitLine).toContain("const TONE");
  });

  it("prints the kind as a word beside the money, not only as a colour", () => {
    // Colour alone fails for a colour-blind reader and in print.
    expect(benefitLine).toContain("BENEFIT_KIND_LABEL[benefit.kind]");
  });

  it("shows the legend once so the icons mean something", () => {
    expect(directory).toContain("<BenefitLegend />");
  });

  it("puts each benefit's conditions beside it", () => {
    expect(benefitLine).toContain("benefit.conditions?.length");
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   Restrictions are not footnotes
   ───────────────────────────────────────────────────────────────────────── */

describe("the conditions that sink applications are prominent", () => {
  it("renders scheme warnings as an alert block, not small print", () => {
    expect(directory).toContain("scheme.warnings?.length");
    expect(directory).toContain("border-l-[var(--dc-flame)]");
  });

  it("puts membership, work-days and child limits on the card as chips", () => {
    expect(directory).toContain("conditions.membershipDays");
    expect(directory).toContain("conditions.workDaysLast12Months");
    expect(directory).toContain("conditions.childLimit");
    expect(directory).toContain("conditions.applicationWindow");
  });

  it("says the card alone guarantees nothing, in the page body", () => {
    expect(page).toMatch(/har scheme ka benefit apne aap mil jayega/i);
  });

  it("keeps a rejection-reasons section", () => {
    expect(page).toContain("Application kyun reject hoti hai");
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   Provenance on the page
   ───────────────────────────────────────────────────────────────────────── */

describe("where a figure came from is visible", () => {
  it("shows the verification state on every card", () => {
    expect(directory).toContain("VerificationBadge");
    expect(directory).toContain("scheme.verification");
  });

  it("shows the source, who supplied it and when it was checked", () => {
    expect(directory).toContain("Jankari ka source");
    expect(directory).toContain("last verified");
  });

  it("links to the official portal when no exact notification is recorded", () => {
    expect(directory).toContain('sourceUrl ?? "https://upbocw.in/"');
  });

  it("surfaces an unresolved caveat rather than hiding it", () => {
    expect(directory).toContain("{caveat}");
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   The checker is a guide
   ───────────────────────────────────────────────────────────────────────── */

describe("the eligibility checker does not pretend to decide", () => {
  it("shows the disclaimer with the result", () => {
    expect(checker).toContain("CHECKER_DISCLAIMER");
  });

  it("shows what it did not ask about, beside what it checked", () => {
    expect(checker).toContain("Ye humne poocha hi nahi");
    expect(checker).toContain("result.untested");
  });

  it("announces the result to a screen reader", () => {
    expect(checker).toContain('aria-live="polite"');
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   Admin safety
   ───────────────────────────────────────────────────────────────────────── */

describe("editing a scheme", () => {
  it("is refused to anybody who is not an admin", () => {
    expect(api).toContain("isAdminRole(role)");
    expect(api).toContain('bad("Not allowed.", 403)');
  });

  it("keeps the previous row before overwriting it", () => {
    // Without the snapshot, an amount becomes whatever the last person typed
    // and nobody can trace it.
    const order = [api.indexOf('.select("*")'), api.indexOf(".update(update)"), api.indexOf("labour_scheme_versions")];
    expect(order[0]).toBeGreaterThan(-1);
    expect(order[1]).toBeGreaterThan(order[0]);
    expect(order[2]).toBeGreaterThan(order[1]);
  });

  it("proves a row was actually updated before reporting success", () => {
    // PostgREST treats an update matching nothing as a success.
    expect(api).toContain("after.length === 0");
  });

  it("accepts only http(s) in the source link", () => {
    // The link is rendered as an anchor on a public page.
    expect(api).toContain('url.protocol === "http:" || url.protocol === "https:"');
  });

  it("refuses to rename an id or a slug", () => {
    // A renamed slug silently breaks every link anybody has shared.
    const editable = api.slice(api.indexOf("const EDITABLE"), api.indexOf("]);"));
    expect(editable).not.toMatch(/"id"|"slug"/);
  });
});

describe("the scheme tables are server-only", () => {
  it("refuses every browser read and write", () => {
    // A draft amount or an unresolved caveat is not for a browser to read
    // before an administrator has decided it is right.
    expect(migration).toContain("enable row level security");
    expect(migration).toContain("using (false)");
    expect(migration).toContain("with check (false)");
  });

  it("keeps a version table with the source and who changed it", () => {
    expect(migration).toContain("labour_scheme_versions");
    expect(migration).toContain("changed_by");
    expect(migration).toContain("source_url");
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   Structured data
   ───────────────────────────────────────────────────────────────────────── */

describe("what the page tells search engines", () => {
  it("publishes the FAQs and a breadcrumb", () => {
    expect(page).toContain('"@type": "FAQPage"');
    expect(page).toContain('"@type": "BreadcrumbList"');
  });

  it("publishes no rating it cannot evidence", () => {
    expect(page).not.toContain("aggregateRating");
    expect(page).not.toContain("reviewCount");
  });
});
