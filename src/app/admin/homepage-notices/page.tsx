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
        description="Manage the compact offer announcement bar shown below the navbar and above the homepage slider."
      />
      <AdminHomepageNoticesManager initialNotices={notices} />
    </div>
  );
}
