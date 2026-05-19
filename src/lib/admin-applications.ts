import { getAdminApplications, type AdminApplicationFilters } from "@/lib/admin-crm";

export async function getAdminApplicationRows(filters: AdminApplicationFilters = {}) {
  const result = await getAdminApplications(filters);

  return {
    rows: result.rows,
    agents: result.agents,
    stats: result.stats,
    alerts: result.alerts,
    filterOptions: result.filterOptions,
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
  };
}
