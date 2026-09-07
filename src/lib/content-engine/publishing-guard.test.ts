import { describe, expect, it } from "vitest";

import { readCode } from "@/lib/testing/source";
import {
  PublishBlockedError,
  assertPublishable,
  evaluatePublish,
  looksGovernmental,
  type GuardContext,
  type PublishCandidate,
} from "@/lib/content-engine/publishing-guard";

/**
 * The test that matters most in this subsystem.
 *
 * Everything else here generates text. This decides whether text reaches a
 * public account, and the specific failure being guarded against is a wrong
 * government figure going out — a scheme amount, an eligibility rule, a last
 * date — because the cost of that lands on a customer standing in a
 * government office with the wrong papers, not on us.
 *
 * So the cases below are written as attempts to get something past the gate
 * rather than as a description of what the gate does.
 */

const NOW = new Date("2026-09-06T10:00:00.000Z");

function context(overrides: Partial<GuardContext["settings"]> = {}, extra: Partial<GuardContext> = {}): GuardContext {
  return {
    settings: {
      autoPublish: true,
      autoPublishGovernment: false,
      humanApprovalRequired: true,
      ...overrides,
    },
    now: NOW,
    ...extra,
  };
}

function candidate(overrides: Partial<PublishCandidate> = {}): PublishCandidate {
  return {
    id: "post-1",
    status: "SCHEDULED",
    approvalStatus: "APPROVED",
    factCheckStatus: "VERIFIED",
    government: false,
    platform: "INSTAGRAM",
    scheduledAt: "2026-09-06T09:55:00.000Z",
    ...overrides,
  };
}

/* ─────────────────────────────────────────────────────────────────────────
   Government content
   ───────────────────────────────────────────────────────────────────────── */

