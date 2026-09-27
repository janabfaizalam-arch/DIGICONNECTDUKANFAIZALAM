import { describe, expect, it } from "vitest";

import {
  daysUntil,
  formatRenewalDue,
  indiaToday,
  normalizeReminderDays,
  pickDueReminder,
  renewalReminderVersion,
} from "@/lib/renewals/renewal-core";

describe("renewal reminder scheduling", () => {
  it("counts whole Indian calendar days", () => {
    expect(daysUntil("2026-10-26", "2026-09-26")).toBe(30);
    expect(daysUntil("2026-09-26", "2026-09-26")).toBe(0);
    expect(daysUntil("2026-09-25", "2026-09-26")).toBe(-1);
    // 20:00 UTC on the 25th is already the 26th in India.
    expect(indiaToday(new Date("2026-09-25T20:00:00Z"))).toBe("2026-09-26");
  });

  it("sends each stage once, on its day", () => {
    const base = { renewalDate: "2026-10-26", reminderDays: [30, 7, 1, 0] };
    expect(pickDueReminder({ ...base, today: "2026-09-25", remindersSent: [] })).toBeNull();
    expect(pickDueReminder({ ...base, today: "2026-09-26", remindersSent: [] })).toEqual({
      stage: 30,
      daysLeft: 30,
      settles: [30],
    });
    expect(pickDueReminder({ ...base, today: "2026-09-27", remindersSent: [30] })).toBeNull();
    expect(pickDueReminder({ ...base, today: "2026-10-19", remindersSent: [30] })?.stage).toBe(7);
    expect(pickDueReminder({ ...base, today: "2026-10-26", remindersSent: [30, 7, 1] })?.stage).toBe(0);
  });

  it("sends only the closest stage when several were missed", () => {
    const due = pickDueReminder({
      renewalDate: "2026-10-26",
      today: "2026-10-21",
      reminderDays: [30, 7, 1, 0],
      remindersSent: [],
    });
    expect(due).toEqual({ stage: 7, daysLeft: 5, settles: [30, 7] });
  });

  it("never reminds after the renewal date has passed", () => {
    expect(
      pickDueReminder({ renewalDate: "2026-09-20", today: "2026-09-26", reminderDays: [0], remindersSent: [] }),
    ).toBeNull();
  });

  it("normalizes reminder days and falls back to the default", () => {
    expect(normalizeReminderDays([7, 30, 7, -1, 400, 0])).toEqual([30, 7, 0]);
    expect(normalizeReminderDays([])).toEqual([30, 7, 1, 0]);
  });

  it("gives every date and stage its own idempotency version", () => {
    expect(renewalReminderVersion("2026-10-26", 7)).toBe(20261026007);
    expect(renewalReminderVersion("2027-10-26", 7)).not.toBe(renewalReminderVersion("2026-10-26", 7));
    expect(Number.isSafeInteger(renewalReminderVersion("2099-12-31", 365))).toBe(true);
  });

  it("formats the due line for the message", () => {
    expect(formatRenewalDue("2026-10-26", 7)).toBe("26 Oct 2026 (7 days left)");
    expect(formatRenewalDue("2026-10-26", 1)).toBe("26 Oct 2026 (tomorrow)");
    expect(formatRenewalDue("2026-10-26", 0)).toBe("26 Oct 2026 (today)");
  });
});
