/**
 * Asia/Kolkata date ranges for admin dashboard filters.
 * Indian financial year: 1 April → 31 March.
 */

export type AdminDatePreset =
  | "today"
  | "yesterday"
  | "last_7_days"
  | "last_30_days"
  | "current_month"
  | "previous_month"
  | "current_fy"
  | "custom";

export type AdminDateRange = {
  preset: AdminDatePreset;
  /** Inclusive start (UTC ISO of IST midnight). */
  fromIso: string;
  /** Exclusive end (UTC ISO). */
  toIso: string;
  label: string;
  previousFromIso: string;
  previousToIso: string;
};

const IST = "Asia/Kolkata";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Calendar parts in Asia/Kolkata for an instant. */
export function istParts(date = new Date()) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: IST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(fmt.formatToParts(date).filter((p) => p.type !== "literal").map((p) => [p.type, p.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

/** IST calendar midnight → UTC ISO. */
export function istMidnightUtcIso(year: number, month: number, day: number) {
  // Asia/Kolkata is UTC+05:30 year-round (no DST).
  const utcMs = Date.UTC(year, month - 1, day, 0, 0, 0) - (5 * 60 + 30) * 60 * 1000;
  return new Date(utcMs).toISOString();
}

function addDays(year: number, month: number, day: number, delta: number) {
  const utc = Date.UTC(year, month - 1, day) + delta * 86400000;
  const d = new Date(utc);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

function daysBetween(from: { year: number; month: number; day: number }, to: { year: number; month: number; day: number }) {
  const a = Date.UTC(from.year, from.month - 1, from.day);
  const b = Date.UTC(to.year, to.month - 1, to.day);
  return Math.round((b - a) / 86400000);
}

function fyStart(year: number, month: number) {
  // FY starts April 1 of the calendar year if month >= 4, else previous calendar year.
  const fyYear = month >= 4 ? year : year - 1;
  return { year: fyYear, month: 4, day: 1 };
}

export const ADMIN_DATE_PRESET_OPTIONS: { value: AdminDatePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last_7_days", label: "Last 7 Days" },
  { value: "last_30_days", label: "Last 30 Days" },
  { value: "current_month", label: "Current Month" },
  { value: "previous_month", label: "Previous Month" },
  { value: "current_fy", label: "Current Financial Year" },
  { value: "custom", label: "Custom Range" },
];

export function parseAdminDatePreset(value: string | null | undefined): AdminDatePreset {
  const v = String(value ?? "").trim().toLowerCase();
  if (ADMIN_DATE_PRESET_OPTIONS.some((o) => o.value === v)) return v as AdminDatePreset;
  return "last_7_days";
}

export function resolveAdminDateRange(input: {
  preset?: string | null;
  from?: string | null;
  to?: string | null;
  now?: Date;
}): AdminDateRange {
  const now = input.now ?? new Date();
  const today = istParts(now);
  const preset = parseAdminDatePreset(input.preset);

  let start = { year: today.year, month: today.month, day: today.day };
  let endExclusive = addDays(today.year, today.month, today.day, 1);
  let label = "Today";

  if (preset === "today") {
    label = "Today";
  } else if (preset === "yesterday") {
    start = addDays(today.year, today.month, today.day, -1);
    endExclusive = { year: today.year, month: today.month, day: today.day };
    label = "Yesterday";
  } else if (preset === "last_7_days") {
    start = addDays(today.year, today.month, today.day, -6);
    label = "Last 7 Days";
  } else if (preset === "last_30_days") {
    start = addDays(today.year, today.month, today.day, -29);
    label = "Last 30 Days";
  } else if (preset === "current_month") {
    start = { year: today.year, month: today.month, day: 1 };
    label = "Current Month";
  } else if (preset === "previous_month") {
    const firstThisMonth = { year: today.year, month: today.month, day: 1 };
    endExclusive = firstThisMonth;
    const prevLast = addDays(firstThisMonth.year, firstThisMonth.month, firstThisMonth.day, -1);
    start = { year: prevLast.year, month: prevLast.month, day: 1 };
    label = "Previous Month";
  } else if (preset === "current_fy") {
    start = fyStart(today.year, today.month);
    label = "Current Financial Year";
  } else if (preset === "custom") {
    const fromRaw = String(input.from ?? "").trim();
    const toRaw = String(input.to ?? "").trim();
    const fromMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fromRaw);
    const toMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(toRaw);
    if (fromMatch && toMatch) {
      start = { year: Number(fromMatch[1]), month: Number(fromMatch[2]), day: Number(fromMatch[3]) };
      const toDay = { year: Number(toMatch[1]), month: Number(toMatch[2]), day: Number(toMatch[3]) };
      endExclusive = addDays(toDay.year, toDay.month, toDay.day, 1);
      label = `${fromRaw} → ${toRaw}`;
    } else {
      // Fallback to last 7 days if custom incomplete
      start = addDays(today.year, today.month, today.day, -6);
      label = "Last 7 Days";
    }
  }

  const spanDays = Math.max(1, daysBetween(start, endExclusive));
  const previousEnd = start;
  const previousStart = addDays(previousEnd.year, previousEnd.month, previousEnd.day, -spanDays);

  return {
    preset: preset === "custom" && !String(input.from ?? "").trim() ? "last_7_days" : preset,
    fromIso: istMidnightUtcIso(start.year, start.month, start.day),
    toIso: istMidnightUtcIso(endExclusive.year, endExclusive.month, endExclusive.day),
    label,
    previousFromIso: istMidnightUtcIso(previousStart.year, previousStart.month, previousStart.day),
    previousToIso: istMidnightUtcIso(previousEnd.year, previousEnd.month, previousEnd.day),
  };
}

export function formatDelta(current: number, previous: number): {
  absolute: number;
  percent: number | null;
  label: string;
} {
  const absolute = current - previous;
  if (previous === 0) {
    if (current === 0) return { absolute: 0, percent: 0, label: "0%" };
    return { absolute, percent: null, label: "New" };
  }
  const percent = Math.round((absolute / Math.abs(previous)) * 1000) / 10;
  const sign = percent > 0 ? "+" : "";
  return { absolute, percent, label: `${sign}${percent}%` };
}

export function formatInr(rupees: number) {
  const safe = Number.isFinite(rupees) ? rupees : 0;
  return `₹${Math.round(safe).toLocaleString("en-IN")}`;
}

export function formatIstDayLabel(isoOrDate: string) {
  const d = new Date(isoOrDate.includes("T") ? isoOrDate : `${isoOrDate}T00:00:00+05:30`);
  return new Intl.DateTimeFormat("en-IN", { timeZone: IST, day: "2-digit", month: "short" }).format(d);
}

/** Build YYYY-MM-DD in IST for custom inputs. */
export function toIstDateInputValue(date = new Date()) {
  const p = istParts(date);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}
