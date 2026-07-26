import Link from "next/link";
import { redirect } from "next/navigation";
import { ExternalLink } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/admin-shell";
import { AdminDprCmsManager } from "@/components/admin/admin-dpr-cms-manager";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { getAllDprCmsForAdmin } from "@/lib/dpr/cms";
import { DPR_LANDING_PATH } from "@/lib/dpr/constants";

export const dynamic = "force-dynamic";

export default async function AdminDprCmsPage() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  const cms = await getAllDprCmsForAdmin();

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Services"
        title="DPR Landing CMS"
        description="Manage sections, banners, pricing, FAQs, reviews, and page settings for the Detailed Project Report service landing page."
        action={
          <Link
            href={DPR_LANDING_PATH}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <ExternalLink className="h-4 w-4" />
            Preview landing page
          </Link>
        }
      />
      <AdminDprCmsManager initialCms={cms} />
    </div>
  );
}
