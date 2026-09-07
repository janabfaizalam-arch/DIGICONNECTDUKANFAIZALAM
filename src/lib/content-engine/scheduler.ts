/**
 * When each post goes out.
 *
 * A weekly rhythm rather than a queue, because a shop that posts seven
 * unrelated things on Tuesday and nothing for a week reads as abandoned. The
 * default plan below gives each day a job; the admin can change every part of
 * it, and the engine only ever fills the days that are empty.
 *
 * Pure. The scheduler decides *when*; whether a post may actually go out at
 * that time is `publishing-guard.ts`, and the two are separate on purpose —
 * being due is not permission.
 */

import { ALL_PLATFORMS } from "@/lib/content-engine/platforms";
import { WEEKDAYS, type ContentPlatform, type WeeklyPlan, type Weekday } from "@/lib/content-engine/types";

/**
 * The starting rhythm, from what this shop's week actually looks like.
 *
 * Monday carries government updates because notifications land at the start
 * of the week and a customer who reads one on Monday has the week to act.
 * Saturday is the shop's own offers, when people are free to come in. Sunday
 * recycles whatever worked, because writing something new every single day is
 * how a content plan dies in week three.
 */
export const DEFAULT_WEEKLY_PLAN: WeeklyPlan = {
  monday: { theme: "Government update", time: "10:00", platforms: ["INSTAGRAM", "FACEBOOK", "WHATSAPP"] },
  tuesday: { theme: "Customer problem", time: "11:00", platforms: ["INSTAGRAM", "FACEBOOK"] },
  wednesday: { theme: "Service explainer", time: "11:00", platforms: ["INSTAGRAM", "YOUTUBE", "WEBSITE"] },
  thursday: { theme: "Scheme or benefit", time: "10:00", platforms: ["INSTAGRAM", "FACEBOOK", "WHATSAPP"] },
  friday: { theme: "FAQ", time: "17:00", platforms: ["INSTAGRAM", "FACEBOOK"] },
  saturday: { theme: "Offer or business content", time: "12:00", platforms: ["INSTAGRAM", "GOOGLE_BUSINESS"] },
  sunday: { theme: "Best performing, recycled", time: "18:00", platforms: ["INSTAGRAM", "FACEBOOK"] },
};

export function weekdayOf(date: Date): Weekday {
  return WEEKDAYS[date.getDay()];
}

/**
 * A local wall-clock slot, as an instant.
 *
 * India Standard Time, fixed. The alternative is reading a timezone from the
 * server, and a server that moves to a different region must not silently
 * start posting at half past four in the morning. IST has no daylight saving,
 * so a fixed offset is correct rather than merely convenient.
 */
export const IST_OFFSET_MINUTES = 5 * 60 + 30;

export function slotToInstant(date: Date, time: string): Date {
  const [hours, minutes] = time.split(":").map((part) => Number.parseInt(part, 10));
  const safeHours = Number.isFinite(hours) ? Math.min(23, Math.max(0, hours)) : 10;
  const safeMinutes = Number.isFinite(minutes) ? Math.min(59, Math.max(0, minutes)) : 0;

  const utc = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    safeHours,
    safeMinutes,
    0,
    0,
  );
  return new Date(utc - IST_OFFSET_MINUTES * 60_000);
}

/** The IST hour a timestamp falls in, for the posting-time comparison. */
export function istHourOf(iso: string): number | null {
  const at = Date.parse(iso);
  if (!Number.isFinite(at)) return null;
  return new Date(at + IST_OFFSET_MINUTES * 60_000).getUTCHours();
}

export type PlannedSlot = {
  date: string;
  weekday: Weekday;
  theme: string;
  time: string;
  platforms: ContentPlatform[];
  scheduledAt: string;
};

/**
 * The next N days as slots, skipping any date that already has a post.
 *
 * Taking occupied dates as an argument rather than looking them up keeps this
 * testable and keeps the calendar screen and the weekly cron using identical
 * logic.
 */
export function planAhead(input: {
  from: Date;
  days: number;
  plan: WeeklyPlan;
  occupiedDates: string[];
}): PlannedSlot[] {
  const occupied = new Set(input.occupiedDates);
  const slots: PlannedSlot[] = [];

  for (let offset = 0; offset < input.days; offset += 1) {
    const date = new Date(input.from.getTime() + offset * 86_400_000);
    const key = date.toISOString().slice(0, 10);
    if (occupied.has(key)) continue;

    const weekday = weekdayOf(date);
    const day = input.plan[weekday] ?? DEFAULT_WEEKLY_PLAN[weekday];
    const scheduledAt = slotToInstant(date, day.time);

    // A slot whose time has already passed today is not a slot.
    if (scheduledAt.getTime() <= input.from.getTime()) continue;

    slots.push({
      date: key,
      weekday,
      theme: day.theme,
      time: day.time,
      platforms: day.platforms.filter((platform) => ALL_PLATFORMS.includes(platform)),
      scheduledAt: scheduledAt.toISOString(),
    });
  }

  return slots;
}

/**
 * Which scheduled rows are due now.
 *
 * A grace window so that a cron which fires a minute late still publishes
 * rather than leaving a post stranded until the next run, and a staleness cut
 * so that a job stuck for two days does not wake up and publish yesterday's
 * "aaj last date hai".
 */
export const DUE_GRACE_MS = 5 * 60_000;
export const TOO_LATE_MS = 12 * 60 * 60_000;

export type DueDecision = "due" | "not_yet" | "too_late";

export function dueState(scheduledAt: string, now: Date): DueDecision {
  const at = Date.parse(scheduledAt);
  if (!Number.isFinite(at)) return "not_yet";
  const delta = now.getTime() - at;
  if (delta < -DUE_GRACE_MS) return "not_yet";
  if (delta > TOO_LATE_MS) return "too_late";
  return "due";
}

/** Validate a weekly plan coming from the settings form. */
export function normalizePlan(raw: unknown): WeeklyPlan {
  const plan = {} as WeeklyPlan;
  const incoming = (raw ?? {}) as Record<string, unknown>;

  for (const weekday of WEEKDAYS) {
    const day = (incoming[weekday] ?? {}) as Record<string, unknown>;
    const fallback = DEFAULT_WEEKLY_PLAN[weekday];
    const platforms = Array.isArray(day.platforms)
      ? (day.platforms.filter((platform): platform is ContentPlatform =>
          ALL_PLATFORMS.includes(platform as ContentPlatform),
        ) as ContentPlatform[])
      : fallback.platforms;

    plan[weekday] = {
      theme: typeof day.theme === "string" && day.theme.trim() ? day.theme.trim().slice(0, 80) : fallback.theme,
      time: typeof day.time === "string" && /^\d{1,2}:\d{2}$/.test(day.time) ? day.time : fallback.time,
      platforms: platforms.length ? platforms : fallback.platforms,
    };
  }

  return plan;
}
