import { redirect } from "next/navigation";

import { LogoutButton } from "@/components/auth/logout-button";
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
    <main className="min-h-screen px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--secondary)]">Admin Gallery</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-950 md:text-5xl">Gallery Management</h1>
            <p className="mt-3 max-w-2xl text-slate-600">
              Upload, review, and delete homepage gallery photos. Published images automatically appear on the public homepage.
            </p>
          </div>
          <LogoutButton className="h-11 w-full md:w-auto" />
        </div>

        <AdminGalleryManager initialImages={images} />
      </div>
    </main>
  );
}
