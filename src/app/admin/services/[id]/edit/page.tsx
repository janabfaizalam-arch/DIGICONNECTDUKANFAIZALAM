import { notFound, redirect } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/admin-shell";
import { AdminServiceForm } from "@/components/admin/admin-service-form";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { getAdminServiceById, getAdminServiceCategories } from "@/lib/services";

export const dynamic = "force-dynamic";

export default async function EditServicePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  const { id } = await params;
  let service: Awaited<ReturnType<typeof getAdminServiceById>> = null;
  let categories: Awaited<ReturnType<typeof getAdminServiceCategories>> = [];

  try {
    [service, categories] = await Promise.all([getAdminServiceById(id), getAdminServiceCategories()]);
  } catch (error) {
    console.error("[admin-service-edit] Failed to load service", error);
  }
  if (!service) notFound();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <AdminPageHeader eyebrow="Services CMS" title="Edit Service" description="Update service content, pricing, SEO, CTA, reviews, and publish status." />
      <AdminServiceForm service={service} categories={categories} />
    </div>
  );
}
