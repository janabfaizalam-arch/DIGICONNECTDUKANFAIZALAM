import { redirect } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/admin-shell";
import { AdminGalleryManager } from "@/components/admin-gallery-manager";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { getAllGalleryImages } from "@/lib/gallery";

export const dynamic = "force-dynamic";

export default async function AdminGalleryPage() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) {
    redirect("/login");
  }

  if (!isAdminRole(role)) {
    redirect("/dashboard");
  }

  const images = await getAllGalleryImages();

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="Gallery"
        title="Gallery Management"
        description="Upload, review, and delete homepage gallery photos. Published images automatically appear on the public homepage."
      />
      <AdminGalleryManager initialImages={images} />
    </div>
  );
}
