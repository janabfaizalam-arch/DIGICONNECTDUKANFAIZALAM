import { redirect } from "next/navigation";

import { AdminHomepageOfferStripManager } from "@/components/admin-homepage-offer-strip-manager";
import { AdminPageHeader } from "@/components/admin/admin-shell";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { getAllHomepageOfferBanners, getHomepageOfferStripSetting } from "@/lib/homepage-offer-banners";

export const dynamic = "force-dynamic";

export default async function AdminHomepageOfferStripPage() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  const [banners, setting] = await Promise.all([getAllHomepageOfferBanners(), getHomepageOfferStripSetting()]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="Homepage"
        title="Homepage Offer Strip"
        description="Manage the slim banner slider below the homepage service icons and edit its public title."
      />
      <AdminHomepageOfferStripManager initialBanners={banners} initialSetting={setting} />
    </div>
  );
}
