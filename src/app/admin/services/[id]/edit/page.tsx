import { notFound, redirect } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/admin-shell";
import { AdminEngineConfigTabs } from "@/components/admin/admin-engine-config-tabs";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { getAdminServiceById, getAdminServiceCategories } from "@/lib/services";
import { getServiceConfig } from "@/lib/services-engine";

export const dynamic = "force-dynamic";

export default async function EditServicePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  const { id } = await params;
  let service: Awaited<ReturnType<typeof getAdminServiceById>> = null;
  let categories: Awaited<ReturnType<typeof getAdminServiceCategories>> = [];
  let serviceConfig: Awaited<ReturnType<typeof getServiceConfig>> = null;

  try {
    [service, categories, serviceConfig] = await Promise.all([
      getAdminServiceById(id),
      getAdminServiceCategories(),
      getServiceConfig(id)
    ]);
  } catch (error) {
    console.error("[admin-service-edit] Failed to load service", error);
  }
  if (!service) notFound();

  if (service.slug === "csc-olympiad") {
    redirect("/admin/services/csc-olympiad");
  }

  const initialFields = serviceConfig?.fields || [];
  const initialWorkflows = serviceConfig?.workflows || [];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <AdminPageHeader eyebrow="Services CMS" title="Edit Service" description="Configure page content, form fields, transitions and SLAs." />
      <AdminEngineConfigTabs
        service={service}
        categories={categories}
        initialFields={initialFields}
        initialWorkflows={initialWorkflows}
      />
    </div>
  );
}
