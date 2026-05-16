import { getAdminApplications, type AdminApplicationFilters } from "@/lib/admin-crm";

export async function getAdminApplicationRows(filters: AdminApplicationFilters = {}) {
  const result = await getAdminApplications(filters);

  return {
    rows: result.rows,
    agents: [],
    staff: result.staff,
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
  };
}
