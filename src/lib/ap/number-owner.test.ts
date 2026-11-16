/**
 * Which record owns a shared mobile number.
 *
 * The first run of the credentials reset gave each contested number to the
 * record created first. On this system that was the wrong one in all three
 * cases that came up: an abandoned draft or an empty duplicate took the
 * number, while the record that had actually filed applications was refused
 * and left unable to sign in at all.
 *
 * The three real pairs are in here by name, because a rule that sounds right
 * and gets those backwards is no use.
 */

import { describe, expect, it } from "vitest";

import { readCode } from "@/lib/testing/source";
import { pickNumberOwner, type PartnerRow } from "./number-owner";

const row = (over: Partial<PartnerRow> & { id: string }): PartnerRow => ({
  user_id: `user-${over.id}`,
  mobile: "9876543210",
  username: null,
  full_name: over.id,
  status: "active",
  created_at: "2026-01-01T00:00:00Z",
  ...over,
});

describe("the number follows the work", () => {
  it("prefers the record with applications over an older empty one", () => {
    const empty = row({ id: "empty", created_at: "2026-05-27T00:00:00Z" });
    const working = row({ id: "working", created_at: "2026-06-24T00:00:00Z" });

    const owner = pickNumberOwner([empty, working], new Map([["working", 2]]));
    expect(owner.id).toBe("working");
  });

  it("prefers an active record over a draft when neither has applications", () => {
    const draft = row({ id: "draft", status: "draft", created_at: "2026-05-17T00:00:00Z" });
    const live = row({ id: "live", status: "active", created_at: "2026-05-18T00:00:00Z" });

    expect(pickNumberOwner([draft, live], new Map()).id).toBe("live");
  });

  it("falls back to the most recent when nothing else separates them", () => {
    const older = row({ id: "older", created_at: "2026-01-01T00:00:00Z" });
    const newer = row({ id: "newer", created_at: "2026-09-01T00:00:00Z" });

    expect(pickNumberOwner([older, newer], new Map()).id).toBe("newer");
  });

  it("does not let an older active record beat a newer one that does the work", () => {
    // Work outranks status: an active shell is still a shell.
    const shell = row({ id: "shell", status: "active", created_at: "2026-01-01T00:00:00Z" });
    const busy = row({ id: "busy", status: "draft", created_at: "2026-09-01T00:00:00Z" });

    expect(pickNumberOwner([shell, busy], new Map([["busy", 5]])).id).toBe("busy");
  });

  it("is stable for a single record", () => {
    const only = row({ id: "only" });
    expect(pickNumberOwner([only], new Map()).id).toBe("only");
  });

  it("does not mutate the list it was given", () => {
    const first = row({ id: "first", created_at: "2026-01-01T00:00:00Z" });
    const second = row({ id: "second", created_at: "2026-09-01T00:00:00Z" });
    const list = [first, second];

    pickNumberOwner(list, new Map());
    expect(list[0].id).toBe("first");
  });
});

describe("the three pairs this actually has to get right", () => {
  /*
    Taken from the live directory after the first run. In each, the record
    named `took` is the one that had been given the number and the record
    named `works` is the one that was refused.
  */
  const cases = [
    {
      number: "8287002983",
      took: row({ id: "DCD-AP-0001", status: "active", created_at: "2026-05-27T00:00:00Z" }),
      works: row({ id: "CEO-DP-0001", status: "active", created_at: "2026-06-24T00:00:00Z" }),
      applications: 2,
    },
    {
      number: "9278085795",
      took: row({ id: "BILALNAYYAR", status: "draft", created_at: "2026-05-17T00:00:00Z" }),
      works: row({ id: "SHAHZEB", status: "active", created_at: "2026-05-18T00:00:00Z" }),
      applications: 1,
    },
    {
      number: "9519702107",
      took: row({ id: "CEO-DCD-AD-0001-T001", status: "active", created_at: "2026-07-24T00:00:00Z" }),
      works: row({ id: "CEO-DP-0001-T024", status: "active", created_at: "2026-07-25T00:00:00Z" }),
      applications: 1,
    },
  ];

  for (const { number, took, works, applications } of cases) {
    it(`gives ${number} to ${works.id}, not ${took.id}`, () => {
      const owner = pickNumberOwner([took, works], new Map([[works.id, applications]]));
      expect(owner.id).toBe(works.id);
    });
  }
});

describe("how the reset applies it", () => {
  const route = readCode("src/app/api/admin/agency-partners/reset-to-default/route.ts");

  it("frees a contested number before handing any out", () => {
    // The holder and the rightful owner can fall in different slices, so the
    // number has to be free by the time the owner is reached.
    expect(route).toContain("freeDuplicateNumbers(supabase)");
    expect(route.indexOf("freeDuplicateNumbers(supabase)")).toBeLessThan(
      route.indexOf('.from("agency_partners")\n    .select("id, user_id, mobile, username, full_name")'),
    );
  });

  it("clears the loser's username on both tables", () => {
    expect(route).toMatch(/update\(\{ username: null \}\)[\s\S]{0,200}profiles/);
  });

  it("leaves the loser's data alone otherwise", () => {
    // It stops answering to the number. It is not deleted and not suspended.
    expect(route).not.toContain('.delete()');
    expect(route).not.toContain('status: "suspended"');
  });

  it("tells the admin why a record was passed over", () => {
    expect(route).toMatch(/does the work, so it holds the number login/);
  });
});
