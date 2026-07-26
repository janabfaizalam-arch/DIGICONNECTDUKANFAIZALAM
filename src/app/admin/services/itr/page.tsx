import Link from "next/link";
import { redirect } from "next/navigation";
import { ExternalLink } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/admin-shell";
import { AdminItrCmsManager } from "@/components/admin/admin-itr-cms-manager";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { getAllItrCmsForAdmin } from "@/lib/itr/cms";
import { ITR_LANDING_PATH } from "@/lib/itr/constants";

export const dynamic = "force-dynamic";

export default async function AdminItrCmsPage() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  const cms = await getAllItrCmsForAdmin();

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Services"
        title="ITR Landing CMS"
        description="Manage sections, banners, pricing, FAQs, reviews, document checklist, and page settings for the Income Tax Return filing landing page."
        action={
          <Link
            href={ITR_LANDING_PATH}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <ExternalLink className="h-4 w-4" />
            Preview landing page
          </Link>
        }
      />
      <AdminItrCmsManager initialCms={cms} />
    </div>
  );
}
