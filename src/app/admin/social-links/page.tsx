import { redirect } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/admin-shell";
import { SocialLinksManager } from "@/components/admin/social-links-manager";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { listSocialLinksForAdmin } from "@/lib/homepage/social";

export const dynamic = "force-dynamic";

const MISSING_TABLE =
  "The site_social_links table does not exist yet. Run migration 20260812170000_site_social_links.sql in Supabase.";

export default async function AdminSocialLinksPage() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  const { rows, tableMissing } = await listSocialLinksForAdmin();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <AdminPageHeader
        eyebrow="Homepage"
        title="Social Links"
        description="Profile links shown in the site footer. A platform appears only once it has an https link and is switched on — nothing is filled in by guesswork, because a wrong link sends customers to someone else's account."
      />
      <SocialLinksManager
        initialRows={rows}
        tableMissing={tableMissing}
        setupHint={tableMissing ? MISSING_TABLE : null}
      />
    </div>
  );
}
