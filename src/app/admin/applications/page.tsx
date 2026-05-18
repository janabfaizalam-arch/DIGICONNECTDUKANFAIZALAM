import { redirect } from "next/navigation";

import { AdminApplications } from "@/components/portal/admin-applications";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { getAdminApplicationRows } from "@/lib/admin-applications";

export const dynamic = "force-dynamic";

export default async function AdminApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    payment?: string;
    staff?: string;
    range?: string;
    page?: string;
  }>;
}) {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) {
    redirect("/login");
  }

  if (!isAdminRole(role)) {
    redirect("/dashboard");
  }

  const { q, status, payment, staff: staffId, range, page } = await searchParams;
  const {
    rows,
    agents,
    staff,
    stats,
    alerts,
    filterOptions,
    total,
    page: currentPage,
    pageSize,
  } = await getAdminApplicationRows({
    query: q,
    status,
    paymentStatus: payment,
    staffId,
    dateRange: range,
    page: Number(page ?? 1),
    pageSize: 25,
  });

  return (
    <AdminApplications
      rows={rows}
      agents={agents}
      staff={staff}
      stats={stats}
      alerts={alerts}
      filterOptions={filterOptions}
      total={total}
      page={currentPage}
      pageSize={pageSize}
      initialSearch={q ?? ""}
      initialStatus={status ?? "all"}
      initialPaymentStatus={payment ?? "all"}
      initialStaffId={staffId ?? "all"}
      initialDateRange={range ?? "all"}
    />
  );
}
