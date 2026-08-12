import { redirect } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/admin-shell";
import { HomepageContentManager } from "@/components/admin/homepage-content-manager";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminHomepageContentPage() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <AdminPageHeader
        eyebrow="Homepage CMS"
        title="FAQ & Testimonials"
        description="Questions here replace the built-in homepage FAQ and feed Google's FAQ rich result. Testimonials appear in the reviews section — video links render as a playable card."
      />
      <HomepageContentManager />
    </div>
  );
}
