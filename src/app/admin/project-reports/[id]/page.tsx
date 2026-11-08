import { notFound, redirect } from "next/navigation";
import { FileDown } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/admin-shell";
import { PageContainer } from "@/components/admin/primitives/layout";
import { ProjectReportDelete } from "@/components/admin/project-report-delete";
import { ProjectReportForm } from "@/components/admin/project-report-form";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { STATUS_TONE_CLASS } from "@/lib/admin/status-tone";
import { getProjectReport } from "@/lib/project-reports/store";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ProjectReportPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  const report = await getProjectReport((await params).id);
  if (!report) notFound();

  return (
    <PageContainer className="space-y-6">
      <AdminPageHeader
        eyebrow={report.reference}
        title={report.input.businessName}
        description={[report.input.activity, report.input.district].filter(Boolean).join(" · ") || undefined}
        backHref="/admin/project-reports"
        backLabel="Project Reports"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-bold", STATUS_TONE_CLASS[report.status === "final" ? "success" : "warning"])}>
              {report.status === "final" ? "Final" : "Draft"}
            </span>
            <a
              href={`/api/admin/project-reports/${report.id}/pdf`}
              target="_blank"
              rel="noopener"
              className="inline-flex h-11 items-center gap-2 rounded-full bg-blue-600 px-4 text-sm font-bold text-white"
            >
              <FileDown className="h-4 w-4" aria-hidden="true" />
              DPR PDF download
            </a>
            <ProjectReportDelete id={report.id} name={report.input.businessName} />
          </div>
        }
      />
      <ProjectReportForm id={report.id} initial={report.input} initialStatus={report.status} />
    </PageContainer>
  );
}
