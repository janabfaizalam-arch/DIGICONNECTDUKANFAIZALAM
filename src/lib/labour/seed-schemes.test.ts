import { describe, expect, it } from "vitest";

import { SEED_SCHEMES, seedBenefitCount } from "@/lib/labour/seed-schemes";
import { isSummable, type BenefitKind } from "@/lib/labour/types";

/* ─────────────────────────────────────────────────────────────────────────
   The one that matters most
   ───────────────────────────────────────────────────────────────────────── */

/**
 * ₹25,000 cash and a ₹25,000 fixed deposit are different things. One buys food
 * this month; the other matures when a daughter turns eighteen and only if she
 * is still unmarried. A page that adds them into "₹50,000" has told a family a
 * lie they may plan around — which is why there is no total field anywhere in
 * this model and why `isSummable` refuses across kinds.
 */
describe("cash and a fixed deposit are never the same money", () => {
  it("refuses to add a deposit to cash", () => {
    expect(isSummable("cash", "fd")).toBe(false);
    expect(isSummable("fd", "cash")).toBe(false);
  });

  it("refuses to add anything to a reimbursement, a pension or a service", () => {
    for (const kind of ["reimbursement", "pension", "service", "installment", "awareness"] as BenefitKind[]) {
      expect(isSummable(kind, kind), `${kind} was made addable`).toBe(false);
      expect(isSummable(kind, "cash")).toBe(false);
    }
  });

  it("keeps the girl-child cash and the girl-child deposit as separate lines", () => {
    const scheme = SEED_SCHEMES.find((s) => s.id === "matritva-shishu-balika")!;
    const cash = scheme.benefits.find((b) => b.kind === "cash" && b.amount === 25000);
    const deposit = scheme.benefits.find((b) => b.kind === "fd" && b.amount === 25000);

    expect(cash, "the ₹25,000 cash line is missing").toBeTruthy();
    expect(deposit, "the ₹25,000 FD line is missing").toBeTruthy();
    expect(cash).not.toBe(deposit);
  });

  it("says out loud that they must not be added", () => {
    const scheme = SEED_SCHEMES.find((s) => s.id === "matritva-shishu-balika")!;
    expect(scheme.warnings?.join(" ")).toMatch(/₹50,000 cash nahi/);
  });

  it("never leaves a benefit without a kind", () => {
    for (const scheme of SEED_SCHEMES) {
      for (const benefit of scheme.benefits) {
        expect(benefit.kind, `${scheme.id} → "${benefit.label}"`).toBeTruthy();
      }
    }
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   Things the brief said are commonly got wrong
   ───────────────────────────────────────────────────────────────────────── */

describe("education money is one-time, not annual", () => {
  it("marks every class-wise education amount as one_time", () => {
    // Blogs routinely call ₹2,000 an annual scholarship. The official page
    // this dataset came from calls it one-time.
    const scheme = SEED_SCHEMES.find((s) => s.id === "sant-ravidas-shiksha")!;
    for (const benefit of scheme.benefits) {
      expect(benefit.frequency, `"${benefit.label}" is not one-time`).toBe("one_time");
    }
  });

  it("warns against reading it as annual", () => {
    const scheme = SEED_SCHEMES.find((s) => s.id === "sant-ravidas-shiksha")!;
    expect(scheme.warnings?.join(" ")).toMatch(/ONE-TIME/);
  });

  it("keeps professional-course fees as a reimbursement, not a cash grant", () => {
    const scheme = SEED_SCHEMES.find((s) => s.id === "sant-ravidas-shiksha")!;
    const professional = scheme.benefits.find((b) => b.label.startsWith("Professional degree"))!;
    expect(professional.kind).toBe("reimbursement");
    expect(professional.amount).toBeNull();
    expect(professional.amountNote).toMatch(/₹60,000/);
  });
});

describe("death and disability are installments, not a lump sum", () => {
  const scheme = SEED_SCHEMES.find((s) => s.id === "mrityu-divyangta")!;

  it("never calls the principal a cash payout", () => {
    for (const label of ["Durghatna mein mrityu", "Samanya mrityu", "Sthayi divyangta — 100%"]) {
      const benefit = scheme.benefits.find((b) => b.label === label)!;
      expect(benefit.kind, `${label} is marked ${benefit.kind}`).toBe("installment");
    }
  });

  it("says the monthly figures are examples that move with the interest rate", () => {
    expect(scheme.warnings?.join(" ")).toMatch(/lump sum/i);
    expect(scheme.warnings?.join(" ")).toMatch(/byaj dar badalne par/i);
  });

  it("keeps funeral assistance separate from death assistance", () => {
    // "Antim Sanskar Sahayata" and "Mrityu Sahayata" are different payments.
    const funeral = scheme.benefits.filter((b) => b.label.includes("antim sanskar"));
    expect(funeral).toHaveLength(2);
    for (const line of funeral) {
      expect(line.kind).toBe("cash");
      expect(line.amount).toBe(25000);
    }
    expect(scheme.warnings?.join(" ")).toMatch(/alag-alag cheezen/);
  });
});

describe("the awareness programme is not a cash scheme", () => {
  it("is typed as awareness and pays nothing", () => {
    // Listing it beside the cash schemes is how a worker turns up expecting money.
    const scheme = SEED_SCHEMES.find((s) => s.id === "deendayal-chetna")!;
    expect(scheme.benefits.every((b) => b.kind === "awareness")).toBe(true);
    expect(scheme.benefits.every((b) => b.amount === null)).toBe(true);
    expect(scheme.warnings?.join(" ")).toMatch(/cash benefit nahi/);
  });
});

describe("linked programmes are not UPBOCW benefits", () => {
  it("puts them in their own category and says so", () => {
    const linked = SEED_SCHEMES.filter((s) => s.category === "linked");
    expect(linked.length).toBeGreaterThanOrEqual(2);
    for (const scheme of linked) {
      expect(scheme.warnings?.join(" "), scheme.id).toMatch(/seedha cash benefit nahi/);
    }
  });
});

describe("the disaster scheme is not sold as a guarantee", () => {
  it("keeps the COVID-19 context and flags itself for review", () => {
    const scheme = SEED_SCHEMES.find((s) => s.id === "aapda-rahat")!;
    expect(scheme.warnings?.join(" ")).toMatch(/COVID-19/);
    expect(scheme.warnings?.join(" ")).toMatch(/NAHI hai/);
    expect(scheme.verification.status).toBe("needs_review");
  });
});

describe("an unverified number is never printed as a figure", () => {
  it("leaves the student cycle amount empty rather than guessing", () => {
    // The brief was explicit: do not show ₹3,000 for this unless verified.
    const scheme = SEED_SCHEMES.find((s) => s.id === "student-cycle")!;
    const benefit = scheme.benefits[0];
    expect(benefit.amount).toBeNull();
    expect(benefit.amountNote).toMatch(/verify nahi hui/);
    expect(scheme.verification.status).toBe("needs_review");
  });

  it("keeps the student cycle apart from any worker cycle scheme", () => {
    const scheme = SEED_SCHEMES.find((s) => s.id === "student-cycle")!;
    expect(scheme.warnings?.join(" ")).toMatch(/alag/);
  });

  it("invents no admission dates for Atal Awasiya Vidyalaya", () => {
    const scheme = SEED_SCHEMES.find((s) => s.id === "atal-awasiya")!;
    expect(scheme.verification.caveat).toMatch(/admin panel/i);

    /*
      The only dates allowed anywhere in a scheme are the ones on its
      verification record. A date in the customer-facing copy would be an
      admission window or a deadline nobody read off an official notification.
    */
    const { verification: _verification, ...content } = scheme;
    expect(JSON.stringify(content)).not.toMatch(/\d{1,2}\s*(January|February|March|April|May|June|July|August|September|October|November|December)/i);
    expect(JSON.stringify(content)).not.toMatch(/\b20\d{2}-\d{2}-\d{2}\b/);
  });

  it("puts no invented date in any scheme's customer-facing copy", () => {
    for (const scheme of SEED_SCHEMES) {
      const { verification: _verification, ...content } = scheme;
      expect(JSON.stringify(content), `${scheme.id} carries a date`).not.toMatch(/\b20\d{2}-\d{2}-\d{2}\b/);
    }
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   Provenance
   ───────────────────────────────────────────────────────────────────────── */

/**
 * A page that prints "Verified" beside a number nobody re-read is worse than
 * one that names who supplied it and when — the first kind quietly rots.
 */
describe("every figure has an owner and a date", () => {
  it("names who provided the data, and never claims the site checked it", () => {
    for (const scheme of SEED_SCHEMES) {
      expect(scheme.verification.providedBy, scheme.id).toContain("site owner");
      expect(scheme.verification.verifiedOn, scheme.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("leaves the exact notification URL empty rather than inventing one", () => {
    // The official portal is unreachable from the build environment; a
    // plausible-looking deep link would be a fabrication.
    for (const scheme of SEED_SCHEMES) {
      expect(scheme.verification.sourceUrl, scheme.id).toBeNull();
    }
  });

  it("gives every conditional benefit its conditions beside the money", () => {
    // The 365-day membership and the 90-day work rule are why applications get
    // rejected. Burying them in a disclaimer is how somebody finds out late.
    const marriage = SEED_SCHEMES.find((s) => s.id === "kanya-vivah")!;
    expect(marriage.keyConditions.membershipDays).toBe(365);
    expect(marriage.keyConditions.workDaysLast12Months).toBe(90);
    expect(marriage.keyConditions.childLimit).toBe(2);
    expect(marriage.keyConditions.applicationWindow).toMatch(/1 saal/);
  });
});

describe("the directory is big enough to be worth filtering", () => {
  it("carries more than twenty distinct benefit lines", () => {
    // The honest version of "20+": benefits and provisions, not "20 schemes".
    expect(seedBenefitCount()).toBeGreaterThan(20);
  });

  it("gives every scheme a unique id and slug", () => {
    expect(new Set(SEED_SCHEMES.map((s) => s.id)).size).toBe(SEED_SCHEMES.length);
    expect(new Set(SEED_SCHEMES.map((s) => s.slug)).size).toBe(SEED_SCHEMES.length);
  });
});
