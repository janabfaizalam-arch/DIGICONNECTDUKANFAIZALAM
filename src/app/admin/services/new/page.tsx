import { redirect } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/admin-shell";
import { AdminServiceForm } from "@/components/admin/admin-service-form";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { getAdminServiceCategories } from "@/lib/services";

export const dynamic = "force-dynamic";

export default async function NewServicePage() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  const categories = await getAdminServiceCategories();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <AdminPageHeader eyebrow="Services CMS" title="New Service" description="Add pricing, documents, SEO content, FAQs, reviews, and publishing settings." />
      <AdminServiceForm categories={categories} />
    </div>
  );
}
