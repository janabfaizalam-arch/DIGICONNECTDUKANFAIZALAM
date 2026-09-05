import { describe, expect, it } from "vitest";

import { CHECKER_DISCLAIMER, cardIsUsable, checkScheme, runChecker } from "@/lib/labour/eligibility";
import { SEED_SCHEMES } from "@/lib/labour/seed-schemes";

const marriage = SEED_SCHEMES.find((s) => s.id === "kanya-vivah")!;
const pension = SEED_SCHEMES.find((s) => s.id === "gandhi-pension")!;
const chetna = SEED_SCHEMES.find((s) => s.id === "deendayal-chetna")!;

/* ─────────────────────────────────────────────────────────────────────────
   The gate everything shares
   ───────────────────────────────────────────────────────────────────────── */

describe("no card, no benefit", () => {
  it("says so immediately instead of listing twelve schemes first", () => {
    expect(cardIsUsable({ hasCard: false })).toBe(false);
    expect(cardIsUsable({ hasCard: true, cardActive: false })).toBe(false);
    expect(cardIsUsable({ hasCard: true, cardActive: true })).toBe(true);
  });

  it("stops at the card rather than half-answering the rest", () => {
    const result = checkScheme(marriage, { hasCard: false });
    expect(result.verdict).toBe("condition_missing");
    expect(result.missing).toEqual(["Labour Card zaroori hai"]);
  });

  it("counts a lapsed card as a missing condition, not a pass", () => {
    const result = checkScheme(marriage, { hasCard: true, cardActive: false });
    expect(result.missing).toContain("Labour Card active/renewed hona chahiye");
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   Never a confident yes on untested ground
   ───────────────────────────────────────────────────────────────────────── */

/**
 * A checker that returns "eligible" while silently skipping the conditions it
 * never asked about is worse than no checker, because somebody travels to a
 * counter on the strength of it.
 */
describe("what it did not ask, it does not assume", () => {
  it("returns needs_info rather than likely when answers are thin", () => {
    const result = checkScheme(marriage, { hasCard: true, cardActive: true });
    expect(result.verdict).toBe("needs_info");
    expect(result.untested.length).toBeGreaterThan(0);
  });

  it("lists every untested condition by name", () => {
    const result = checkScheme(marriage, { hasCard: true, cardActive: true });
    expect(result.untested.join(" ")).toMatch(/membership/i);
    expect(result.untested.join(" ")).toMatch(/90 din/);
    expect(result.untested.join(" ")).toMatch(/Adhiktam 2 bachche/);
  });

  it("only says likely when nothing is left untested", () => {
    const result = checkScheme(marriage, {
      hasCard: true,
      cardActive: true,
      membershipYears: 3,
      workedDaysLast12Months: 120,
      childCount: 2,
      age: 45,
      daysSinceEvent: 60,
    });
    expect(result.untested).toEqual([]);
    expect(result.missing).toEqual([]);
    expect(result.verdict).toBe("likely");
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   The conditions that actually sink applications
   ───────────────────────────────────────────────────────────────────────── */

describe("the rules people get caught by", () => {
  const base = {
    hasCard: true,
    cardActive: true,
    membershipYears: 3,
    workedDaysLast12Months: 120,
    childCount: 2,
    age: 45,
    daysSinceEvent: 60,
  };

  it("catches membership shorter than a year", () => {
    const result = checkScheme(marriage, { ...base, membershipYears: 0 });
    expect(result.verdict).toBe("condition_missing");
    expect(result.missing.join(" ")).toMatch(/membership/i);
  });

  it("catches the 90-day work rule", () => {
    const result = checkScheme(marriage, { ...base, workedDaysLast12Months: 40 });
    expect(result.missing.join(" ")).toMatch(/90 din/);
  });

  it("catches a third child against a two-child limit, and says the number back", () => {
    const result = checkScheme(marriage, { ...base, childCount: 3 });
    expect(result.missing.join(" ")).toMatch(/aapke 3 bachche/);
  });

  it("catches an application made after the window closed", () => {
    const result = checkScheme(marriage, { ...base, daysSinceEvent: 500 });
    expect(result.missing.join(" ")).toMatch(/samay nikal chuka/);
  });

  it("checks the pension age and the ten-year registration together", () => {
    const tooYoung = checkScheme(pension, { hasCard: true, cardActive: true, age: 52, membershipYears: 12 });
    expect(tooYoung.missing.join(" ")).toMatch(/60 saal/);

    const tooNew = checkScheme(pension, { hasCard: true, cardActive: true, age: 65, membershipYears: 4 });
    expect(tooNew.missing.join(" ")).toMatch(/membership/i);

    const both = checkScheme(pension, { hasCard: true, cardActive: true, age: 65, membershipYears: 12 });
    expect(both.verdict).toBe("likely");
  });

  it("reads a child's age for a residential school, not the worker's", () => {
    const school = SEED_SCHEMES.find((s) => s.id === "aawasiya-vidyalaya")!;
    const result = checkScheme(school, { hasCard: true, cardActive: true, age: 40, childAge: 9 });
    expect(result.met.join(" ")).toMatch(/Bachche ki umar/);
    expect(result.missing).toEqual([]);
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   Not everything is money
   ───────────────────────────────────────────────────────────────────────── */

describe("schemes that pay nothing are never called eligible", () => {
  it("marks the awareness programme not_applicable", () => {
    // "You qualify" for an awareness campaign is a promise of money that does
    // not exist.
    const result = checkScheme(chetna, {
      hasCard: true,
      cardActive: true,
      membershipYears: 5,
      childCount: 1,
      age: 40,
    });
    expect(result.verdict).toBe("not_applicable");
  });

  it("marks linked pension programmes not_applicable too", () => {
    for (const scheme of SEED_SCHEMES.filter((s) => s.category === "linked")) {
      const result = checkScheme(scheme, { hasCard: true, cardActive: true });
      expect(result.verdict, scheme.id).toBe("not_applicable");
    }
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   Ordering and honesty
   ───────────────────────────────────────────────────────────────────────── */

describe("the result list", () => {
  const answers = {
    hasCard: true,
    cardActive: true,
    membershipYears: 6,
    workedDaysLast12Months: 150,
    childCount: 2,
    age: 44,
    childAge: 10,
    daysSinceEvent: 30,
  };

  it("puts what you probably qualify for at the top", () => {
    const results = runChecker(SEED_SCHEMES, answers);
    const verdicts = results.map((r) => r.verdict);
    const firstMissing = verdicts.indexOf("condition_missing");
    const lastLikely = verdicts.lastIndexOf("likely");
    if (firstMissing !== -1 && lastLikely !== -1) expect(lastLikely).toBeLessThan(firstMissing);
  });

  it("returns something for every published scheme, never a silent drop", () => {
    const results = runChecker(SEED_SCHEMES, answers);
    expect(results).toHaveLength(SEED_SCHEMES.filter((s) => s.published).length);
  });

  it("carries a disclaimer that does not claim to be an approval", () => {
    expect(CHECKER_DISCLAIMER).toMatch(/सरकारी मंज़ूरी नहीं/);
    expect(CHECKER_DISCLAIMER).toMatch(/विभाग के सत्यापन/);
  });
});
