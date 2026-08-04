import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { CrmSyncLogsClient } from "@/components/admin/crm-sync-logs-client";
import { AdminPageHeader } from "@/components/admin/admin-shell";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { isGoogleSheetsConfigured } from "@/lib/google";
import { getCrmSyncSummary, listCrmSyncJobs } from "@/lib/syncQueue";

export const dynamic = "force-dynamic";

export default async function AdminCrmSyncPage() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  const [jobs, summary] = await Promise.all([listCrmSyncJobs(150), getCrmSyncSummary()]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="CRM / Content"
        title="CRM Sync Logs"
        description="Google Sheets office CRM mirror. Website remains the source of truth. Failed jobs retry automatically and can be retried manually."
        action={
          <Link
            href="/admin"
            className="inline-flex h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>
        }
      />

      <CrmSyncLogsClient jobs={jobs} summary={summary} configured={isGoogleSheetsConfigured()} />
    </div>
  );
}
