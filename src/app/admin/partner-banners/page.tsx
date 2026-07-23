import { redirect } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/admin-shell";
import { AdminPartnerBannersManager } from "@/components/admin/admin-partner-banners-manager";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { getAllPartnerDashboardBanners } from "@/lib/ap/partner-banners";

export const dynamic = "force-dynamic";

export default async function AdminPartnerBannersPage() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  const banners = await getAllPartnerDashboardBanners();

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Digi Partners"
        title="Partner Home Banners"
        description="Edge-to-edge announcement slider banners for the Digi Partner home page. Audience is locked to partner_dashboard."
      />
      <AdminPartnerBannersManager initialBanners={banners} />
    </div>
  );
}
