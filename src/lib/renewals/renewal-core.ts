/** Pure renewal-reminder scheduling (unit-testable, no I/O). */

export const DEFAULT_REMINDER_DAYS = [30, 7, 1, 0] as const;

/** Today's date in India as YYYY-MM-DD — reminders are about Indian calendar days. */
export function indiaToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(now);
}

/** Whole days from `today` to `renewalDate` (both YYYY-MM-DD). Negative once it has passed. */
export function daysUntil(renewalDate: string, today: string): number {
  const a = Date.parse(`${today}T00:00:00Z`);
  const b = Date.parse(`${renewalDate}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

export function normalizeReminderDays(days: readonly number[] | null | undefined): number[] {
  const clean = (days ?? [])
    .map((d) => Math.trunc(Number(d)))
    .filter((d) => Number.isFinite(d) && d >= 0 && d <= 365);
  const unique = [...new Set(clean)].sort((a, b) => b - a);
  return unique.length ? unique.slice(0, 10) : [...DEFAULT_REMINDER_DAYS];
}

export type DueReminder = {
  /** The reminder stage being sent (days before renewal). */
  stage: number;
  daysLeft: number;
  /** Every stage this send settles — earlier ones missed are not sent late. */
  settles: number[];
};

/**
 * Which reminder, if any, is due today.
 *
 * One message at most per run: if several stages have passed unsent (the
 * renewal was added 5 days before it is due, or the cron missed a day), only
 * the closest one is sent and the older ones are marked handled — a customer
 * gets "5 days left", not "30 days left" followed by "7 days left".
 * Nothing is sent once the renewal date has passed.
 */
export function pickDueReminder(input: {
  renewalDate: string;
  today: string;
  reminderDays: readonly number[];
  remindersSent: readonly number[];
}): DueReminder | null {
  const daysLeft = daysUntil(input.renewalDate, input.today);
  if (!Number.isFinite(daysLeft) || daysLeft < 0) return null;

  const sent = new Set(input.remindersSent.map(Number));
  const passed = normalizeReminderDays(input.reminderDays).filter((d) => d >= daysLeft);
  const unsent = passed.filter((d) => !sent.has(d));
  if (!unsent.length) return null;

  return { stage: Math.min(...unsent), daysLeft, settles: passed };
}

/**
 * Idempotency version for one reminder: unique per renewal date and stage, so
 * a cron that runs twice sends once, and a new renewal cycle (date moved a
 * year on) starts fresh. YYYYMMDD * 1000 + stage stays a safe integer.
 */
export function renewalReminderVersion(renewalDate: string, stage: number): number {
  return Number(renewalDate.replace(/-/g, "")) * 1000 + stage;
}

export function formatRenewalDue(renewalDate: string, daysLeft: number): string {
  const date = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${renewalDate}T00:00:00Z`));
  if (daysLeft <= 0) return `${date} (today)`;
  if (daysLeft === 1) return `${date} (tomorrow)`;
  return `${date} (${daysLeft} days left)`;
}
