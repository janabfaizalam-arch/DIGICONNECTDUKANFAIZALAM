import { describe, expect, it } from "vitest";

import {
  DEFAULT_WEEKLY_PLAN,
  dueState,
  istHourOf,
  normalizePlan,
  planAhead,
  slotToInstant,
  weekdayOf,
} from "@/lib/content-engine/scheduler";

/**
 * When a post goes out, and when it is too late to bother.
 *
 * The two rules worth pinning down: a cron that fires a minute late still
 * publishes, and a job that wakes up two days later does not — because "aaj
 * last date hai" going out on Thursday for a Tuesday deadline is worse than
 * not going out at all.
 */

describe("turning a wall-clock slot into an instant", () => {
  it("reads 10:00 as ten in the morning in India, not in UTC", () => {
    const at = slotToInstant(new Date("2026-09-07T00:00:00.000Z"), "10:00");
    expect(at.toISOString()).toBe("2026-09-07T04:30:00.000Z");
  });

  it("reads an instant back as the IST hour it falls in", () => {
    expect(istHourOf("2026-09-07T04:30:00.000Z")).toBe(10);
    expect(istHourOf("not a date")).toBeNull();
  });

  it("falls back to a sane time rather than NaN when the plan is malformed", () => {
    const at = slotToInstant(new Date("2026-09-07T00:00:00.000Z"), "banana");
    expect(Number.isFinite(at.getTime())).toBe(true);
  });
});

describe("planning the days ahead", () => {
  it("gives each weekday the theme the shop chose", () => {
    const slots = planAhead({
      from: new Date("2026-09-06T01:00:00.000Z"),
      days: 7,
      plan: DEFAULT_WEEKLY_PLAN,
      occupiedDates: [],
    });

    const monday = slots.find((slot) => slot.weekday === "monday");
    expect(monday?.theme).toBe("Government update");
    expect(slots.find((slot) => slot.weekday === "sunday")?.theme).toContain("recycled");
  });

  it("skips a date that already has something on it", () => {
    const slots = planAhead({
      from: new Date("2026-09-06T01:00:00.000Z"),
      days: 5,
      plan: DEFAULT_WEEKLY_PLAN,
      occupiedDates: ["2026-09-07"],
    });

    expect(slots.map((slot) => slot.date)).not.toContain("2026-09-07");
  });

  it("does not offer a slot whose time has already gone today", () => {
    // Eight in the evening IST: today's ten o'clock slot is not a slot.
    const slots = planAhead({
      from: new Date("2026-09-07T14:30:00.000Z"),
      days: 1,
      plan: DEFAULT_WEEKLY_PLAN,
      occupiedDates: [],
    });

    expect(slots).toHaveLength(0);
  });

  it("names the weekday the way the plan is keyed", () => {
    expect(weekdayOf(new Date("2026-09-07T06:00:00.000Z"))).toBe("monday");
  });
});

describe("deciding whether a scheduled row is due", () => {
  const now = new Date("2026-09-06T10:00:00.000Z");

  it("publishes when the time has come", () => {
    expect(dueState("2026-09-06T09:59:00.000Z", now)).toBe("due");
  });

  it("still publishes when the cron fired a couple of minutes late", () => {
    expect(dueState("2026-09-06T10:02:00.000Z", now)).toBe("due");
  });

  it("waits when the time has not come", () => {
    expect(dueState("2026-09-06T18:00:00.000Z", now)).toBe("not_yet");
  });

  it("gives up on a slot missed by more than half a day", () => {
    expect(dueState("2026-09-05T10:00:00.000Z", now)).toBe("too_late");
  });

  it("treats an unreadable timestamp as not due rather than publishing it", () => {
    expect(dueState("whenever", now)).toBe("not_yet");
  });
});

describe("a weekly plan coming from the settings form", () => {
  it("keeps what is valid", () => {
    const plan = normalizePlan({
      monday: { theme: "Scheme day", time: "09:30", platforms: ["INSTAGRAM"] },
    });

    expect(plan.monday.theme).toBe("Scheme day");
    expect(plan.monday.time).toBe("09:30");
    expect(plan.monday.platforms).toEqual(["INSTAGRAM"]);
  });

  it("falls back to the default for anything missing or malformed", () => {
    const plan = normalizePlan({ monday: { theme: "", time: "25 o'clock", platforms: ["MYSPACE"] } });

    expect(plan.monday.theme).toBe(DEFAULT_WEEKLY_PLAN.monday.theme);
    expect(plan.monday.time).toBe(DEFAULT_WEEKLY_PLAN.monday.time);
    expect(plan.monday.platforms).toEqual(DEFAULT_WEEKLY_PLAN.monday.platforms);
  });

  it("always returns all seven days", () => {
    expect(Object.keys(normalizePlan(null))).toHaveLength(7);
    expect(Object.keys(normalizePlan("nonsense"))).toHaveLength(7);
  });
});
