import { redirect } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/admin-shell";
import { AdminHomepageSlidesManager } from "@/components/admin-homepage-slides-manager";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { getAllHomepageSlides } from "@/lib/homepage-slides";

export const dynamic = "force-dynamic";

export default async function AdminHomepageSlidesPage() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) {
    redirect("/login");
  }

  if (!isAdminRole(role)) {
    redirect("/dashboard");
  }

  const slides = await getAllHomepageSlides();

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="Homepage"
        title="Homepage Slides"
        description="Upload promotional posters, manage CTA buttons, control display dates, and order the slider shown at the top of the homepage."
      />
      <AdminHomepageSlidesManager initialSlides={slides} />
    </div>
  );
}
