import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  APPLICATION_SOURCE_ENUM_VALUES,
  resolveApplicationSourceEnum,
  resolveSourceChannel,
  rupeesToPaise,
} from "./application-source";

describe("resolveApplicationSourceEnum", () => {
  it("maps partner flow to the enum-safe agent_pos value", () => {
    expect(resolveApplicationSourceEnum(true)).toBe("agent_pos");
  });

  it("maps customer flow to online", () => {
    expect(resolveApplicationSourceEnum(false)).toBe("online");
  });

  it("only ever returns real enum values", () => {
    for (const flag of [true, false]) {
      expect(APPLICATION_SOURCE_ENUM_VALUES).toContain(resolveApplicationSourceEnum(flag));
    }
  });
});

describe("resolveSourceChannel", () => {
  it("keeps the partner channel meaning in source_channel", () => {
    expect(resolveSourceChannel({ isPartnerFlow: true })).toBe("agency_partner");
  });

  it("marks referral channel for referred customer applications", () => {
    expect(resolveSourceChannel({ isPartnerFlow: false, isReferral: true })).toBe("referral");
  });

  it("defaults to online", () => {
    expect(resolveSourceChannel({ isPartnerFlow: false })).toBe("online");
  });
});

describe("rupeesToPaise", () => {
  it("converts ₹999 to exactly 99900 paise", () => {
    expect(rupeesToPaise(999)).toBe(99900);
  });

  it("rounds fractional rupees to integer paise", () => {
    expect(rupeesToPaise(999.005)).toBe(99901);
    expect(Number.isInteger(rupeesToPaise(123.45))).toBe(true);
  });

  it("guards NaN and negative values to 0", () => {
    expect(rupeesToPaise(Number.NaN)).toBe(0);
    expect(rupeesToPaise(-1)).toBe(0);
    expect(rupeesToPaise(Number("not-a-number"))).toBe(0);
  });
});

/**
 * Contract: applications.source is the Postgres enum application_source
 * ('online','offline','agent_pos'). Writing any other literal fails the whole
 * insert with 22P02 and blocks payment preparation (the "Application could not
 * be prepared for payment." production bug).
 */
describe("applications.source enum contract", () => {
  const routes = [
    "src/app/api/create-order/route.ts",
    "src/app/api/applications/route.ts",
    "src/app/api/ap/applications/route.ts",
    "src/app/api/agent/applications/route.ts",
  ];

  // Literals that previously broke the applications insert (22P02 enum errors).
  // Note: `customers.source` is a different (text/absent) column, so only the
  // applications-insert shapes are forbidden here.
  const forbiddenSourceLiterals = [
    `source: "agency_partner",`,
    `source: "referral",`,
    `source: ap?.id ? "agency_partner"`,
    `source: referrerApId ? "referral"`,
  ];

  for (const route of routes) {
    it(`${route} never writes a non-enum applications.source`, () => {
      const contents = readFileSync(join(process.cwd(), route), "utf8");
      for (const literal of forbiddenSourceLiterals) {
        expect(contents.includes(literal), `${route} contains forbidden "${literal}"`).toBe(false);
      }
    });
  }

  it("ap/applications route inserts applications with the enum-safe agent_pos source", () => {
    const contents = readFileSync(join(process.cwd(), "src/app/api/ap/applications/route.ts"), "utf8");
    expect(contents).toContain(`source: "agent_pos"`);
    expect(contents).toContain(`source_channel: "agency_partner"`);
  });

  it("create-order never writes the broken agency_partner enum literal", () => {
    const contents = readFileSync(join(process.cwd(), "src/app/api/create-order/route.ts"), "utf8");
    expect(contents.includes(`source: ap?.id ? "agency_partner"`)).toBe(false);
    expect(contents.includes(`source: "agency_partner",`)).toBe(false);
    expect(contents).toContain("resolveApplicationSourceEnum");
    expect(contents).toContain("rupeesToPaise");
  });

  it("maps Digi Partner prepare flow to agent_pos + agency_partner channel", () => {
    expect(resolveApplicationSourceEnum(true)).toBe("agent_pos");
    expect(resolveSourceChannel({ isPartnerFlow: true })).toBe("agency_partner");
  });
});
