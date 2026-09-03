import { redirect } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/admin-shell";
import { SiteAnalytics } from "@/components/admin/site-analytics";
import { summariseVisits, type VisitRow } from "@/lib/analytics/summarise";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * The site's own visitor numbers, read from our own table.
 *
 * Thirty days of rows come back in one query and are counted here rather than
 * in SQL: at this shop's traffic that is one round trip and a few milliseconds,
 * and it keeps the counting in plain functions that are tested. The cap below
 * is the line where that stops being true — past it, this wants a daily
 * rollup table rather than a bigger fetch.
 */
const ROW_CAP = 50_000;

export default async function AdminAnalyticsPage() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) redirect("/admin/login");
  if (!isAdminRole(role)) redirect("/unauthorized");

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return (
      <div className="space-y-5">
        <AdminPageHeader
          title="Website visitors"
          description="Who opened the site, where they came from, and what they looked at."
        />
        <p className="rounded-2xl bg-red-50 p-5 text-sm font-semibold text-red-600">
          Database configuration is missing, so nothing can be read.
        </p>
      </div>
    );
  }

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("site_visits")
    .select("occurred_at, visit_day, visitor_hash, session_id, path, page_title, source, city, region, device, is_entry")
    .gte("occurred_at", since)
    .order("occurred_at", { ascending: false })
    .limit(ROW_CAP);

  if (error) {
    const missingTable = /relation .*site_visits.* does not exist|schema cache/i.test(error.message);
    return (
      <div className="space-y-5">
        <AdminPageHeader
          title="Website visitors"
          description="Who opened the site, where they came from, and what they looked at."
        />
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm font-bold text-amber-900">
            {missingTable ? "The visits table is not there yet." : "Visits could not be read."}
          </p>
          <p className="mt-1 text-[13px] font-medium text-amber-800">
            {missingTable
              ? "Run supabase/migrations/20260903140000_site_visits.sql, then reload this page."
              : error.message}
          </p>
        </div>
      </div>
    );
  }

  const summary = summariseVisits((data ?? []) as VisitRow[]);

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Website visitors"
        description="Who opened the site, where they came from, and what they looked at. Counted by us, on our own database — no Google, no third party, no cookies, and no IP address stored."
      />
      <SiteAnalytics summary={summary} />
    </div>
  );
}
