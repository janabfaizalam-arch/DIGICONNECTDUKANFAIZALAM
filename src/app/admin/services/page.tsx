import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/admin-shell";
import { AdminServiceCategoriesManager } from "@/components/admin/admin-service-categories-manager";
import { AdminServicesList } from "@/components/admin/admin-services-list";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { getAdminServiceCategories, getAdminServices } from "@/lib/services";

export const dynamic = "force-dynamic";

export default async function AdminServicesPage() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  const [services, categories] = await Promise.all([getAdminServices(), getAdminServiceCategories()]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="Services CMS"
        title="Services"
        description="Create, publish, archive, and optimize DigiConnect Dukan service pages from the admin panel."
        action={<Link href="/admin/services/new" className="inline-flex h-11 items-center gap-2 rounded-full bg-blue-600 px-4 text-sm font-bold text-white"><Plus className="h-4 w-4" />New Service</Link>}
      />
      <AdminServicesList services={services} categories={categories} />
      <AdminServiceCategoriesManager categories={categories} />
    </div>
  );
}
