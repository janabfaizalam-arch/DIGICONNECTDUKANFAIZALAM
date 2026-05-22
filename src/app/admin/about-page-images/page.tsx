import { redirect } from "next/navigation";

import { AdminAboutPageImagesManager } from "@/components/admin-about-page-images-manager";
import { AdminPageHeader } from "@/components/admin/admin-shell";
import { getAllAboutPageImages } from "@/lib/about-page-images";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminAboutPageImagesPage() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  const images = await getAllAboutPageImages();

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="About Page"
        title="About Page Images"
        description="Upload, sort, activate, replace, and delete the images shown on the public About page."
      />
      <AdminAboutPageImagesManager initialImages={images} />
    </div>
  );
}
