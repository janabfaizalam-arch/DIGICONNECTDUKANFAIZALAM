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

  return (
    <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl bg-slate-100" />}>
      <AdminDashboardView payload={payload} />
    </Suspense>
  );
}
