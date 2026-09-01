import { redirect } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/admin-shell";
import { HomepageStudio } from "@/components/admin/homepage-studio";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { getHomepageLayout } from "@/lib/homepage/layout-data";

export const dynamic = "force-dynamic";

/**
 * Homepage Studio.
 *
 * This screen used to be a menu of four links to four other screens, which is
 * how "change the homepage" became a job of guessing which of them held the
 * thing you wanted and whether the result looked right. The page itself is
 * here now, live, beside the list of its bands.
 */
export default async function AdminHomepagePage() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) redirect("/admin/login");
  if (!isAdminRole(role)) redirect("/admin/login");

  const layout = await getHomepageLayout();

  return (
    <div>
      <AdminPageHeader
        eyebrow="Website"
        title="Homepage"
        description="The front page as a visitor sees it. Drag a band to move it, switch one off with the eye, and open its own screen to change the words and pictures inside it."
      />
      <HomepageStudio initialLayout={layout} />
    </div>
  );
}
