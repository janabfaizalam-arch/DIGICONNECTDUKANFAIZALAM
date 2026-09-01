import { Suspense } from "react";
import { redirect } from "next/navigation";

import { AdminDashboardView } from "@/components/admin/admin-dashboard-view";
import { AdminWorkspaceDirectory } from "@/components/admin/admin-workspace-directory";
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
    <div className="space-y-8">
      <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl bg-white/60" />}>
        <AdminDashboardView payload={payload} />
      </Suspense>

      {/*
        Everything in this workspace, listed.

        The numbers above answer "how is the business doing". This answers the
        question that was actually costing time — "where is the screen for
        this" — for all of it at once, including the twenty-five screens that
        had no link anywhere in the panel.
      */}
      <section>
        <div className="mb-3.5 border-t border-[var(--dc-ink)]/8 pt-6">
          <h2 className="text-[1.15rem] font-extrabold tracking-[-0.02em] text-[var(--dc-ink)] sm:text-[1.35rem]">
            Everything you can do here
          </h2>
          <p className="mt-1 text-[13px] font-medium leading-snug text-[var(--dc-body)]">
            Every screen in the customer workspace. Search it rather than hunting the sidebar.
          </p>
        </div>
        <AdminWorkspaceDirectory workspace="customer" />
      </section>
    </div>
  );
}
