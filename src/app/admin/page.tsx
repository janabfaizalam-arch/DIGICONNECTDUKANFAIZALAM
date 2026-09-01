import { Suspense } from "react";
import { redirect } from "next/navigation";

import { AdminDashboardView } from "@/components/admin/admin-dashboard-view";
import { getAdminDashboardPayload } from "@/lib/admin/dashboard-data";
import { resolveAdminDateRange } from "@/lib/admin/date-range";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ range?: string; from?: string; to?: string }>;
};

export default async function AdminPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) redirect("/admin/login");
  if (!isAdminRole(role)) redirect("/admin/login");

  const params = (await searchParams) ?? {};
  const range = resolveAdminDateRange({
    preset: params.range,
    from: params.from,
    to: params.to,
  });

  const payload = await getAdminDashboardPayload(range);

  /*
    The directory that used to sit under this dashboard is gone.

    It listed every screen in the workspace — which is exactly what the sidebar
    beside it already does, so the page read as the same menu printed twice.
    The sidebar is the map; the dashboard is the day's work.
  */
  return (
    <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl bg-white/60" />}>
      <AdminDashboardView payload={payload} />
    </Suspense>
  );
}
