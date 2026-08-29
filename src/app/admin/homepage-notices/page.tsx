import { redirect } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/admin-shell";
import { AdminHomepageNoticesManager } from "@/components/admin-homepage-notices-manager";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { getAllHomepageNotices } from "@/lib/homepage-notices";

export const dynamic = "force-dynamic";

export default async function AdminHomepageNoticesPage() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) {
    redirect("/login");
  }

  if (!isAdminRole(role)) {
    redirect("/dashboard");
  }

  const notices = await getAllHomepageNotices();

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="Homepage"
        title="Homepage Notices"
        description="Manage the offer announcement bar. Note: the bar is not currently displayed on the site — it was removed from the header to keep the top of a phone screen clear. Notices saved here are kept and will appear again if the bar is re-enabled."
      />
      <AdminHomepageNoticesManager initialNotices={notices} />
    </div>
  );
}
