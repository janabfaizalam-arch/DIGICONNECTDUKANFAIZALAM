import { redirect } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/admin-shell";
import { AdminServiceWizard } from "@/components/admin/admin-service-wizard";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { getAdminServiceCategories } from "@/lib/services";

export const dynamic = "force-dynamic";

export default async function NewServicePage() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  let categories: Awaited<ReturnType<typeof getAdminServiceCategories>> = [];

  try {
    categories = await getAdminServiceCategories();
  } catch (error) {
    console.error("[admin-service-new] Failed to load categories", error);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <AdminPageHeader eyebrow="Services CMS" title="Create New Service" description="Follow the steps to configure and publish a premium service page." />
      <AdminServiceWizard categories={categories} />
    </div>
  );
}

