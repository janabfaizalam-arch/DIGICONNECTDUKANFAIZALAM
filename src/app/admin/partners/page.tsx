import { redirect } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/admin-shell";
import { AdminWorkspaceDirectory } from "@/components/admin/admin-workspace-directory";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * The front door to the partner workspace.
 *
 * A directory and nothing else, deliberately. The partner side is a move
 * rather than a build: every screen it lists already existed and already
 * worked — it was sitting in the customer sidebar making that list longer.
 * When the partner side is designed on its own terms this page becomes its
 * dashboard; until then it is the one thing the workspace was missing, which
 * is a place that says what is in it.
 */
export default async function AdminPartnersHomePage() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) redirect("/admin/login");
  if (!isAdminRole(role)) redirect("/admin/login");

  return (
    <div>
      <AdminPageHeader
        eyebrow="Partners & Staff"
        title="Partner workspace"
        description="Digi Partners, what they earn, and where your branches are. The customer business lives in the other workspace — switch with the toggle at the top of the sidebar."
      />
      <AdminWorkspaceDirectory workspace="partner" />
    </div>
  );
}
