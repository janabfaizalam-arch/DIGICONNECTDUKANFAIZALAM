import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/admin-shell";
import { ItrReportsClient } from "@/components/admin/itr-reports-client";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { getItrAnalytics } from "@/lib/itr/analytics";

export const dynamic = "force-dynamic";

export default async function AdminItrReportsPage() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  const analytics = await getItrAnalytics();

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Insights"
        title="ITR Analytics"
        description="Today’s ITR applications, revenue, conversion, and package / filing type / partner breakdowns."
      />
      <div className="flex flex-wrap gap-3 text-sm">
        <Link href="/admin/reports" className="font-bold text-blue-700 hover:text-blue-900">
          ← All reports
        </Link>
        <Link href="/admin/applications" className="font-bold text-slate-600 hover:text-slate-900">
          All applications
        </Link>
        <Link href="/admin/services/itr" className="font-bold text-slate-600 hover:text-slate-900">
          ITR CMS
        </Link>
      </div>
      <ItrReportsClient analytics={analytics} />
    </div>
  );
}