describe("an unapproved government post never reaches the publishing function", () => {
  it("refuses it when nobody has approved it", () => {
    const decision = evaluatePublish(
      candidate({ government: true, approvalStatus: "PENDING" }),
      context(),
    );

    expect(decision.allowed).toBe(false);
    if (decision.allowed) return;
    expect(decision.blockers.map((blocker) => blocker.code)).toContain("government_needs_human");
  });

  it("refuses it even when a person is pressing the button by hand", () => {
    // `manual` relaxes the schedule and the automatic-publishing switch. It has
    // never been allowed to relax approval, and this is the test that says so.
    const decision = evaluatePublish(
      candidate({ government: true, approvalStatus: "PENDING" }),
      context({}, { manual: true }),
    );

    expect(decision.allowed).toBe(false);
    if (decision.allowed) return;
    expect(decision.blockers.map((blocker) => blocker.code)).toContain("government_needs_human");
  });

  it("refuses it even with every automatic switch turned on", () => {
    const decision = evaluatePublish(
      candidate({ government: true, approvalStatus: "PENDING" }),
      context({ autoPublish: true, autoPublishGovernment: true, humanApprovalRequired: false }),
    );

    expect(decision.allowed).toBe(false);
  });

  it("refuses an approved government post whose claims are not verified", () => {
    for (const status of ["PENDING", "NEEDS_REVIEW", "REJECTED", "NOT_REQUIRED"] as const) {
      const decision = evaluatePublish(
        candidate({ government: true, factCheckStatus: status }),
        context({}, { manual: true }),
      );

      expect(decision.allowed, `${status} should not publish`).toBe(false);
      if (decision.allowed) continue;
      expect(decision.blockers.map((blocker) => blocker.code)).toContain("fact_check_incomplete");
    }
  });

  it("refuses to publish government content automatically unless that switch is on", () => {
    const decision = evaluatePublish(candidate({ government: true }), context({ autoPublish: true }));

    expect(decision.allowed).toBe(false);
    if (decision.allowed) return;
    expect(decision.blockers.map((blocker) => blocker.code)).toContain("government_needs_human");
  });

  it("allows an approved, verified government post that a person is publishing by hand", () => {
    expect(evaluatePublish(candidate({ government: true }), context({}, { manual: true })).allowed).toBe(true);
  });

  it("allows it automatically only when the shop has deliberately said so", () => {
    expect(
      evaluatePublish(
        candidate({ government: true }),
        context({ autoPublish: true, autoPublishGovernment: true }),
      ).allowed,
    ).toBe(true);
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   Ordinary content
   ───────────────────────────────────────────────────────────────────────── */

describe("approval is required for everything, not only government content", () => {
  it("refuses an unapproved ordinary post", () => {
    const decision = evaluatePublish(candidate({ approvalStatus: "PENDING" }), context({}, { manual: true }));
    expect(decision.allowed).toBe(false);
    if (decision.allowed) return;
    expect(decision.blockers.map((blocker) => blocker.code)).toContain("not_approved");
  });

  it("refuses a rejected post", () => {
    expect(evaluatePublish(candidate({ approvalStatus: "REJECTED" }), context({}, { manual: true })).allowed).toBe(
      false,
    );
  });

  it("refuses a post that has not reached the end of the pipeline", () => {
    for (const status of ["IDEA", "DRAFT_READY", "FACT_CHECKED", "DESIGN_READY", "APPROVAL_PENDING"] as const) {
      const decision = evaluatePublish(candidate({ status }), context({}, { manual: true }));
      expect(decision.allowed, `${status} should not publish`).toBe(false);
    }
  });

  it("refuses a post that is already published, so it cannot go out twice", () => {
    expect(evaluatePublish(candidate({ status: "PUBLISHED" }), context({}, { manual: true })).allowed).toBe(false);
  });
});

describe("the schedule and the automatic switch", () => {
  it("refuses an automatic publish when AUTO_PUBLISH is off", () => {
    const decision = evaluatePublish(candidate(), context({ autoPublish: false }));
    expect(decision.allowed).toBe(false);
    if (decision.allowed) return;
    expect(decision.blockers.map((blocker) => blocker.code)).toContain("auto_publish_off");
  });

  it("refuses a post whose time has not come", () => {
    const decision = evaluatePublish(candidate({ scheduledAt: "2026-09-06T18:00:00.000Z" }), context());
    expect(decision.allowed).toBe(false);
    if (decision.allowed) return;
    expect(decision.blockers.map((blocker) => blocker.code)).toContain("not_due");
  });

  it("lets a person publish an approved post before its scheduled time", () => {
    expect(
      evaluatePublish(
        candidate({ scheduledAt: "2026-09-06T18:00:00.000Z" }),
        context({ autoPublish: false }, { manual: true }),
      ).allowed,
    ).toBe(true);
  });

  it("reports every blocker at once rather than one at a time", () => {
    const decision = evaluatePublish(
      candidate({ status: "DRAFT_READY", approvalStatus: "PENDING", government: true, factCheckStatus: "PENDING" }),
      context({ autoPublish: false }),
    );

    expect(decision.allowed).toBe(false);
    if (decision.allowed) return;
    expect(decision.blockers.length).toBeGreaterThan(3);
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   The throwing form
   ───────────────────────────────────────────────────────────────────────── */

describe("assertPublishable", () => {
  it("throws rather than returning something a caller can ignore", () => {
    expect(() =>
      assertPublishable(candidate({ government: true, approvalStatus: "PENDING" }), context()),
    ).toThrow(PublishBlockedError);
  });

  it("carries the blockers so a caller can show them", () => {
    try {
      assertPublishable(candidate({ approvalStatus: "PENDING" }), context({}, { manual: true }));
      throw new Error("should have thrown");
    } catch (caught) {
      expect(caught).toBeInstanceOf(PublishBlockedError);
      expect((caught as PublishBlockedError).blockers.length).toBeGreaterThan(0);
    }
  });

  it("is what every publisher runs before doing anything", () => {
    // The check lives in the base class rather than in each adapter, so an
    // adapter cannot forget it. If this moves, six publishers become
    // individually responsible for a rule none of them should be trusted with.
    const base = readCode("src/lib/content-engine/publishers/base.ts");
    expect(base).toContain("assertPublishable(input.candidate, input.guard)");

    const publishBody = base.slice(base.indexOf("async publish("), base.indexOf("async schedule("));
    expect(publishBody.indexOf("assertPublishable")).toBeLessThan(publishBody.indexOf("isConfigured()"));
  });

  it("is what the publish runner checks before claiming a row", () => {
    const runner = readCode("src/lib/content-engine/publish-runner.ts");
    expect(runner).toContain("evaluatePublish(candidate, guard)");
    expect(runner.indexOf("evaluatePublish")).toBeLessThan(runner.indexOf("claimScheduleRow"));
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   Recognising government content in the first place
   ───────────────────────────────────────────────────────────────────────── */

describe("deciding what counts as government content", () => {
  it("catches the words this shop's sarkari posts actually use", () => {
    for (const text of [
      "Labour Card ke naye fayde",
      "PM Awas Yojana ki last date",
      "Scheme ki eligibility kya hai",
      "ITR filing ke documents required",
      "Subsidy amount kitni milegi",
      "e-Shram card ka labh",
      "GST registration ki fees",
    ]) {
      expect(looksGovernmental(text), `${text} should be treated as government content`).toBe(true);
    }
  });

  it("leaves ordinary shop content alone", () => {
    for (const text of [
      "Naya passport photo counter khul gaya",
      "Diwali offer: colour printout half rate",
      "Ab Sunday bhi dukan khuli rahegi",
    ]) {
      expect(looksGovernmental(text), `${text} should not be treated as government content`).toBe(false);
    }
  });

  it("reads every piece of text it is given, not just the title", () => {
    expect(looksGovernmental("Naya offer", "Iske saath scheme ka labh bhi milega")).toBe(true);
  });

  it("says no to nothing rather than guessing", () => {
    expect(looksGovernmental("", null, undefined)).toBe(false);
  });
});
