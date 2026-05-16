import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type AdminDashboardStats = {
  totalUsers: number;
  totalApplications: number;
  todayApplications: number;
};

const ADMIN_DASHBOARD_TIME_ZONE = "Asia/Kolkata";

function getTimeZoneParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

function getTimeZoneOffsetMs(date: Date, timeZone: string) {
  const parts = getTimeZoneParts(date, timeZone);
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );

  return asUtc - date.getTime();
}

function zonedDateTimeToUtc(parts: { year: number; month: number; day: number; hour?: number }, timeZone: string) {
  const utcGuess = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour ?? 0, 0, 0, 0));
  const firstPass = new Date(utcGuess.getTime() - getTimeZoneOffsetMs(utcGuess, timeZone));

  return new Date(utcGuess.getTime() - getTimeZoneOffsetMs(firstPass, timeZone));
}

function getTodayRange(timeZone = ADMIN_DASHBOARD_TIME_ZONE) {
  const now = new Date();
  const parts = getTimeZoneParts(now, timeZone);
  const year = Number(parts.year);
  const month = Number(parts.month);
  const day = Number(parts.day);
  const start = zonedDateTimeToUtc({ year, month, day }, timeZone);
  const endLocalNoon = new Date(Date.UTC(year, month - 1, day + 1, 12, 0, 0, 0));
  const endParts = getTimeZoneParts(endLocalNoon, timeZone);
  const end = zonedDateTimeToUtc(
    {
      year: Number(endParts.year),
      month: Number(endParts.month),
      day: Number(endParts.day),
    },
    timeZone,
  );

  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return {
      totalUsers: 0,
      totalApplications: 0,
      todayApplications: 0,
    };
  }

  const today = getTodayRange();
  const [usersResult, applicationsResult, todayApplicationsResult] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "customer"),
    supabase.from("applications").select("id", { count: "exact", head: true }),
    supabase
      .from("applications")
      .select("id", { count: "exact", head: true })
      .gte("created_at", today.startIso)
      .lt("created_at", today.endIso),
  ]);

  if (usersResult.error) {
    console.error("[admin-dashboard] Total users count failed", usersResult.error);
  }

  if (applicationsResult.error) {
    console.error("[admin-dashboard] Total applications count failed", applicationsResult.error);
  }

  if (todayApplicationsResult.error) {
    console.error("[admin-dashboard] Today applications count failed", todayApplicationsResult.error);
  }

  return {
    totalUsers: usersResult.count ?? 0,
    totalApplications: applicationsResult.count ?? 0,
    todayApplications: todayApplicationsResult.count ?? 0,
  };
}
