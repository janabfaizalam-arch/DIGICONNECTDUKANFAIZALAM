import { redirect } from "next/navigation";

import { AdminApplications } from "@/components/portal/admin-applications";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { getAdminApplicationRows } from "@/lib/admin-applications";

export const dynamic = "force-dynamic";

export default async function AdminApplicationsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) {
    redirect("/login");
  }

  if (!isAdminRole(role)) {
    redirect("/dashboard");
  }

  const { rows, staff } = await getAdminApplicationRows();
  const { q } = await searchParams;

  return <AdminApplications rows={rows} staff={staff} initialSearch={q ?? ""} />;
}
