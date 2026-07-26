import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/admin-shell";
import { DprReportsClient } from "@/components/admin/dpr-reports-client";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { getDprAnalytics } from "@/lib/dpr/analytics";

export const dynamic = "force-dynamic";

export default async function AdminDprReportsPage() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  const analytics = await getDprAnalytics();

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Insights"
        title="DPR Analytics"
        description="Today’s DPR applications, revenue, conversion, and scheme / state / partner breakdowns."
      />
      <div className="flex flex-wrap gap-3 text-sm">
        <Link href="/admin/reports" className="font-bold text-blue-700 hover:text-blue-900">
          ← All reports
        </Link>
        <Link href="/admin/applications" className="font-bold text-slate-600 hover:text-slate-900">
          All applications
        </Link>
        <Link href="/admin/services/dpr" className="font-bold text-slate-600 hover:text-slate-900">
          DPR CMS
        </Link>
      </div>
      <DprReportsClient analytics={analytics} />
    </div>
  );
}
