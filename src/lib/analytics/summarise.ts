/**
 * Turning rows into the six things a shop owner actually asks.
 *
 * Pure functions on purpose: the counting is the part that can be quietly
 * wrong — a "unique visitor" that double-counts, a day that lands in the wrong
 * bucket — and none of it needs a database to be tested.
 */

import { DEVICE_LABELS, SOURCE_LABELS, type VisitDevice, type VisitSource } from "@/lib/analytics/visit";

export type VisitRow = {
  occurred_at: string;
  visit_day: string;
  visitor_hash: string;
  session_id: string;
  path: string;
  page_title: string | null;
  source: string;
  city: string | null;
  region: string | null;
  device: string;
  is_entry: boolean;
};

export type Tally = { key: string; label: string; count: number };

export type DayPoint = { day: string; views: number; visitors: number };

export type VisitSummary = {
  today: { views: number; visitors: number };
  week: { views: number; visitors: number };
  month: { views: number; visitors: number };
  /** Distinct visitors seen in the last half hour. */
  now: number;
  days: DayPoint[];
  pages: Tally[];
  entryPages: Tally[];
  sources: Tally[];
  cities: Tally[];
  devices: Tally[];
  /** Pages per visit, over the month. One means people leave from where they land. */
  pagesPerVisit: number;
};

/** Distinct visitors in a set of rows. */
function visitorsIn(rows: VisitRow[]): number {
  return new Set(rows.map((row) => row.visitor_hash)).size;
}

function tally(
  rows: VisitRow[],
  pick: (row: VisitRow) => string | null | undefined,
  label: (key: string) => string,
  limit: number,
): Tally[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = String(pick(row) ?? "").trim();
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([key, count]) => ({ key, label: label(key), count }));
}

/**
 * The whole dashboard, from one list of rows.
 *
 * `now` is passed in rather than read, so a test can ask what the panel showed
 * at a particular minute and get the same answer twice.
 */
export function summariseVisits(rows: VisitRow[], now: Date = new Date()): VisitSummary {
  const nowMs = now.getTime();
  const dayOf = (row: VisitRow) => row.visit_day;
  const since = (ms: number) => rows.filter((row) => nowMs - Date.parse(row.occurred_at) <= ms);

  const today = rows.filter((row) => dayOf(row) === now.toISOString().slice(0, 10));
  const week = since(7 * 24 * 60 * 60 * 1000);
  const month = since(30 * 24 * 60 * 60 * 1000);
  const halfHour = since(30 * 60 * 1000);

  return {
    today: { views: today.length, visitors: visitorsIn(today) },
    week: { views: week.length, visitors: visitorsIn(week) },
    month: { views: month.length, visitors: visitorsIn(month) },
    now: visitorsIn(halfHour),
    days: dailySeries(rows, now, 14),
    pages: tally(month, (row) => row.path, (key) => key, 8),
    // Where people arrive is a different question from where they spend time,
    // and it is the one that says which link or poster is working.
    entryPages: tally(month.filter((row) => row.is_entry), (row) => row.path, (key) => key, 6),
    sources: tally(
      month.filter((row) => row.is_entry),
      (row) => row.source,
      (key) => SOURCE_LABELS[key as VisitSource] ?? key,
      8,
    ),
    cities: tally(
      month,
      (row) => (row.city ? (row.region ? `${row.city}, ${row.region}` : row.city) : null),
      (key) => key,
      8,
    ),
    devices: tally(month, (row) => row.device, (key) => DEVICE_LABELS[key as VisitDevice] ?? key, 3),
    pagesPerVisit: pagesPerVisit(month),
  };
}

/** One point per day, oldest first, including the days nobody came. */
export function dailySeries(rows: VisitRow[], now: Date, days: number): DayPoint[] {
  const byDay = new Map<string, VisitRow[]>();
  for (const row of rows) {
    const list = byDay.get(row.visit_day);
    if (list) list.push(row);
    else byDay.set(row.visit_day, [row]);
  }

  const points: DayPoint[] = [];
  for (let back = days - 1; back >= 0; back -= 1) {
    const date = new Date(now);
    date.setUTCDate(date.getUTCDate() - back);
    const key = date.toISOString().slice(0, 10);
    const dayRows = byDay.get(key) ?? [];
    // A day with nobody on it is data. Dropping empty days would draw a busy
    // fortnight out of three good afternoons.
    points.push({ day: key, views: dayRows.length, visitors: visitorsIn(dayRows) });
  }
  return points;
}

/** Average pages looked at per visit, to one decimal. */
export function pagesPerVisit(rows: VisitRow[]): number {
  const sessions = new Set(rows.map((row) => row.session_id));
  if (!sessions.size) return 0;
  return Math.round((rows.length / sessions.size) * 10) / 10;
}
